'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

// Painel ao lado do calendário: mini calendário do mês, agendamentos pendentes e próximos bloqueios.
// Tudo vem dos mesmos eventos do calendário, respeitando as agendas marcadas no menu.

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

const card = 'rounded-[20px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_1px_2px_rgba(18,19,31,0.04),0_12px_32px_-16px_rgba(18,19,31,0.16)] dark:shadow-none';

export default function CalendarSidePanel({
  localEvents,
  selectedAgendas,
  visibleRange,
  isMonthView,
  onGoToDate,
  onOpenEvent,
  onConfirm,
}: {
  localEvents: any[];
  selectedAgendas: string[];
  visibleRange: { start: Date; end: Date } | null;
  isMonthView: boolean;
  onGoToDate: (date: Date) => void;
  onOpenEvent: (event: any) => void;
  onConfirm: (event: any) => Promise<void>;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mês exibido no mini calendário acompanha o período aberto no calendário
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  useEffect(() => {
    if (visibleRange) setMonth(new Date(visibleRange.start.getFullYear(), visibleRange.start.getMonth(), 1));
  }, [visibleRange?.start?.getTime()]);

  const [confirming, setConfirming] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      localEvents.filter((e: any) => {
        if (e.status === 'bloqueio') return !e.profissional || selectedAgendas.includes(e.profissional.id);
        return selectedAgendas.includes(e.profissional?.id);
      }),
    [localEvents, selectedAgendas]
  );

  const daysWithAppointments = useMemo(() => {
    const set = new Set<string>();
    visible.forEach((e: any) => {
      if (e.status === 'bloqueio' || e.status === 'cancelado') return;
      set.add(dayKey(new Date(e.inicio || e.start)));
    });
    return set;
  }, [visible]);

  const cells = useMemo(() => {
    const first = new Date(month);
    const lead = first.getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const total = Math.ceil((lead + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const n = i - lead + 1;
      return n >= 1 && n <= daysInMonth ? new Date(month.getFullYear(), month.getMonth(), n) : null;
    });
  }, [month]);

  const pending = useMemo(
    () =>
      visible
        .filter((e: any) => e.status === 'pendente' && new Date(e.inicio) >= today)
        .sort((a: any, b: any) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()),
    [visible]
  );

  const blocks = useMemo(
    () =>
      visible
        .filter((e: any) => e.status === 'bloqueio' && new Date(e.fim) >= today)
        .sort((a: any, b: any) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
        .slice(0, 4),
    [visible]
  );

  const blockWhen = (b: any) => {
    const start = new Date(b.inicio);
    const end = new Date(b.fim);
    const fullDay = start.getHours() === 0 && start.getMinutes() === 0 && end.getTime() - start.getTime() >= 23 * 3600000;
    if (fullDay && !sameDay(start, new Date(end.getTime() - 60000))) return `${ddmm(start)} a ${ddmm(new Date(end.getTime() - 60000))}`;
    if (fullDay) return 'Dia inteiro';
    return `${hhmm(start)} – ${hhmm(end)}`;
  };

  const handleConfirm = async (e: any) => {
    setConfirming(e.id);
    try {
      await onConfirm(e);
    } catch (err: any) {
      alert(err?.message || 'Não foi possível confirmar o agendamento.');
    } finally {
      setConfirming(null);
    }
  };

  const monthLabel = (() => {
    const t = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1).replace(' de ', ' ');
  })();

  return (
    <aside className="hidden xl:flex w-[300px] shrink-0 flex-col gap-4 overflow-y-auto pb-1">
      {/* Mini calendário */}
      <section className={`${card} p-4`} aria-label="Mês">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[15px] font-extrabold text-zinc-900 dark:text-white">{monthLabel}</h2>
          <div className="flex">
            <button
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Próximo mês"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-y-0.5 text-center">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="text-[10.5px] font-bold text-zinc-500 dark:text-zinc-400 pb-1">{w}</span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const isToday = sameDay(d, today);
            const inRange = !isMonthView && !!visibleRange && d >= visibleRange.start && d < visibleRange.end;
            const rangeStart = inRange && sameDay(d, visibleRange!.start);
            const rangeEnd = inRange && sameDay(d, new Date(visibleRange!.end.getTime() - 1));
            const hasEvents = daysWithAppointments.has(dayKey(d));
            return (
              <span
                key={i}
                className={`h-8 flex items-center justify-center ${inRange ? 'bg-brand-50 dark:bg-brand-500/15' : ''} ${rangeStart ? 'rounded-l-[10px]' : ''} ${rangeEnd ? 'rounded-r-[10px]' : ''}`}
              >
                <button
                  onClick={() => onGoToDate(d)}
                  className={`w-[30px] h-[30px] rounded-[9px] flex flex-col items-center justify-center text-[12.5px] leading-none transition-colors ${
                    isToday
                      ? 'bg-brand-600 dark:bg-brand-400 text-white dark:text-zinc-950 font-extrabold'
                      : `${inRange ? 'font-extrabold text-zinc-900 dark:text-white' : d < today ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-700 dark:text-zinc-200'} hover:bg-zinc-100 dark:hover:bg-zinc-800`
                  }`}
                  aria-label={d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                >
                  {d.getDate()}
                  <span className={`w-1 h-1 mt-0.5 rounded-full ${hasEvents ? (isToday ? 'bg-white dark:bg-zinc-950' : 'bg-brand-500') : 'bg-transparent'}`} />
                </button>
              </span>
            );
          })}
        </div>
      </section>

      {/* Aguardando confirmação */}
      <section className={`${card} p-[18px] flex flex-col gap-3`}>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-zinc-900 dark:text-white">Aguardando confirmação</h2>
          {pending.length > 0 && (
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
              {pending.length}
            </span>
          )}
        </div>
        {pending.length === 0 ? (
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400">Nenhum agendamento pendente. Tudo confirmado.</p>
        ) : (
          pending.slice(0, 5).map((e: any) => {
            const start = new Date(e.inicio);
            return (
              <div key={e.id} className="flex items-center gap-2.5 p-2.5 pl-3 rounded-[14px] bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800">
                <span className="w-2 h-2 shrink-0 rounded-full" style={{ background: e.profissional?.cor || '#5271ff' }} />
                <button onClick={() => onOpenEvent(e)} className="min-w-0 flex-1 text-left">
                  <span className="block text-[13.5px] font-extrabold text-zinc-900 dark:text-white truncate">{e.cliente?.nome || 'Paciente'}</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {WEEKDAY_SHORT[start.getDay()]} {start.getDate()}, {hhmm(start)}{e.evento?.nome ? ` · ${e.evento.nome}` : ''}
                  </span>
                </button>
                <button
                  onClick={() => handleConfirm(e)}
                  disabled={confirming === e.id}
                  className="h-8 px-2.5 shrink-0 rounded-[9px] bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 text-[12.5px] font-extrabold hover:bg-brand-100 dark:hover:bg-brand-500/25 disabled:opacity-60 flex items-center gap-1"
                >
                  {confirming === e.id && <Loader2 size={12} className="animate-spin" />}
                  Confirmar
                </button>
              </div>
            );
          })
        )}
        {pending.length > 5 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">E mais {pending.length - 5} pendentes nos próximos dias.</p>
        )}
      </section>

      {/* Próximos bloqueios */}
      <section className={`${card} p-[18px] flex flex-col gap-3`}>
        <h2 className="text-[15px] font-extrabold text-zinc-900 dark:text-white">Próximos bloqueios</h2>
        {blocks.length === 0 ? (
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400">Nenhum feriado ou bloqueio pela frente.</p>
        ) : (
          blocks.map((b: any) => {
            const start = new Date(b.inicio);
            return (
              <button key={b.id} onClick={() => onGoToDate(start)} className="flex items-center gap-3 text-left">
                <span className="w-11 h-11 shrink-0 rounded-xl flex flex-col items-center justify-center leading-tight bg-[repeating-linear-gradient(135deg,#f4f5fa_0_8px,#eaecf4_8px_16px)] dark:bg-[repeating-linear-gradient(135deg,#15172b_0_8px,#1b1e36_8px_16px)]">
                  <span className="text-[10px] font-extrabold uppercase text-zinc-500 dark:text-zinc-400">{WEEKDAY_SHORT[start.getDay()]}</span>
                  <span className="text-base font-extrabold text-zinc-900 dark:text-white">{start.getDate()}</span>
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-extrabold text-zinc-900 dark:text-white truncate">{b.observacao || 'Bloqueio'}</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {blockWhen(b)} · {b.profissional?.nome || 'Todas as agendas'}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </section>
    </aside>
  );
}
