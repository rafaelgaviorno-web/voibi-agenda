import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { getAvailableSlots } from '@/lib/availability/engine';
import { parseISO, startOfDay, endOfDay, format } from 'date-fns';
import { withApiLogger } from '@/lib/api-logger';

export const GET = withApiLogger(async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const eventTypeId = searchParams.get('event_type_id') || searchParams.get('tipo_evento_id') || searchParams.get('procedimento_id');
  const profissionalParam = searchParams.get('profissional_id') || 
                            searchParams.get('agenda_id') || 
                            searchParams.get('profissional') || 
                            searchParams.get('agenda') || 
                            searchParams.get('profissional_nome') || 
                            searchParams.get('agenda_nome') ||
                            searchParams.get('doutor') ||
                            searchParams.get('medico');

  const periodoParam = searchParams.get('periodo') || searchParams.get('turno') || searchParams.get('horario');
  let rawDateStr = searchParams.get('date') || searchParams.get('data') || searchParams.get('dia');

  if (!rawDateStr) {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    rawDateStr = format(amanha, 'yyyy-MM-dd');
  }

  // Se vier no formato brasileiro DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDateStr.trim())) {
    const [d, m, y] = rawDateStr.trim().split('/');
    rawDateStr = `${y}-${m}-${d}`;
  }

  const dateStr = rawDateStr.trim().split('T')[0];
  const supabase = getServiceSupabase();
  const date = parseISO(dateStr);

  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Data inválida. Use o formato YYYY-MM-DD ou DD/MM/YYYY.' }, { status: 400 });
  }

  // Evita drift de fuso horário pegando dia da semana local de forma segura
  const [y, m, d] = dateStr.split('-').map(Number);
  const safeDate = new Date(y, m - 1, d, 12, 0, 0);
  const dayOfWeek = safeDate.getDay(); // 0 = Domingo, 6 = Sábado

  let eventType: { id?: string; duracao_minutos?: number; buffer_antes_minutos?: number; buffer_depois_minutos?: number; antecedencia_min_horas?: number; profissional_id?: string | null } | null = null;
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
    const { resolveProfissional } = await import('@/lib/agenda-resolver');
    resolvedProf = await resolveProfissional(supabase, auth.empresa.id, profissionalParam);
  }

  // Fallback 1: se o procedimento possui um profissional fixo associado
  if (!resolvedProf && eventType?.profissional_id) {
    const { resolveProfissional } = await import('@/lib/agenda-resolver');
    resolvedProf = await resolveProfissional(supabase, auth.empresa.id, eventType.profissional_id);
  }

  // Se nenhum profissional específico foi solicitado, buscamos horários em TODAS as agendas da clínica
  if (!resolvedProf) {
    const { data: allProfs } = await supabase
      .from('agend_profissionais')
      .select('id, nome, cor')
      .eq('empresa_id', auth.empresa.id)
      .order('nome', { ascending: true });

    if (!allProfs || allProfs.length === 0) {
      const semAgendaMsg = 'Nenhuma agenda encontrada para esta clínica';
      return NextResponse.json({ 
        text: semAgendaMsg,
        message: semAgendaMsg,
        content: semAgendaMsg,
        result: semAgendaMsg,
        response: semAgendaMsg,
        resposta: semAgendaMsg,
        horarios: semAgendaMsg,
        data: [], 
        available_times: [],
        agendas_disponiveis: [],
        date: dateStr 
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
    const sugestoes = pickThreeSuggestions(sortedTimes, periodoParam);
    const sugestoesTexto = formatSuggestionsText(sugestoes);
    const inlineTexto = formatSuggestionsInline(sugestoes);

    if (searchParams.get('format') === 'text' || request.headers.get('accept')?.includes('text/plain')) {
      return new NextResponse(sugestoesTexto, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    return NextResponse.json({
      text: sugestoesTexto,
      message: sugestoesTexto,
      content: sugestoesTexto,
      result: sugestoesTexto,
      response: sugestoesTexto,
      resposta: sugestoesTexto,
      horarios: sugestoesTexto,
      horarios_inline: inlineTexto,
      sugestoes_texto: inlineTexto,
      data: allFormattedSlots,
      available_times: sortedTimes,
      horarios_disponiveis: sortedTimes,
      sugestoes,
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

  // Fallback padrão se nenhuma regra foi configurada:
  // Seg-Sex: 08h às 18h | Sábado: 08h às 12h
  if (regras.length === 0) {
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      regras = [{ hora_inicio: '08:00:00', hora_fim: '18:00:00' }];
    } else if (dayOfWeek === 6) {
      regras = [{ hora_inicio: '08:00:00', hora_fim: '12:00:00' }];
    }
  }

  if (regras.length === 0) {
    const semExpedienteMsg = 'Sem expediente para esta data. Por favor, escolha outro dia.';
    return NextResponse.json({ 
      text: semExpedienteMsg,
      message: semExpedienteMsg,
      content: semExpedienteMsg,
      result: semExpedienteMsg,
      response: semExpedienteMsg,
      resposta: semExpedienteMsg,
      horarios: semExpedienteMsg,
      data: [], 
      available_times: [],
      horarios_disponiveis: [],
      sugestoes: [],
      agenda: { id: resolvedProf.id, nome: resolvedProf.nome },
      date: dateStr
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

  const sortedTimes = formattedSlots.map(s => s.time);
  const sugestoes = pickThreeSuggestions(sortedTimes, periodoParam);
  const sugestoesTexto = formatSuggestionsText(sugestoes);
  const inlineTexto = formatSuggestionsInline(sugestoes);

  if (searchParams.get('format') === 'text' || request.headers.get('accept')?.includes('text/plain')) {
    return new NextResponse(sugestoesTexto, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  return NextResponse.json({ 
    text: sugestoesTexto,
    message: sugestoesTexto,
    content: sugestoesTexto,
    result: sugestoesTexto,
    response: sugestoesTexto,
    resposta: sugestoesTexto,
    horarios: sugestoesTexto,
    horarios_inline: inlineTexto,
    sugestoes_texto: inlineTexto,
    data: formattedSlots,
    available_times: sortedTimes,
    horarios_disponiveis: sortedTimes,
    sugestoes,
    agenda: {
      id: resolvedProf.id,
      nome: resolvedProf.nome
    },
    profissional_id: resolvedProf.id,
    event_type_id: eventType ? (eventType as any).id : null,
    date: dateStr
  });
});

function pickThreeSuggestions(times: string[], periodo?: string | null): string[] {
  let filtered = times;
  if (periodo) {
    const p = periodo.toLowerCase().trim();
    if (p.includes('tarde')) {
      const tardeTimes = times.filter(t => {
        const hour = parseInt(t.split(':')[0], 10);
        return hour >= 12 && hour < 19;
      });
      if (tardeTimes.length > 0) filtered = tardeTimes;
    } else if (p.includes('manha') || p.includes('manhã')) {
      const manhaTimes = times.filter(t => {
        const hour = parseInt(t.split(':')[0], 10);
        return hour < 12;
      });
      if (manhaTimes.length > 0) filtered = manhaTimes;
    } else if (p.includes('noite')) {
      const noiteTimes = times.filter(t => {
        const hour = parseInt(t.split(':')[0], 10);
        return hour >= 18;
      });
      if (noiteTimes.length > 0) filtered = noiteTimes;
    }
  }

  if (filtered.length <= 3) return filtered;
  const first = filtered[0];
  const mid = filtered[Math.floor(filtered.length / 2)];
  const last = filtered[filtered.length - 1];
  return Array.from(new Set([first, mid, last]));
}

function formatSuggestionsText(sugestoes: string[]): string {
  if (!sugestoes || sugestoes.length === 0) {
    return 'Não encontramos horários livres para este dia. Que tal tentarmos outro dia?';
  }
  return sugestoes.map(t => `• ${t}`).join('\n');
}

function formatSuggestionsInline(sugestoes: string[]): string {
  if (!sugestoes || sugestoes.length === 0) {
    return 'Nenhum horário disponível';
  }
  if (sugestoes.length === 1) return sugestoes[0];
  if (sugestoes.length === 2) return `${sugestoes[0]} ou ${sugestoes[1]}`;
  return `${sugestoes.slice(0, -1).join(', ')} ou ${sugestoes[sugestoes.length - 1]}`;
}
