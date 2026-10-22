import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { addHours } from 'date-fns';
import { clinicNow } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  // Validate authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const utcNow = new Date();

  // Os horários são gravados no relógio de cada clínica. A busca usa uma janela larga
  // (fusos de UTC−6 a UTC+2) e cada agendamento é conferido no relógio da própria clínica.
  const fetchCandidates = (flag: string, hours: number) =>
    supabase
      .from('agend_agendamentos')
      .select('*, agend_empresas!inner(webhook_url, fuso_horario)')
      .in('status', ['confirmado', 'remarcado'])
      .eq(flag, false)
      .lte('inicio', addHours(utcNow, hours + 2).toISOString())
      .gt('inicio', addHours(utcNow, -6).toISOString());

  const dueWithin = (rows: any[] | null, hours: number) =>
    (rows || []).filter((b) => {
      const now = clinicNow(b.agend_empresas?.fuso_horario, utcNow);
      const inicio = new Date(b.inicio);
      return inicio > now && inicio <= addHours(now, hours);
    });

  const [{ data: c24h }, { data: c2h }] = await Promise.all([
    fetchCandidates('lembrete_24h_enviado', 24),
    fetchCandidates('lembrete_2h_enviado', 2),
  ]);
  const b24h = dueWithin(c24h, 24);
  const b2h = dueWithin(c2h, 2);

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
