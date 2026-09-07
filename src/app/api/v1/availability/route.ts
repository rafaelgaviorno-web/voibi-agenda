import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { getAvailableSlots } from '@/lib/availability/engine';
import { parseISO, startOfDay, endOfDay, format } from 'date-fns';

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const eventTypeId = searchParams.get('event_type_id');
  const profissionalParam = searchParams.get('profissional_id');
  const dateStr = searchParams.get('date');

  if (!dateStr) {
    return NextResponse.json({ error: 'date (YYYY-MM-DD) é obrigatório' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const date = parseISO(dateStr);
  const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado

  let eventType: { duracao_minutos?: number; buffer_antes_minutos?: number; buffer_depois_minutos?: number; antecedencia_min_horas?: number; profissional_id?: string | null } | null = null;
  let profId: string | null = profissionalParam;

  // 1. Obter Event Type se informado
  if (eventTypeId) {
    const { data: ev, error: errEvent } = await supabase
      .from('agend_tipos_evento')
      .select('*')
      .eq('id', eventTypeId)
      .eq('empresa_id', auth.empresa.id)
      .maybeSingle();

    if (errEvent || !ev) {
      return NextResponse.json({ error: 'Tipo de evento não encontrado' }, { status: 404 });
    }
    eventType = ev;

    if (!profId && ev.profissional_id) {
      profId = ev.profissional_id;
    }
  }

  // 2. Se ainda não temos profId, buscar o primeiro profissional da empresa
  if (!profId) {
    const { data: firstProf } = await supabase
      .from('agend_profissionais')
      .select('id')
      .eq('empresa_id', auth.empresa.id)
      .limit(1)
      .maybeSingle();

    if (firstProf) {
      profId = firstProf.id;
    }
  }

  if (!profId) {
    return NextResponse.json({ 
      data: [], 
      available_times: [],
      message: 'Nenhum profissional encontrado para esta empresa' 
    });
  }

  // 3. Obter Regras de Disponibilidade do Profissional
  const { data: regrasData } = await supabase
    .from('agend_disponibilidade')
    .select('hora_inicio, hora_fim')
    .eq('profissional_id', profId)
    .eq('dia_semana', dayOfWeek);

  let regras = regrasData || [];

  // Fallback padrão se nenhuma regra foi configurada: dias úteis (Seg-Sex) das 08h às 18h
  if (regras.length === 0 && dayOfWeek >= 1 && dayOfWeek <= 5) {
    regras = [{ hora_inicio: '08:00:00', hora_fim: '18:00:00' }];
  }

  if (regras.length === 0) {
    return NextResponse.json({ 
      data: [], 
      available_times: [],
      message: 'Sem expediente para esta data' 
    });
  }

  // 4. Obter Agendamentos do Dia
  const diaInicio = startOfDay(date).toISOString();
  const diaFim = endOfDay(date).toISOString();

  const { data: bookings } = await supabase
    .from('agend_agendamentos')
    .select('inicio, fim')
    .eq('profissional_id', profId)
    .in('status', ['confirmado', 'remarcado'])
    .gte('inicio', diaInicio)
    .lte('fim', diaFim);

  // 5. Obter Bloqueios do Dia
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
      durationMinutes: eventType?.duracao_minutos || 30,
      bufferBeforeMinutes: eventType?.buffer_antes_minutos || 0,
      bufferAfterMinutes: eventType?.buffer_depois_minutos || 0,
      minNoticeHours: eventType?.antecedencia_min_horas ?? 0
    },
    parsedBookings,
    parsedBlocks
  );

  const formattedSlots = slots.map(s => ({
    start: s.start.toISOString(),
    end: s.end.toISOString(),
    time: format(s.start, 'HH:mm')
  }));

  return NextResponse.json({ 
    data: formattedSlots,
    available_times: formattedSlots.map(s => s.time),
    profissional_id: profId,
    event_type_id: eventTypeId || null
  });
}
