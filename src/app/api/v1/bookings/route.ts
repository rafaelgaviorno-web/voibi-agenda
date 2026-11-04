import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { parseISO, addMinutes, startOfDay, endOfDay, format } from 'date-fns';
import { withApiLogger } from '@/lib/api-logger';
import { clinicNow } from '@/lib/timezone';
import { checkBlockConflict } from '@/lib/availability/blocks';

export const GET = withApiLogger(async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const telefone = searchParams.get('telefone');
  const email = searchParams.get('email');
  const dataStr = searchParams.get('data');
  const statusParam = searchParams.get('status');
  const profissionalId = searchParams.get('profissional_id');
  const limitParam = parseInt(searchParams.get('limit') || '50', 10);

  const supabase = getServiceSupabase();

  let query = supabase
    .from('agend_agendamentos')
    .select(`
      id,
      inicio,
      fim,
      status,
      status_atendimento,
      observacao,
      is_encaixe,
      created_at,
      agend_clientes_finais(id, nome, email, telefone),
      agend_tipos_evento(id, nome, duracao_minutos),
      agend_profissionais!inner(id, nome, cor, empresa_id)
    `)
    .eq('agend_profissionais.empresa_id', auth.empresa.id)
    .order('inicio', { ascending: true })
    .limit(limitParam);

  // Filtro inteligente por Status e Atendimento (compatibilidade total com n8n e IA)
  const statusAtendimentoParam = searchParams.get('status_atendimento');
  const faltososParam = searchParams.get('faltosos') === 'true' || searchParams.get('faltou') === 'true';

  const atendimentoValues = ['agendado', 'aguardando', 'atendido', 'faltou', 'reagendou'];

  // Resolve status_atendimento caso passe status_atendimento=..., status=faltou (ou outro de atendimento) ou faltosos=true
  const resolvedStatusAtendimento = faltososParam 
    ? 'faltou' 
    : (statusAtendimentoParam || (statusParam && atendimentoValues.includes(statusParam.toLowerCase()) ? statusParam.toLowerCase() : null));

  // Resolve status de agendamento (apenas se não for um status de atendimento)
  const resolvedStatusAgendamento = (statusParam && !atendimentoValues.includes(statusParam.toLowerCase())) 
    ? statusParam 
    : null;

  const statusAtivos = ['confirmado', 'pendente', 'remarcado'];
  const pedeAtivos = resolvedStatusAgendamento && ['ativo', 'ativos', 'ativas'].includes(resolvedStatusAgendamento.toLowerCase());
  // Busca das consultas de um paciente (por telefone/e-mail) com status=confirmado: os prompts das IAs usam
  // "confirmado" no sentido de "consulta marcada", mas o que a IA agenda nasce "pendente". Sem isso a IA não
  // encontrava a consulta antiga ao remarcar e deixava o horário ocupado.
  const confirmadoDoPaciente = resolvedStatusAgendamento?.toLowerCase() === 'confirmado' && !!(telefone || email);

  if (pedeAtivos || confirmadoDoPaciente) {
    query = query.in('status', statusAtivos);
  } else if (resolvedStatusAgendamento && resolvedStatusAgendamento !== 'all') {
    query = query.eq('status', resolvedStatusAgendamento);
  } else if (!resolvedStatusAgendamento && !resolvedStatusAtendimento) {
    query = query.in('status', statusAtivos);
  }

  if (resolvedStatusAtendimento && resolvedStatusAtendimento !== 'all') {
    query = query.eq('status_atendimento', resolvedStatusAtendimento);
  }

  // Filtro por Data (data exata, período ou apenas futuros)
  const dataInicioStr = searchParams.get('data_inicio') || searchParams.get('inicio');
  const dataFimStr = searchParams.get('data_fim') || searchParams.get('fim');
  const apenasFuturos = searchParams.get('futuros') === 'true' || searchParams.get('apenas_futuros') === 'true';

  if (dataStr) {
    const targetDate = parseISO(dataStr);
    query = query
      .gte('inicio', startOfDay(targetDate).toISOString())
      .lte('inicio', endOfDay(targetDate).toISOString());
  } else {
    if (dataInicioStr) {
      query = query.gte('inicio', startOfDay(parseISO(dataInicioStr)).toISOString());
    }
    if (dataFimStr) {
      query = query.lte('inicio', endOfDay(parseISO(dataFimStr)).toISOString());
    }
    if (apenasFuturos) {
      query = query.gt('inicio', clinicNow(auth.empresa.fuso_horario).toISOString());
    }
  }

  // Filtro por Profissional / Agenda
  const rawProf = profissionalId || 
                  searchParams.get('agenda_id') || 
                  searchParams.get('agenda') || 
                  searchParams.get('profissional') ||
                  searchParams.get('agenda_nome') ||
                  searchParams.get('profissional_nome') ||
                  searchParams.get('doutor') ||
                  searchParams.get('medico');
  if (rawProf) {
    const { resolveProfissional } = await import('@/lib/agenda-resolver');
    const p = await resolveProfissional(supabase, auth.empresa.id, rawProf);
    if (p) {
      query = query.eq('profissional_id', p.id);
    } else {
      return NextResponse.json({ data: [] });
    }
  }

  // Filtro por Telefone ou Email do Cliente
  if (telefone || email) {
    let clienteQuery = supabase
      .from('agend_clientes_finais')
      .select('id')
      .eq('empresa_id', auth.empresa.id);

    if (telefone && email) {
      clienteQuery = clienteQuery.or(`telefone.ilike.%${telefone}%,email.ilike.%${email}%`);
    } else if (telefone) {
      const cleanDigits = telefone.replace(/\D/g, '');
      if (cleanDigits.length >= 8) {
        clienteQuery = clienteQuery.or(`telefone.ilike.%${telefone}%,telefone.ilike.%${cleanDigits}%`);
      } else {
        clienteQuery = clienteQuery.ilike('telefone', `%${telefone}%`);
      }
    } else if (email) {
      clienteQuery = clienteQuery.ilike('email', `%${email}%`);
    }

    const { data: matchedClients, error: errClients } = await clienteQuery;
    if (errClients || !matchedClients || matchedClients.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const clientIds = matchedClients.map(c => c.id);
    query = query.in('cliente_id', clientIds);
  }

  const { data: bookings, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formattedBookings = (bookings || []).map((b: any) => ({
    ...b,
    status: b.status || 'pendente',
    status_agendamento: b.status || 'pendente',
    status_atendimento: b.status_atendimento || 'agendado',
  }));

  return NextResponse.json({ data: formattedBookings });
});

export const POST = withApiLogger(async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  
  // Suporte flexível a nomes de campos alternativos comumente enviados por IAs
  const rawProf = body.profissional_id || 
                  body.agenda_id || 
                  body.agenda || 
                  body.profissional || 
                  body.agenda_nome || 
                  body.profissional_nome ||
                  body.doutor ||
                  body.medico;

  const nome = body.nome || body.name || body.paciente_nome || body.cliente_nome || body.paciente || body.cliente;
  const telefone = body.telefone || body.phone || body.whatsapp || body.celular || body.tel;
  const email = body.email || body.e_mail;
  const observacao = body.observacao || body.notes || body.motivo || body.descricao;
  const event_type_id = body.event_type_id || body.tipo_evento_id || body.procedimento || body.procedimento_id || body.servico || body.servico_id;

  // Resolução flexível de data/hora (unificados ou separados)
  let rawInicio = body.inicio || body.start || body.start_time || body.datetime || body.data_hora;
  if (!rawInicio && (body.data || body.date) && (body.hora || body.time || body.horario)) {
    const rawDate = body.data || body.date;
    const rawTime = body.hora || body.time || body.horario;
    let formattedDate = rawDate.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(formattedDate)) {
      const [d, m, y] = formattedDate.split('/');
      formattedDate = `${y}-${m}-${d}`;
    }
    rawInicio = `${formattedDate}T${rawTime.trim().padStart(5, '0')}:00`;
  }

  let rawFim = body.fim || body.end || body.end_time;

  // Reagendamento: id da consulta anterior, que é cancelada (liberando o horário) depois que a nova for criada
  const reagendarDeRaw = body.reagendar_de || body.reagendamento_de || body.remarcar_de || body.substituir_id || body.cancelar_id;
  const reagendarDe = typeof reagendarDeRaw === 'string' && reagendarDeRaw.trim() ? reagendarDeRaw.trim() : null;

  if (!rawInicio || !nome || (!telefone && !email)) {
    return NextResponse.json({ 
      error: 'Campos obrigatórios ausentes: inicio (data e hora), nome e (telefone ou email) são obrigatórios.' 
    }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // 1. Obter Event Type (por ID ou por Nome)
  let eventType: { id: string; duracao_minutos?: number; profissional_id?: string | null } | null = null;
  if (event_type_id) {
    const cleanEv = String(event_type_id).trim();
    const isEvUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanEv);
    let evQuery = supabase.from('agend_tipos_evento').select('*').eq('empresa_id', auth.empresa.id);
    if (isEvUuid) {
      evQuery = evQuery.eq('id', cleanEv);
    } else {
      evQuery = evQuery.ilike('nome', `%${cleanEv}%`);
    }

    const { data: ev } = await evQuery.limit(1).maybeSingle();
    eventType = ev;
  }

  // 2. Determinar Profissional / Agenda de forma resiliente
  const { resolveProfissional } = await import('@/lib/agenda-resolver');
  let resolvedProf = await resolveProfissional(supabase, auth.empresa.id, rawProf);

  // Fallback 1: se o procedimento possui um profissional fixo
  if (!resolvedProf && eventType?.profissional_id) {
    resolvedProf = await resolveProfissional(supabase, auth.empresa.id, eventType.profissional_id);
  }

  // Fallback 2: pegar a primeira agenda da empresa
  if (!resolvedProf) {
    const { data: firstProf } = await supabase
      .from('agend_profissionais')
      .select('id, nome, cor, webhook_url, permitir_sobreposicao')
      .eq('empresa_id', auth.empresa.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstProf) {
      resolvedProf = firstProf;
    }
  }

  if (!resolvedProf) {
    return NextResponse.json({ error: 'Nenhuma agenda ou profissional disponível para realizar o agendamento' }, { status: 400 });
  }

  const resolvedProfId = resolvedProf.id;

  // 3. Calcular Horário de Término (se não enviado)
  // Preserva a hora de relógio da clínica: o horário enviado é SEMPRE tratado como hora local da clínica.
  // O sufixo de fuso (Z, -03:00, -0400...) é descartado, nunca convertido — o próprio /availability devolve
  // a hora local com "Z" (ex: 08:00 local => "...T08:00:00.000Z"), e a IA reenvia esse valor como veio.
  function toClinicClockDate(rawStr: string): Date {
    const clockOnly = rawStr.trim().replace(/(\.\d+)?([+-]\d{2}:?\d{2}|Z)$/i, '');
    return parseISO(clockOnly);
  }

  const startDate = toClinicClockDate(rawInicio);
  if (isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'Formato de data/hora inválido para o campo inicio. Use o formato ISO: YYYY-MM-DDTHH:mm:ss' }, { status: 400 });
  }

  let endDate: Date;
  if (rawFim) {
    endDate = toClinicClockDate(rawFim);
  } else {
    const duracao = eventType?.duracao_minutos || 30;
    endDate = addMinutes(startDate, duracao);
  }

  const inicioIso = format(startDate, "yyyy-MM-dd'T'HH:mm:ss");
  const fimIso = format(endDate, "yyyy-MM-dd'T'HH:mm:ss");

  // 3.1 Reagendamento: a consulta anterior precisa ser desta empresa. Se ela já estiver cancelada, segue sem cancelar de novo.
  let anterior: { id: string; inicio: string; status: string; observacao: string | null } | null = null;
  if (reagendarDe) {
    const { data: ant } = await supabase
      .from('agend_agendamentos')
      .select('id, inicio, status, observacao, agend_profissionais!inner(empresa_id)')
      .eq('id', reagendarDe)
      .eq('agend_profissionais.empresa_id', auth.empresa.id)
      .maybeSingle();
    if (!ant) {
      return NextResponse.json({
        error: 'Consulta anterior (reagendar_de) não encontrada. Busque de novo as consultas do paciente pelo telefone e use o id retornado.'
      }, { status: 400 });
    }
    anterior = ant;
  }

  // 4. Criar ou buscar cliente final
  let clienteId = null;
  const cleanNome = (nome || '').trim();
  const cleanTelefone = (telefone || '').trim();
  const cleanEmail = (email || '').trim();

  // Busca se já existem clientes cadastrados com este telefone ou email
  let clienteQuery = supabase
    .from('agend_clientes_finais')
    .select('id, nome, telefone, email')
    .eq('empresa_id', auth.empresa.id);

  if (cleanTelefone && cleanEmail) {
    clienteQuery = clienteQuery.or(`telefone.eq.${cleanTelefone},email.eq.${cleanEmail}`);
  } else if (cleanTelefone) {
    clienteQuery = clienteQuery.eq('telefone', cleanTelefone);
  } else if (cleanEmail) {
    clienteQuery = clienteQuery.eq('email', cleanEmail);
  }

  const { data: clientesEncontrados } = await clienteQuery;

  let clienteMatch: { id: string; nome: string | null } | null = null;
  if (clientesEncontrados && clientesEncontrados.length > 0) {
    if (cleanNome) {
      const nomeLower = cleanNome.toLowerCase();
      // Verifica se algum cliente existente com o mesmo contato tem o mesmo nome (ou variação dele)
      clienteMatch = clientesEncontrados.find(c => {
        const cNome = (c.nome || '').trim().toLowerCase();
        return cNome === nomeLower || cNome.includes(nomeLower) || nomeLower.includes(cNome);
      }) || null;
    } else {
      // Se não veio nome nenhum informado, usa o primeiro encontrado
      clienteMatch = clientesEncontrados[0];
    }
  }

  if (clienteMatch) {
    clienteId = clienteMatch.id;
    // Se o novo nome for mais completo, atualiza o cadastro existente
    if (cleanNome && cleanNome.length > (clienteMatch.nome || '').length) {
      await supabase
        .from('agend_clientes_finais')
        .update({ nome: cleanNome })
        .eq('id', clienteId);
    }
  } else {
    // Novo paciente (mesmo compartilhando o telefone de um familiar, ex: marido/esposa/filho)
    const { data: novoCliente, error: errCliente } = await supabase
      .from('agend_clientes_finais')
      .insert({ 
        empresa_id: auth.empresa.id, 
        nome: cleanNome || 'Paciente', 
        email: cleanEmail || null, 
        telefone: cleanTelefone || null 
      })
      .select('id')
      .single();

    if (errCliente) return NextResponse.json({ error: errCliente.message }, { status: 400 });
    clienteId = novoCliente.id;
  }

  // 4.5. Validação de Expediente, Bloqueios e Conflitos do Profissional
  const isEncaixe = body.is_encaixe === true || body.encaixe === true;

  if (!isEncaixe) {
    const [y, m, d] = rawInicio.slice(0, 10).split('-').map(Number);
    const safeDate = new Date(y, m - 1, d, 12, 0, 0);
    const dayOfWeek = safeDate.getDay();

    // Verifica se o profissional tem expediente cadastrado no sistema
    const { data: allRegrasProf } = await supabase
      .from('agend_disponibilidade')
      .select('hora_inicio, hora_fim, dia_semana')
      .eq('profissional_id', resolvedProfId);

    if (allRegrasProf && allRegrasProf.length > 0) {
      const regrasDoDia = allRegrasProf.filter(r => r.dia_semana === dayOfWeek);
      if (regrasDoDia.length === 0) {
        const diasNomes = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
        return NextResponse.json({
          error: `O profissional ${resolvedProf.nome} não possui atendimento em ${diasNomes[dayOfWeek]}s. Por favor, selecione uma data em que o profissional tenha expediente.`
        }, { status: 400 });
      }

      // Verifica se o horário de início está dentro de algum intervalo do expediente
      const startHhmm = format(startDate, 'HH:mm:ss');
      const endHhmm = format(endDate, 'HH:mm:ss');
      const cabeNoExpediente = regrasDoDia.some(r => {
        const rInicio = r.hora_inicio.length === 5 ? `${r.hora_inicio}:00` : r.hora_inicio;
        const rFim = r.hora_fim.length === 5 ? `${r.hora_fim}:00` : r.hora_fim;
        return startHhmm >= rInicio && endHhmm <= rFim;
      });

      if (!cabeNoExpediente) {
        return NextResponse.json({
          error: `O horário solicitado (${format(startDate, 'HH:mm')} às ${format(endDate, 'HH:mm')}) está fora do expediente de atendimento do profissional ${resolvedProf.nome}.`
        }, { status: 400 });
      }
    }

    // Verifica se há bloqueios no período (pontual ou recorrente)
    const blockCheck = await checkBlockConflict(
      supabase,
      auth.empresa.id,
      resolvedProfId,
      (resolvedProf as any).unidade_id || null,
      inicioIso,
      fimIso
    );

    if (blockCheck.blocked) {
      return NextResponse.json({
        error: `Horário indisponível devido a bloqueio na agenda: ${blockCheck.motivo || 'Agenda bloqueada'}.`
      }, { status: 400 });
    }

    // Verifica se há conflito com outro agendamento se sobreposição não for permitida
    if (!resolvedProf.permitir_sobreposicao) {
      let conflitoQuery = supabase
        .from('agend_agendamentos')
        .select('id')
        .eq('profissional_id', resolvedProfId)
        .in('status', ['confirmado', 'pendente', 'remarcado'])
        .lt('inicio', fimIso)
        .gt('fim', inicioIso);
      // A consulta que está sendo remarcada não conta como conflito (ex.: mover 15 min com o mesmo profissional)
      if (anterior) conflitoQuery = conflitoQuery.neq('id', anterior.id);
      const { data: conflitos } = await conflitoQuery;

      if (conflitos && conflitos.length > 0) {
        return NextResponse.json({
          error: `Já existe um agendamento neste horário para o profissional ${resolvedProf.nome}. Por favor, escolha outro horário.`
        }, { status: 409 });
      }
    }
  }

  // 5. Inserir Agendamento
  const obsFinal = observacao === 'Agendado pela IA'
    ? 'Agendado pela IA'
    : (observacao 
        ? (cleanNome && !observacao.includes(cleanNome) ? `${observacao} | Paciente: ${cleanNome}` : observacao)
        : 'Agendado pela IA');

  const { data: booking, error: errBooking } = await supabase
    .from('agend_agendamentos')
    .insert({
      profissional_id: resolvedProfId,
      tipo_evento_id: eventType?.id || null,
      cliente_id: clienteId,
      inicio: inicioIso,
      fim: fimIso,
      status: body.status || 'pendente',
      status_atendimento: body.status_atendimento || 'agendado',
      observacao: obsFinal
    })
    .select(`
      id,
      inicio,
      fim,
      status,
      status_atendimento,
      observacao,
      created_at,
      agend_clientes_finais(id, nome, email, telefone),
      agend_tipos_evento(id, nome, duracao_minutos),
      agend_profissionais(id, nome, cor, webhook_url)
    `)
    .single();

  if (errBooking) {
    if (errBooking.message.includes('conflict') || errBooking.message.includes('overlapping')) {
      return NextResponse.json({ error: 'Horário indisponível (conflito com outro agendamento)' }, { status: 409 });
    }
    return NextResponse.json({ error: errBooking.message }, { status: 400 });
  }

  // 6. Disparar Webhook assincronamente (prioriza webhook da agenda, fallback para empresa)
  const { triggerBookingWebhook } = await import('@/lib/webhook');
  triggerBookingWebhook('booking.created', booking, auth.empresa.id).catch(console.error);

  const dataFormatada = format(startDate, "dd/MM/yyyy 'às' HH:mm");

  // 6.1 Reagendamento: cancela a consulta anterior só depois que a nova foi criada, liberando o horário antigo
  let reagendamento: { anterior_id: string; anterior_inicio: string; cancelado: boolean; erro?: string } | null = null;
  if (anterior) {
    if (['cancelado'].includes(anterior.status)) {
      reagendamento = { anterior_id: anterior.id, anterior_inicio: anterior.inicio, cancelado: true };
    } else {
      const obsCancel = `Cancelado: remarcado para ${dataFormatada} (novo agendamento ${booking.id})`;
      const { data: cancelada, error: errCancel } = await supabase
        .from('agend_agendamentos')
        .update({
          status: 'cancelado',
          status_atendimento: 'reagendou',
          observacao: anterior.observacao ? `${anterior.observacao} | ${obsCancel}` : obsCancel,
        })
        .eq('id', anterior.id)
        .select('*, agend_clientes_finais(*), agend_tipos_evento(*), agend_profissionais(*)')
        .single();
      reagendamento = { anterior_id: anterior.id, anterior_inicio: anterior.inicio, cancelado: !errCancel };
      if (errCancel) {
        reagendamento.erro = errCancel.message;
      } else if (cancelada) {
        triggerBookingWebhook('booking.cancelled', { ...cancelada, motivo: obsCancel }, auth.empresa.id).catch(console.error);
      }
    }
  }

  const confirmMsg = reagendamento?.cancelado
    ? `Reagendamento concluído com sucesso: nova consulta com ${resolvedProf.nome} para ${dataFormatada}. A consulta anterior foi cancelada e o horário liberado.`
    : `Agendamento confirmado com sucesso com ${resolvedProf.nome} para ${dataFormatada}!`;

  const formattedBooking = {
    ...booking,
    status: booking.status || 'pendente',
    status_agendamento: booking.status || 'pendente',
    status_atendimento: booking.status_atendimento || 'agendado',
  };

  return NextResponse.json({
    data: formattedBooking,
    ...(reagendamento ? { reagendamento } : {}),
    text: confirmMsg,
    message: confirmMsg,
    content: confirmMsg,
    result: confirmMsg,
    response: confirmMsg,
    resposta: confirmMsg
  }, { status: 201 });
});
