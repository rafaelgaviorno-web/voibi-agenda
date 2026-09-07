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
  const profissionalParam = searchParams.get('profissional_id') || 
                            searchParams.get('agenda_id') || 
                            searchParams.get('profissional') || 
                            searchParams.get('agenda') || 
                            searchParams.get('profissional_nome') || 
                            searchParams.get('agenda_nome');
  const dateStr = searchParams.get('date');

  if (!dateStr) {
    return NextResponse.json({ error: 'date (YYYY-MM-DD) é obrigatório' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const date = parseISO(dateStr);
  const dayOfWeek = date.getDay(); // 0 = Domingo, 6 = Sábado

  let eventType: { duracao_minutos?: number; buffer_antes_minutos?: number; buffer_depois_minutos?: number; antecedencia_min_horas?: number; profissional_id?: string | null } | null = null;
  let resolvedProf: { id: string; nome: string } | null = null;

  // 1. Obter Event Type se informado
  if (eventTypeId) {
    const isEventUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventTypeId.trim());
    let evQuery = supabase.from('agend_tipos_evento').select('*').eq('empresa_id', auth.empresa.id);
    if (isEventUuid) {
      evQuery = evQuery.eq('id', eventTypeId.trim());
    } else {
      evQuery = evQuery.ilike('nome', `%${eventTypeId.trim()}%`);
    }

    const { data: ev } = await evQuery.limit(1).maybeSingle();
    if (ev) {
      eventType = ev;
    }
  }

  // 2. Resolver o Profissional / Agenda
  if (profissionalParam) {
    const cleanProf = profissionalParam.trim();
    const isProfUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanProf);

    if (isProfUuid) {
      const { data: p } = await supabase
        .from('agend_profissionais')
        .select('id, nome')
        .eq('id', cleanProf)
        .eq('empresa_id', auth.empresa.id)
        .maybeSingle();

      if (p) resolvedProf = p;
    } else {
      // Busca pelo NOME da agenda (ex: "Robson", "Dr. Teste 1")
      const { data: p } = await supabase
        .from('agend_profissionais')
        .select('id, nome')
        .eq('empresa_id', auth.empresa.id)
        .ilike('nome', `%${cleanProf}%`)
        .limit(1)
        .maybeSingle();

      if (p) resolvedProf = p;
    }
  }

  // Fallback 1: se o procedimento possui um profissional fixo associado
  if (!resolvedProf && eventType?.profissional_id) {
    const { data: p } = await supabase
      .from('agend_profissionais')
      .select('id, nome')
      .eq('id', eventType.profissional_id)
      .eq('empresa_id', auth.empresa.id)
      .maybeSingle();

    if (p) resolvedProf = p;
  }

  // Se nenhum profissional específico foi solicitado, buscamos horários em TODAS as agendas da clínica
  if (!resolvedProf) {
    const { data: allProfs } = await supabase
      .from('agend_profissionais')
      .select('id, nome, cor')
      .eq('empresa_id', auth.empresa.id)
      .order('nome', { ascending: true });

    if (!allProfs || allProfs.length === 0) {
      return NextResponse.json({ 
        data: [], 
        available_times: [],
        agendas_disponiveis: [],
        message: 'Nenhuma agenda encontrada para esta clínica' 
      });
    }

    const diaInicio = startOfDay(date).toISOString();
    const diaFim = endOfDay(date).toISOString();
    const minNotice = searchParams.get('respeitar_antecedencia') === 'true' 
      ? (eventType?.antecedencia_min_horas ?? 0) 
      : 0;

    const allFormattedSlots: { start: string; end: string; time: string; agenda: { id: string; nome: string } }[] = [];
    const agendasDisponiveis: { id: string; nome: string; available_times: string[] }[] = [];
    const allTimesSet = new Set<string>();

    for (const p of allProfs) {
      const { data: regrasData } = await supabase
        .from('agend_disponibilidade')
        .select('hora_inicio, hora_fim')
        .eq('profissional_id', p.id)
        .eq('dia_semana', dayOfWeek);

      let regras = regrasData || [];
      if (regras.length === 0 && dayOfWeek >= 1 && dayOfWeek <= 5) {
        regras = [{ hora_inicio: '08:00:00', hora_fim: '18:00:00' }];
      }

      if (regras.length === 0) continue;

      const { data: bookings } = await supabase
        .from('agend_agendamentos')
        .select('inicio, fim')
        .eq('profissional_id', p.id)
        .in('status', ['confirmado', 'remarcado'])
        .gte('inicio', diaInicio)
        .lte('fim', diaFim);

      const { data: blocks } = await supabase
        .from('agend_bloqueios')
        .select('inicio, fim')
        .eq('profissional_id', p.id)
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
          minNoticeHours: minNotice
        },
        parsedBookings,
        parsedBlocks
      );

      const profTimes = slots.map(s => format(s.start, 'HH:mm'));
      if (profTimes.length > 0) {
        profTimes.forEach(t => allTimesSet.add(t));
        slots.forEach(s => {
          allFormattedSlots.push({
            start: s.start.toISOString(),
            end: s.end.toISOString(),
            time: format(s.start, 'HH:mm'),
            agenda: { id: p.id, nome: p.nome }
          });
        });
        agendasDisponiveis.push({
          id: p.id,
          nome: p.nome,
          available_times: profTimes
        });
      }
    }

    const sortedTimes = Array.from(allTimesSet).sort();

    return NextResponse.json({
      data: allFormattedSlots,
      available_times: sortedTimes,
      agendas_disponiveis: agendasDisponiveis,
      date: dateStr,
      event_type_id: eventType ? (eventType as any).id : null
    });
  }

  const profId = resolvedProf.id;

  // 3. Obter Regras de Disponibilidade da Agenda
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
      agenda: { id: resolvedProf.id, nome: resolvedProf.nome },
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

  // Por padrão não bloqueamos artificialmente 24h na consulta em tempo real da IA, a não ser que pedido explicitamente
  const minNotice = searchParams.get('respeitar_antecedencia') === 'true' 
    ? (eventType?.antecedencia_min_horas ?? 0) 
    : 0;

  const slots = getAvailableSlots(
    date,
    mappedRegras,
    {
      durationMinutes: eventType?.duracao_minutos || 30,
      bufferBeforeMinutes: eventType?.buffer_antes_minutos || 0,
      bufferAfterMinutes: eventType?.buffer_depois_minutos || 0,
      minNoticeHours: minNotice
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
    agenda: {
      id: resolvedProf.id,
      nome: resolvedProf.nome
    },
    profissional_id: resolvedProf.id,
    event_type_id: eventType ? (eventType as any).id : null,
    date: dateStr
  });
}
