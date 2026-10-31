import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { withApiLogger } from '@/lib/api-logger';

export const POST = withApiLogger(async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = getServiceSupabase();
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { searchParams } = new URL(request.url);
  const rawId = body.id || body.booking_id || body.agendamento_id || body.bookingId || searchParams.get('id') || searchParams.get('booking_id');
  const rawPhone = body.telefone || body.phone || body.whatsapp || searchParams.get('telefone') || searchParams.get('phone');
  const motivo = body.motivo || body.reason || searchParams.get('motivo') || 'Cancelado pelo paciente via IA';

  let targetBookingId: string | null = null;

  if (rawId) {
    targetBookingId = String(rawId).trim();
  } else if (rawPhone) {
    // Busca agendamento ativo mais recente por telefone
    const cleanPhone = String(rawPhone).trim();
    const phoneNoDDI = cleanPhone.startsWith('55') && cleanPhone.length > 11 ? cleanPhone.slice(2) : cleanPhone;

    // Busca o cliente
    const { data: clients } = await supabase
      .from('agend_clientes_finais')
      .select('id')
      .eq('empresa_id', auth.empresa.id)
      .or(`telefone.eq.${cleanPhone},telefone.eq.${phoneNoDDI}`);

    if (clients && clients.length > 0) {
      const clientIds = clients.map(c => c.id);
      const { data: activeBooking } = await supabase
        .from('agend_agendamentos')
        .select('id, inicio, status')
        .in('cliente_id', clientIds)
        .in('status', ['pendente', 'confirmado', 'remarcado'])
        .order('inicio', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (activeBooking) {
        targetBookingId = activeBooking.id;
      }
    }
  }

  if (!targetBookingId) {
    return NextResponse.json({ 
      error: 'Agendamento não encontrado para cancelamento. Informe o ID da consulta ou o telefone do paciente.' 
    }, { status: 404 });
  }

  // Valida e atualiza
  const { data: existing } = await supabase
    .from('agend_agendamentos')
    .select('id, profissional_id, agend_profissionais!inner(empresa_id)')
    .eq('id', targetBookingId)
    .eq('agend_profissionais.empresa_id', auth.empresa.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Agendamento não encontrado ou não pertence a esta empresa.' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('agend_agendamentos')
    .update({ 
      status: 'cancelado',
      observacao: motivo ? `Cancelado: ${motivo}` : 'Cancelado pelo paciente via IA'
    })
    .eq('id', targetBookingId)
    .select('*, agend_clientes_finais(*), agend_tipos_evento(*), agend_profissionais(*)')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Erro ao cancelar o agendamento' }, { status: 500 });
  }

  const { triggerBookingWebhook } = await import('@/lib/webhook');
  triggerBookingWebhook('booking.cancelled', { ...data, motivo }, auth.empresa.id).catch(console.error);

  const cancelMsg = 'Agendamento cancelado com sucesso.';
  return NextResponse.json({
    success: true,
    ok: true,
    message: cancelMsg,
    text: cancelMsg,
    content: cancelMsg,
    result: cancelMsg,
    response: cancelMsg,
    resposta: cancelMsg,
    data
  });
});
