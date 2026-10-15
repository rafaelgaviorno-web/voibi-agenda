import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { parseISO, addMinutes, startOfDay, endOfDay } from 'date-fns';
import { withApiLogger } from '@/lib/api-logger';

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

  // Filtro por Status (padrão 'confirmado' caso não passe 'all' ou outro status)
  if (statusParam && statusParam !== 'all') {
    query = query.eq('status', statusParam);
  } else if (!statusParam) {
    query = query.in('status', ['confirmado', 'remarcado']);
  }

  // Filtro por Data
  if (dataStr) {
    const targetDate = parseISO(dataStr);
    query = query
      .gte('inicio', startOfDay(targetDate).toISOString())
      .lte('inicio', endOfDay(targetDate).toISOString());
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

  return NextResponse.json({ data: bookings || [] });
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
  const startDate = parseISO(rawInicio);
  if (isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'Formato de data/hora inválido para o campo inicio. Use o formato ISO: YYYY-MM-DDTHH:mm:ss' }, { status: 400 });
  }

  let endDate: Date;
  if (rawFim) {
    endDate = parseISO(rawFim);
  } else {
    const duracao = eventType?.duracao_minutos || 30;
    endDate = addMinutes(startDate, duracao);
  }

  const inicioIso = startDate.toISOString();
  const fimIso = endDate.toISOString();

  // 4. Criar ou buscar cliente final
  let clienteId = null;
  let query = supabase.from('agend_clientes_finais').select('id').eq('empresa_id', auth.empresa.id);
  
  if (email && telefone) {
    query = query.or(`email.eq.${email},telefone.eq.${telefone}`);
  } else if (email) {
    query = query.eq('email', email);
  } else if (telefone) {
    query = query.eq('telefone', telefone);
  }

  const { data: clienteEx } = await query.limit(1).maybeSingle();

  if (clienteEx) {
    clienteId = clienteEx.id;
  } else {
    const { data: novoCliente, error: errCliente } = await supabase
      .from('agend_clientes_finais')
      .insert({ 
        empresa_id: auth.empresa.id, 
        nome, 
        email: email || null, 
        telefone: telefone || null 
      })
      .select('id')
      .single();

    if (errCliente) return NextResponse.json({ error: errCliente.message }, { status: 400 });
    clienteId = novoCliente.id;
  }

  // 5. Inserir Agendamento
  const { data: booking, error: errBooking } = await supabase
    .from('agend_agendamentos')
    .insert({
      profissional_id: resolvedProfId,
      tipo_evento_id: eventType?.id || null,
      cliente_id: clienteId,
      inicio: inicioIso,
      fim: fimIso,
      status: 'confirmado',
      observacao: observacao || 'Agendado via API / IA'
    })
    .select(`
      id,
      inicio,
      fim,
      status,
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

  return NextResponse.json({ data: booking }, { status: 201 });
});
