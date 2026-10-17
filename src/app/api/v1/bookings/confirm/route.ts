import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { withApiLogger } from '@/lib/api-logger';

export const POST = withApiLogger(async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Permite que venha via URL params se necessário
  }

  const { searchParams } = new URL(request.url);
  const bookingId = body?.booking_id || body?.id || searchParams.get('booking_id') || searchParams.get('id');
  const telefone = body?.telefone || body?.phone || body?.whatsapp || searchParams.get('telefone') || searchParams.get('whatsapp');
  const observacaoAdicional = body?.observacao || body?.origem || 'Confirmado via Chat / WhatsApp';

  const supabase = getServiceSupabase();
  let targetBookingId = bookingId;

  // Se não foi passado o ID direto, mas foi passado o telefone do paciente:
  if (!targetBookingId && telefone) {
    const cleanDigits = String(telefone).replace(/\D/g, '');
    const cleanLocal = cleanDigits.length > 10 && cleanDigits.startsWith('55') ? cleanDigits.substring(2) : cleanDigits;

    // Buscar o cliente pelo telefone
    const { data: clients } = await supabase
      .from('agend_clientes_finais')
      .select('id')
      .eq('empresa_id', auth.empresa.id)
      .or(`telefone.ilike.%${cleanLocal}%,telefone.ilike.%${cleanDigits}%`);

    if (clients && clients.length > 0) {
      const clientIds = clients.map(c => c.id);
      const nowIso = new Date().toISOString();

      // Buscar o próximo agendamento futuro (ou mais recente) desse cliente não cancelado
      const { data: nearestBooking } = await supabase
        .from('agend_agendamentos')
        .select('id, profissional_id, agend_profissionais!inner(empresa_id)')
        .eq('agend_profissionais.empresa_id', auth.empresa.id)
        .in('cliente_id', clientIds)
        .neq('status', 'cancelado')
        .gte('fim', nowIso)
        .order('inicio', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nearestBooking) {
        targetBookingId = nearestBooking.id;
      }
    }
  }

  if (!targetBookingId) {
    return NextResponse.json({ 
      error: 'Agendamento não identificado. Envie booking_id ou telefone do paciente com agendamento pendente.' 
    }, { status: 400 });
  }

  // Valida e busca agendamento existente
  const { data: existing } = await supabase
    .from('agend_agendamentos')
    .select('id, status, observacao, profissional_id, agend_profissionais!inner(empresa_id)')
    .eq('id', targetBookingId)
    .eq('agend_profissionais.empresa_id', auth.empresa.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Agendamento não encontrado para esta clínica.' }, { status: 404 });
  }

  // Atualiza status para 'confirmado'
  const obsFinal = existing.observacao && !existing.observacao.includes('Confirmado')
    ? `${existing.observacao} | ${observacaoAdicional}`
    : (existing.observacao || observacaoAdicional);

  const { data: updated, error } = await supabase
    .from('agend_agendamentos')
    .update({
      status: 'confirmado',
      observacao: obsFinal
    })
    .eq('id', targetBookingId)
    .select('*, agend_clientes_finais(*), agend_tipos_evento(*), agend_profissionais(*)')
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message || 'Erro ao confirmar agendamento.' }, { status: 400 });
  }

  // Formata payload com ambos os status
  const formatted = {
    ...updated,
    status: 'confirmado',
    status_agendamento: 'confirmado',
    status_atendimento: updated.status_atendimento || 'agendado'
  };

  // Disparar Webhook assíncrono para a clínica/n8n
  const { triggerBookingWebhook } = await import('@/lib/webhook');
  triggerBookingWebhook('booking.updated', formatted, auth.empresa.id).catch(console.error);

  const msg = 'Agendamento confirmado com sucesso!';
  return NextResponse.json({
    success: true,
    message: msg,
    text: msg,
    data: formatted
  });
});
