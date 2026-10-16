import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { withApiLogger } from '@/lib/api-logger';

export const POST = withApiLogger(async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const { booking_id, booking_ids, regra_id, regra_nome, minutos_antes } = body;

  const targetIds: string[] = [];
  if (booking_id && typeof booking_id === 'string') {
    targetIds.push(booking_id);
  }
  if (Array.isArray(booking_ids)) {
    targetIds.push(...booking_ids.filter((id: any) => typeof id === 'string'));
  }

  if (targetIds.length === 0) {
    return NextResponse.json({ 
      error: 'Parâmetro booking_id ou booking_ids é obrigatório para confirmar o lembrete' 
    }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const now = new Date();

  // Buscar os agendamentos pertencentes à empresa
  const { data: bookings, error: bookingsError } = await supabase
    .from('agend_agendamentos')
    .select('id, lembretes_enviados, agend_profissionais!inner(empresa_id)')
    .eq('agend_profissionais.empresa_id', auth.empresa.id)
    .in('id', targetIds);

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 });
  }

  let confirmados = 0;

  for (const b of (bookings || [])) {
    const enviados: any[] = Array.isArray(b.lembretes_enviados) ? [...b.lembretes_enviados] : [];
    
    // Evita duplicidade
    const jaTem = enviados.some(e => 
      (regra_id && e.regra_id === regra_id) || 
      (minutos_antes && Math.abs(e.minutos_antes - minutos_antes) < 5)
    );

    if (!jaTem) {
      enviados.push({
        regra_id: regra_id || 'manual',
        regra_nome: regra_nome || 'Lembrete confirmado via N8N',
        minutos_antes: minutos_antes || null,
        enviado_em: now.toISOString()
      });

      await supabase
        .from('agend_agendamentos')
        .update({ lembretes_enviados: enviados })
        .eq('id', b.id);

      confirmados++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `${confirmados} agendamento(s) marcado(s) como lembrete enviado`,
    confirmados
  });
});
