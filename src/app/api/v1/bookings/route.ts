import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { event_type_id, inicio, fim, nome, email, telefone } = body;

  const supabase = getServiceSupabase();

  // 1. Obter Event Type para saber o profissional
  const { data: eventType } = await supabase
    .from('agend_tipos_evento')
    .select('*, agend_profissionais!inner(id, empresa_id)')
    .eq('id', event_type_id)
    .single();

  if (!eventType) return NextResponse.json({ error: 'Event Type not found' }, { status: 404 });
  if (eventType.agend_profissionais.empresa_id !== auth.empresa.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Criar ou buscar cliente
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
      .insert({ empresa_id: auth.empresa.id, nome, email, telefone })
      .select('id')
      .single();
    if (errCliente) return NextResponse.json({ error: errCliente.message }, { status: 400 });
    clienteId = novoCliente.id;
  }

  // 3. Inserir Agendamento
  const { data: booking, error: errBooking } = await supabase
    .from('agend_agendamentos')
    .insert({
      empresa_id: auth.empresa.id,
      profissional_id: eventType.profissional_id,
      tipo_evento_id: event_type_id,
      cliente_id: clienteId,
      inicio,
      fim,
      status: 'confirmado'
    })
    .select('*')
    .single();

  if (errBooking) {
    if (errBooking.message.includes('conflict') || errBooking.message.includes('overlapping')) {
      return NextResponse.json({ error: 'Horário indisponível (conflito)' }, { status: 409 });
    }
    return NextResponse.json({ error: errBooking.message }, { status: 400 });
  }

  // Disparar Webhook assincronamente (best effort)
  if (auth.empresa.webhook_url) {
    fetch(auth.empresa.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'booking.created', data: booking })
    }).catch(console.error);
  }

  return NextResponse.json({ data: booking });
}
