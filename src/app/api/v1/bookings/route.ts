import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { parseISO, addMinutes, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
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
      agend_profissionais(id, nome, cor)
    `)
    .eq('empresa_id', auth.empresa.id)
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

  // Filtro por Profissional
  if (profissionalId) {
    query = query.eq('profissional_id', profissionalId);
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
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { event_type_id, profissional_id, inicio, fim, nome, email, telefone, observacao } = body;

  if (!inicio || !nome || (!telefone && !email)) {
    return NextResponse.json({ 
      error: 'Campos obrigatórios ausentes: inicio, nome e (telefone ou email) são obrigatórios.' 
    }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // 1. Obter Event Type (se informado)
  let eventType: { duracao_minutos?: number; profissional_id?: string | null } | null = null;
  if (event_type_id) {
    const { data: ev } = await supabase
      .from('agend_tipos_evento')
      .select('*')
      .eq('id', event_type_id)
      .eq('empresa_id', auth.empresa.id)
      .maybeSingle();

    eventType = ev;
  }

  // 2. Determinar Profissional
  let resolvedProfId = profissional_id;
  if (!resolvedProfId && eventType?.profissional_id) {
    resolvedProfId = eventType.profissional_id;
  }

  // Se ainda não temos profissional, pegar o primeiro da empresa
  if (!resolvedProfId) {
    const { data: firstProf } = await supabase
      .from('agend_profissionais')
      .select('id')
      .eq('empresa_id', auth.empresa.id)
      .limit(1)
      .maybeSingle();

    if (firstProf) {
      resolvedProfId = firstProf.id;
    }
  }

  if (!resolvedProfId) {
    return NextResponse.json({ error: 'Nenhum profissional/agenda disponível para realizar o agendamento' }, { status: 400 });
  }

  // 3. Calcular Horário de Término (se não enviado)
  const startDate = parseISO(inicio);
  let endDate: Date;

  if (fim) {
    endDate = parseISO(fim);
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
      empresa_id: auth.empresa.id,
      profissional_id: resolvedProfId,
      tipo_evento_id: event_type_id || null,
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
      agend_profissionais(id, nome, cor)
    `)
    .single();

  if (errBooking) {
    if (errBooking.message.includes('conflict') || errBooking.message.includes('overlapping')) {
      return NextResponse.json({ error: 'Horário indisponível (conflito com outro agendamento)' }, { status: 409 });
    }
    return NextResponse.json({ error: errBooking.message }, { status: 400 });
  }

  // 6. Disparar Webhook assincronamente (best effort)
  if (auth.empresa.webhook_url) {
    fetch(auth.empresa.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'booking.created', data: booking })
    }).catch(console.error);
  }

  return NextResponse.json({ data: booking }, { status: 201 });
}
