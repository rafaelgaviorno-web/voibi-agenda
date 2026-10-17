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

  const pacienteFiltro = String(
    body?.paciente || 
    body?.paciente_nome || 
    body?.nome || 
    body?.patient || 
    searchParams.get('paciente') || 
    searchParams.get('nome') || 
    ''
  ).trim().toLowerCase();

  const supabase = getServiceSupabase();
  let targetBookingId = bookingId;
  let outrosFamiliaresPendentes: any[] = [];
  let pacienteIdentificadoNome = '';

  // 1. Localizar agendamento pelo telefone se não veio booking_id direto
  if (!targetBookingId && telefone) {
    const cleanDigits = String(telefone).replace(/\D/g, '');
    const cleanLocal = cleanDigits.length > 10 && cleanDigits.startsWith('55') ? cleanDigits.substring(2) : cleanDigits;

    // Buscar todos os pacientes/clientes cadastrados com este telefone na clínica
    const { data: clients } = await supabase
      .from('agend_clientes_finais')
      .select('id, nome, telefone')
      .eq('empresa_id', auth.empresa.id)
      .or(`telefone.ilike.%${cleanLocal}%,telefone.ilike.%${cleanDigits}%`);

    if (clients && clients.length > 0) {
      const nowIso = new Date().toISOString();
      const allClientIds = clients.map(c => c.id);

      // Buscar todos os agendamentos ativos futuros desta família/telefone
      const { data: familyBookings } = await supabase
        .from('agend_agendamentos')
        .select('id, inicio, fim, status, status_atendimento, cliente_id, profissional_id, agend_profissionais!inner(empresa_id, nome), agend_clientes_finais!inner(id, nome, telefone)')
        .eq('agend_profissionais.empresa_id', auth.empresa.id)
        .in('cliente_id', allClientIds)
        .neq('status', 'cancelado')
        .gte('fim', nowIso)
        .order('inicio', { ascending: true });

      if (familyBookings && familyBookings.length > 0) {
        // Tenta encontrar o agendamento do paciente específico se informado nome ou se a resposta contiver o nome
        let matched = familyBookings.find(b => {
          const nomeCliente = ((b as any).agend_clientes_finais?.nome || '').toLowerCase();
          if (pacienteFiltro && nomeCliente.includes(pacienteFiltro)) return true;
          if (respostaRaw && respostaRaw.includes(nomeCliente)) return true;
          return false;
        });

        // Se não especificou o nome do familiar, pega o mais próximo
        if (!matched) {
          matched = familyBookings[0];
        }

        targetBookingId = matched.id;
        pacienteIdentificadoNome = (matched as any).agend_clientes_finais?.nome || '';

        // Detecta se existem outros membros da família com agendamento pendente
        outrosFamiliaresPendentes = familyBookings
          .filter(b => b.id !== targetBookingId)
          .map(b => ({
            booking_id: b.id,
            paciente: (b as any).agend_clientes_finais?.nome,
            inicio: b.inicio,
            status: b.status,
            status_atendimento: b.status_atendimento
          }));
      }
    }
  }

  if (!targetBookingId) {
    return NextResponse.json({ 
      error: 'Agendamento não identificado. Envie booking_id ou o telefone do paciente com agendamento ativo.' 
    }, { status: 400 });
  }

  // 2. Buscar agendamento existente na clínica com os dados do cliente
  const { data: existing } = await supabase
    .from('agend_agendamentos')
    .select('id, inicio, status, status_atendimento, observacao, profissional_id, agend_profissionais!inner(empresa_id), agend_clientes_finais(id, nome, telefone)')
    .eq('id', targetBookingId)
    .eq('agend_profissionais.empresa_id', auth.empresa.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Agendamento não encontrado para esta clínica.' }, { status: 404 });
  }

  const nomePaciente = (existing as any).agend_clientes_finais?.nome || pacienteIdentificadoNome || 'Paciente';

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

  // 4. Executar alteração de status correspondente com identificação nominal
  let updatePayload: Record<string, any> = {};
  let eventoWebhook: 'booking.updated' | 'booking.cancelled' = 'booking.updated';
  let mensagemRetorno = '';

  const horaAtualFmt = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (acao === 'confirmar') {
    const obs = `Confirmado via Chat para o paciente: ${nomePaciente} (${horaAtualFmt})`;
    updatePayload = {
      status: 'confirmado',
      observacao: existing.observacao ? `${existing.observacao} | ${obs}` : obs
    };
    eventoWebhook = 'booking.updated';
    mensagemRetorno = `Agendamento de ${nomePaciente} confirmado com sucesso!`;
  } else if (acao === 'reagendar') {
    const obs = `Solicitado reagendamento via Chat para o paciente: ${nomePaciente} (${horaAtualFmt})`;
    updatePayload = {
      status_atendimento: 'reagendou',
      observacao: existing.observacao ? `${existing.observacao} | ${obs}` : obs
    };
    eventoWebhook = 'booking.updated';
    mensagemRetorno = `Solicitação de reagendamento de ${nomePaciente} registrada!`;
  } else if (acao === 'cancelar') {
    const obs = `Cancelado via Chat para o paciente: ${nomePaciente} (${horaAtualFmt})`;
    updatePayload = {
      status: 'cancelado',
      observacao: existing.observacao ? `${existing.observacao} | ${obs}` : obs
    };
    eventoWebhook = 'booking.cancelled';
    mensagemRetorno = `Agendamento de ${nomePaciente} cancelado com sucesso.`;
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
    paciente_confirmado: nomePaciente,
    status_agendamento: formatted.status,
    status_atendimento: formatted.status_atendimento,
    message: mensagemRetorno,
    text: mensagemRetorno,
    tem_outros_familiares_pendentes: outrosFamiliaresPendentes.length > 0,
    outros_familiares_pendentes: outrosFamiliaresPendentes,
    data: formatted
  });
}

export const POST = withApiLogger(async function POST(request: NextRequest) {
  return handleResposta(request, false);
});

export const GET = withApiLogger(async function GET(request: NextRequest) {
  return handleResposta(request, true);
});
