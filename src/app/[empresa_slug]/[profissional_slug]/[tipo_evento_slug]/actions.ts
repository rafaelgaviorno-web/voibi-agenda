'use server'
import { getServiceSupabase } from '@/lib/supabase/client';
import { getAvailableSlots } from '@/lib/availability/engine';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

export async function getSlotsForDate(eventTypeId: string, dateStr: string) {
  const supabase = getServiceSupabase();
  const date = parseISO(dateStr);
  const dayOfWeek = date.getDay();

  const { data: eventType } = await supabase
    .from('agend_tipos_evento')
    .select('*, agend_profissionais!inner(id)')
    .eq('id', eventTypeId)
    .single();

  if (!eventType) throw new Error("Event type not found");

  const profId = eventType.agend_profissionais.id;

  const { data: regras } = await supabase
    .from('agend_disponibilidade')
    .select('hora_inicio, hora_fim')
    .eq('profissional_id', profId)
    .eq('dia_semana', dayOfWeek);

  if (!regras || regras.length === 0) return [];

  const diaInicio = startOfDay(date).toISOString();
  const diaFim = endOfDay(date).toISOString();

  const { data: bookings } = await supabase
    .from('agend_agendamentos')
    .select('inicio, fim')
    .eq('profissional_id', profId)
    .in('status', ['confirmado', 'remarcado'])
    .gte('inicio', diaInicio)
    .lte('fim', diaFim);

  const { data: blocks } = await supabase
    .from('agend_bloqueios')
    .select('inicio, fim')
    .eq('profissional_id', profId)
    .gte('inicio', diaInicio)
    .lte('fim', diaFim);

  const parsedBookings = (bookings || []).map(b => ({ start: new Date(b.inicio), end: new Date(b.fim) }));
  const parsedBlocks = (blocks || []).map(b => ({ start: new Date(b.inicio), end: new Date(b.fim) }));
  const mappedRegras = regras.map(r => ({ startTime: r.hora_inicio, endTime: r.hora_fim }));

  const slots = getAvailableSlots(
    date,
    mappedRegras,
    {
      durationMinutes: eventType.duracao_minutos,
      bufferBeforeMinutes: eventType.buffer_antes_minutos,
      bufferAfterMinutes: eventType.buffer_depois_minutos,
      minNoticeHours: eventType.antecedencia_min_horas
    },
    parsedBookings,
    parsedBlocks
  );

  return slots;
}

export async function createBookingAction(formData: FormData) {
  const eventTypeId = formData.get('eventTypeId') as string;
  const empresaId = formData.get('empresaId') as string;
  const inicio = formData.get('inicio') as string;
  const fim = formData.get('fim') as string;
  const nome = formData.get('nome') as string;
  const email = formData.get('email') as string;
  const telefone = formData.get('telefone') as string;

  const supabase = getServiceSupabase();

  const { data: eventType } = await supabase
    .from('agend_tipos_evento')
    .select('*, agend_profissionais!inner(id)')
    .eq('id', eventTypeId)
    .single();

  if (!eventType) return { error: "Tipo de evento não encontrado" };

  let clienteId = null;
  
  let query = supabase.from('agend_clientes_finais').select('id').eq('empresa_id', empresaId);
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
    const { data: novoCliente, error: errC } = await supabase
      .from('agend_clientes_finais')
      .insert({ empresa_id: empresaId, nome, email, telefone })
      .select('id')
      .single();
    if (errC) return { error: errC.message };
    clienteId = novoCliente.id;
  }

  const { data: booking, error: errB } = await supabase
    .from('agend_agendamentos')
    .insert({
      empresa_id: empresaId,
      profissional_id: eventType.profissional_id,
      tipo_evento_id: eventTypeId,
      cliente_id: clienteId,
      inicio,
      fim,
      status: 'confirmado'
    })
    .select('*')
    .single();

  if (errB) {
    if (errB.message.includes('conflict') || errB.message.includes('overlapping')) {
      return { error: 'Horário indisponível (conflito)' };
    }
    return { error: errB.message };
  }

  return { success: true, booking };
}
