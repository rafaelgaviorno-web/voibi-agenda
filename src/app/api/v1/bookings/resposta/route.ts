import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { withApiLogger } from '@/lib/api-logger';

async function handleResposta(request: NextRequest, isGet = false) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: any = {};
  if (!isGet) {
    try {
      body = await request.json();
    } catch {
      // Ignora se não for JSON válido e tenta via query params
    }
  }

  const { searchParams } = new URL(request.url);
  
  // Extrai booking_id direto (caso fornecido)
  const bookingId = 
    body?.booking_id || 
    body?.id || 
    body?.data?.booking_id || 
    searchParams.get('booking_id') || 
    searchParams.get('id');

  // Extrai telefone em formatos diretos ou aninhados (Evolution, Z-API, Meta, Typebot, Chatwoot, etc.)
  const rawTelefone = 
    body?.telefone || 
    body?.phone || 
    body?.whatsapp || 
    body?.from || 
    body?.number || 
    body?.sender || 
    body?.data?.key?.remoteJid || 
    body?.contact?.phone_number || 
    body?.customer?.phone || 
    body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ||
    searchParams.get('telefone') || 
    searchParams.get('phone') || 
    searchParams.get('whatsapp') || 
    searchParams.get('from');

  const telefone = rawTelefone ? String(rawTelefone).replace(/@.*$/, '') : '';

  // Extrai texto da resposta/botão (simples ou aninhado de bots e WhatsApp)
  const rawResposta = 
    body?.resposta || 
    body?.button || 
    body?.button_text || 
    body?.buttonText || 
    body?.opcao || 
    body?.acao || 
    body?.text || 
    body?.content || 
    body?.value || 
    body?.selectedOption || 
    body?.data?.message?.conversation || 
    body?.data?.message?.buttonsResponseMessage?.selectedDisplayText || 
    body?.data?.message?.buttonsResponseMessage?.selectedButtonId || 
    body?.data?.message?.listResponseMessage?.title || 
    body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.button?.text || 
    body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.button_reply?.title || 
    searchParams.get('resposta') || 
    searchParams.get('opcao') || 
    searchParams.get('acao') || 
    searchParams.get('button') || 
    'confirmar';

  const respostaRaw = String(rawResposta).trim().toLowerCase();
  const observacaoExtra = body?.observacao || body?.notes || searchParams.get('observacao') || '';

  const supabase = getServiceSupabase();
  let targetBookingId = bookingId;

  // 1. Localizar agendamento pelo telefone se não veio booking_id direto
  if (!targetBookingId && telefone) {
    const cleanDigits = String(telefone).replace(/\D/g, '');
    const cleanLocal = cleanDigits.length > 10 && cleanDigits.startsWith('55') ? cleanDigits.substring(2) : cleanDigits;

    // Buscar clientes correspondentes na clínica
    const { data: clients } = await supabase
      .from('agend_clientes_finais')
      .select('id')
      .eq('empresa_id', auth.empresa.id)
      .or(`telefone.ilike.%${cleanLocal}%,telefone.ilike.%${cleanDigits}%`);

    if (clients && clients.length > 0) {
      const clientIds = clients.map(c => c.id);
      const nowIso = new Date().toISOString();

      // Busca o agendamento mais próximo (futuro ou de hoje) não cancelado
      const { data: nearest } = await supabase
        .from('agend_agendamentos')
        .select('id, profissional_id, agend_profissionais!inner(empresa_id)')
        .eq('agend_profissionais.empresa_id', auth.empresa.id)
        .in('cliente_id', clientIds)
        .neq('status', 'cancelado')
        .gte('fim', nowIso)
        .order('inicio', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nearest) {
        targetBookingId = nearest.id;
      }
    }
  }

  if (!targetBookingId) {
    return NextResponse.json({ 
      error: 'Agendamento não identificado. Envie booking_id ou o telefone do paciente com agendamento ativo.' 
    }, { status: 400 });
  }

  // 2. Buscar agendamento existente na clínica
  const { data: existing } = await supabase
    .from('agend_agendamentos')
    .select('id, status, status_atendimento, observacao, profissional_id, agend_profissionais!inner(empresa_id)')
    .eq('id', targetBookingId)
    .eq('agend_profissionais.empresa_id', auth.empresa.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Agendamento não encontrado para esta clínica.' }, { status: 404 });
  }

  // 3. Interpretar a resposta do botão do chat
  let acao: 'confirmar' | 'reagendar' | 'cancelar' = 'confirmar';

  if (
    respostaRaw.includes('reagend') || 
    respostaRaw.includes('remarc') || 
    respostaRaw.includes('trocar') || 
    respostaRaw.includes('outro') ||
    respostaRaw === '2'
  ) {
    acao = 'reagendar';
  } else if (
    respostaRaw.includes('cancel') || 
    respostaRaw.includes('nao') || 
    respostaRaw.includes('desmarc') ||
    respostaRaw === '3'
  ) {
    acao = 'cancelar';
  } else {
    // Padrão ou qualquer confirmação ("confirmar", "sim", "1", "ok", etc.)
    acao = 'confirmar';
  }

  // 4. Executar alteração de status correspondente
  let updatePayload: Record<string, any> = {};
  let eventoWebhook: 'booking.updated' | 'booking.cancelled' = 'booking.updated';
  let mensagemRetorno = '';

  if (acao === 'confirmar') {
    const obs = `Confirmado pelo paciente via Chat (${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`;
    updatePayload = {
      status: 'confirmado',
      observacao: existing.observacao ? `${existing.observacao} | ${obs}` : obs
    };
    eventoWebhook = 'booking.updated';
    mensagemRetorno = 'Agendamento confirmado com sucesso!';
  } else if (acao === 'reagendar') {
    const obs = `Paciente solicitou reagendamento via Chat (${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`;
    updatePayload = {
      status_atendimento: 'reagendou',
      observacao: existing.observacao ? `${existing.observacao} | ${obs}` : obs
    };
    eventoWebhook = 'booking.updated';
    mensagemRetorno = 'Status de atendimento atualizado para Reagendou!';
  } else if (acao === 'cancelar') {
    const obs = `Cancelado pelo paciente via Chat (${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`;
    updatePayload = {
      status: 'cancelado',
      observacao: existing.observacao ? `${existing.observacao} | ${obs}` : obs
    };
    eventoWebhook = 'booking.cancelled';
    mensagemRetorno = 'Agendamento cancelado com sucesso.';
  }

  if (observacaoExtra) {
    updatePayload.observacao = `${updatePayload.observacao} - ${observacaoExtra}`;
  }

  const { data: updated, error } = await supabase
    .from('agend_agendamentos')
    .update(updatePayload)
    .eq('id', targetBookingId)
    .select('*, agend_clientes_finais(*), agend_tipos_evento(*), agend_profissionais(*)')
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message || 'Erro ao processar resposta do agendamento.' }, { status: 400 });
  }

  const formatted = {
    ...updated,
    status: updated.status || 'pendente',
    status_agendamento: updated.status || 'pendente',
    status_atendimento: updated.status_atendimento || 'agendado'
  };

  // 5. Dispara Webhook da clínica para avisar sistemas integrados
  const { triggerBookingWebhook } = await import('@/lib/webhook');
  triggerBookingWebhook(eventoWebhook, formatted, auth.empresa.id).catch(console.error);

  return NextResponse.json({
    success: true,
    acao,
    status_agendamento: formatted.status,
    status_atendimento: formatted.status_atendimento,
    message: mensagemRetorno,
    text: mensagemRetorno,
    data: formatted
  });
}

export const POST = withApiLogger(async function POST(request: NextRequest) {
  return handleResposta(request, false);
});

export const GET = withApiLogger(async function GET(request: NextRequest) {
  return handleResposta(request, true);
});
