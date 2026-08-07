import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { getAvailableSlots } from '@/lib/availability/engine';
import { parseISO, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const eventTypeId = searchParams.get('event_type_id');
  const dateStr = searchParams.get('date');

  if (!eventTypeId || !dateStr) {
    return NextResponse.json({ error: 'event_type_id and date are required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const date = parseISO(dateStr);
  const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado

  // 1. Obter Event Type e Profissional
  const { data: eventType, error: errEvent } = await supabase
    .from('agend_tipos_evento')
    .select('*, agend_profissionais!inner(id, empresa_id)')
    .eq('id', eventTypeId)
    .single();

  if (errEvent || !eventType) return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
  if (!auth.empresa || (eventType.agend_profissionais as any).empresa_id !== auth.empresa.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const profId = eventType.profissional_id;

  // 2. Obter Regras de Disponibilidade
  const { data: regras } = await supabase
    .from('agend_disponibilidade')
    .select('hora_inicio, hora_fim')
    .eq('profissional_id', profId)
    .eq('dia_semana', dayOfWeek);

  if (!regras || regras.length === 0) {
    return NextResponse.json({ data: [] }); 
  }

  // 3. Obter Agendamentos do Dia
  const diaInicio = startOfDay(date).toISOString();
  const diaFim = endOfDay(date).toISOString();

  const { data: bookings } = await supabase
    .from('agend_agendamentos')
    .select('inicio, fim')
    .eq('profissional_id', profId)
    .in('status', ['confirmado', 'remarcado'])
    .gte('inicio', diaInicio)
    .lte('fim', diaFim);

  // 4. Obter Bloqueios do Dia
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

  return NextResponse.json({ data: slots });
}
