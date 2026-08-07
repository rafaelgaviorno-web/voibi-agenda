import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { addHours } from 'date-fns';

export async function GET(request: NextRequest) {
  // Validate authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const now = new Date();
  const next24h = addHours(now, 24);
  const next2h = addHours(now, 2);

  // Lembretes de 24h
  const { data: b24h } = await supabase
    .from('agend_agendamentos')
    .select('*, agend_empresas!inner(webhook_url)')
    .in('status', ['confirmado', 'remarcado'])
    .eq('lembrete_24h_enviado', false)
    .lte('inicio', next24h.toISOString())
    .gt('inicio', now.toISOString()); // Garante que não é no passado

  // Lembretes de 2h
  const { data: b2h } = await supabase
    .from('agend_agendamentos')
    .select('*, agend_empresas!inner(webhook_url)')
    .in('status', ['confirmado', 'remarcado'])
    .eq('lembrete_2h_enviado', false)
    .lte('inicio', next2h.toISOString())
    .gt('inicio', now.toISOString());

  const processed = { sent24h: 0, sent2h: 0 };

  // Disparar 24h
  for (const b of (b24h || [])) {
    if (b.agend_empresas.webhook_url) {
      await fetch(b.agend_empresas.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'booking.reminder', type: '24h', data: b })
      }).catch(console.error);
    }
    await supabase.from('agend_agendamentos').update({ lembrete_24h_enviado: true }).eq('id', b.id);
    processed.sent24h++;
  }

  // Disparar 2h
  for (const b of (b2h || [])) {
    if (b.agend_empresas.webhook_url) {
      await fetch(b.agend_empresas.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'booking.reminder', type: '2h', data: b })
      }).catch(console.error);
    }
    await supabase.from('agend_agendamentos').update({ lembrete_2h_enviado: true }).eq('id', b.id);
    processed.sent2h++;
  }

  return NextResponse.json({ success: true, processed });
}
