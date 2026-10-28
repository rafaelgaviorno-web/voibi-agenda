'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ChevronLeft, ChevronRight, Search, Plus } from 'lucide-react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import EventModal from './EventModal';
import CalendarSidePanel from './CalendarSidePanel';
import UnidadeSwitcher from '../UnidadeSwitcher';
import { saveAppointment, deleteAppointment } from './actions';
import '@/app/calendar.css';

const escapeHtml = (value: string) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// Fundo suave e 100% OPACO na cor do agendamento (evita transparência quando cards coincidem ou se sobrepõem)
const tint = (hex: string) => {
  if (!hex || hex === 'transparent') return 'transparent';
  return `color-mix(in srgb, ${hex} 18%, var(--vc-card-base, #ffffff))`;
};

export default function CalendarView({ rawEvents, profissionais: agendas, procedimentos, unidades, currentUnidadeId, baseUrl }: any) {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;
  const agendasParam = searchParams.get('agendas');
  
  const [localEvents, setLocalEvents] = useState(rawEvents);

  useEffect(() => {
    const syncFromStorage = () => {
      if (empresaId === 'mock-clinic') {
        const stored = JSON.parse(localStorage.getItem('voibi_mock_events') || '[]');
        const merged = [...rawEvents];
        stored.forEach((se: any) => {
          if (!merged.find(me => me.id === se.id)) {
            merged.push(se);
          }
        });
        setLocalEvents(merged);
      } else {
        setLocalEvents(rawEvents);
      }
    };

    // Inicial sync
    syncFromStorage();

    // Sincroniza em tempo real se a aba de agendamento for usada
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'voibi_mock_events') syncFromStorage();
    };
    
    window.addEventListener('storage', handleStorage);
    const handleCustomEvent = () => syncFromStorage();
    window.addEventListener('voibi_agendas_updated', handleCustomEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('voibi_agendas_updated', handleCustomEvent);
    };
  }, [rawEvents, empresaId]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventData, setSelectedEventData] = useState<any>(null);
  
  // Se houver parâmetro na URL, seleciona as agendas, caso contrário todas.
  // "none" é usado para quando todas as checkboxes estão desmarcadas.
  const getInitialAgendas = () => {
    if (agendasParam === 'none') return [];
    if (agendasParam) return agendasParam.split(',');
    return agendas.map((a: any) => a.id);
  };
  
  const [selectedAgendas, setSelectedAgendas] = useState<string[]>(getInitialAgendas());

  // Efeito para atualizar o filtro quando a URL muda
  useEffect(() => {
    setSelectedAgendas(getInitialAgendas());
  }, [agendasParam, agendas]);
  
  const [searchPatient, setSearchPatient] = useState('');
  const [calendarTitle, setCalendarTitle] = useState('');
  const [currentView, setCurrentView] = useState('resourceTimeGridDay');
  // Período visível no calendário (usado no título, no resumo e no mini calendário)
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);
  
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarInstance = useRef<any>(null);

  // (Removido toggleAgenda pois agora está na Sidebar Global)

  const handleSaveEvent = async (formData: any) => {
    // Atualização otimista no front-end para evitar que o card volte à posição original (snap back)
    if (formData.id) {
       const updated = localEvents.map((e: any) => e.id === formData.id ? {
         ...e,
         cliente: { nome: formData.nome, whatsapp: formData.whatsapp, telefone: formData.whatsapp },
         profissional: agendas.find((a: any) => a.id === formData.agendaId) || e.profissional,
         evento: procedimentos?.find((p: any) => p.id === formData.procedimentoId) || e.evento,
         inicio: `${formData.data}T${formData.horaInicio}:00`,
         fim: `${formData.data}T${formData.horaFim}:00`,
         observacao: formData.observacao,
         status: formData.status,
         status_atendimento: formData.status_atendimento,
         is_encaixe: formData.is_encaixe
       } : e);
       setLocalEvents(updated);
       
       if (empresaId === 'mock-clinic') {
         const stored = JSON.parse(localStorage.getItem('voibi_mock_events') || '[]');
         const updatedStored = stored.map((e: any) => e.id === formData.id ? updated.find((u: any) => u.id === formData.id) : e);
         localStorage.setItem('voibi_mock_events', JSON.stringify(updatedStored));
       }
    } else if (empresaId === 'mock-clinic') {
       const newEvent = {
         id: 'mock-' + Date.now(),
         cliente: { nome: formData.nome, whatsapp: formData.whatsapp },
         profissional: agendas.find((a: any) => a.id === formData.agendaId),
         evento: procedimentos?.find((p: any) => p.id === formData.procedimentoId),
         inicio: `${formData.data}T${formData.horaInicio}:00`,
         fim: `${formData.data}T${formData.horaFim}:00`,
         status: formData.status || 'pendente',
         status_atendimento: formData.status_atendimento || 'agendado',
         observacao: formData.observacao,
         is_encaixe: formData.is_encaixe
       };
       setLocalEvents((prev: any) => [...prev, newEvent]);
       
       const stored = JSON.parse(localStorage.getItem('voibi_mock_events') || '[]');
       stored.push(newEvent);
       localStorage.setItem('voibi_mock_events', JSON.stringify(stored));
    }

    if (empresaId !== 'mock-clinic') {
      // A server action chama revalidatePath, que já devolve a tela atualizada
      const res = await saveAppointment(formData, empresaId);
      if (!res.success) {
        const err = res.error as any;
        throw new Error(err?.message || err?.details || "Erro ao salvar no banco de dados.");
      }
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (empresaId === 'mock-clinic') {
      setLocalEvents((prev: any) => prev.filter((e: any) => e.id !== id));
      const stored = JSON.parse(localStorage.getItem('voibi_mock_events') || '[]');
      const filteredStored = stored.filter((e: any) => e.id !== id);
      localStorage.setItem('voibi_mock_events', JSON.stringify(filteredStored));
    } else {
      // Remove na hora; a server action revalida a página em seguida
      setLocalEvents((prev: any) => prev.filter((e: any) => e.id !== id));
      await deleteAppointment(id, empresaId);
    }
  };



    const activeAgendas = useMemo(() => {
    return agendas.filter((a: any) => selectedAgendas.includes(a.id));
  }, [agendas, selectedAgendas]);

  const resources = useMemo(() => {
    return activeAgendas.map((a: any) => {
      const businessHours = (a.disponibilidade || []).map((d: any) => ({
        daysOfWeek: [d.dia_semana],
        startTime: d.hora_inicio,
        endTime: d.hora_fim
      }));

      return {
        id: a.id,
        title: a.nome,
        businessHours: businessHours.length > 0 ? businessHours : undefined,
        extendedProps: {
          cor: a.cor || '#5271ff',
          unidade_id: a.unidade_id
        }
      };
    });
  }, [activeAgendas]);

  const events = useMemo(() => {
    return localEvents
      .filter((e: any) => {
      // Filtrar por busca
      if (searchPatient && !e.cliente?.nome.toLowerCase().includes(searchPatient.toLowerCase())) return false;
      // Bloqueios globais não estão vinculados a um profissional específico, então não filtramos
      if (e.status === 'bloqueio' && !e.profissional) {
        // Bloqueio global passa no filtro
      } else if (e.status === 'bloqueio' && e.profissional) {
        if (!selectedAgendas.includes(e.profissional.id)) return false;
        // Na visão por recursos do Dia, cada bloqueio fica na coluna do seu profissional!
        // Na semana/mês compartilhada, só mostra se a agenda for a única selecionada
        if (currentView !== 'resourceTimeGridDay' && selectedAgendas.length !== 1) return false;
      } else if (!selectedAgendas.includes(e.profissional?.id)) {
        return false;
      }
      
      return true;
    })
    .map((e: any) => {
        const isBlock = e.status === 'bloqueio';
        const isGlobalBlock = isBlock && !e.profissional;

        const isCancelado = e.status === 'cancelado';
        const isPendente = e.status === 'pendente';
        const statusAtendimento = e.status_atendimento || 'agendado';

        const backgroundColor = 
          isBlock ? 'transparent' : // Bloqueios usam .vc-block (calendar.css)
          isCancelado ? '#64748b' : // Cinza escuro para cancelado
          statusAtendimento === 'aguardando' ? '#7c3aed' : // Roxo para aguardando atendimento
          statusAtendimento === 'atendido' ? '#16a34a' :
          statusAtendimento === 'faltou' ? '#dc2626' :
          statusAtendimento === 'reagendou' ? '#ea580c' :
          isPendente ? '#d97706' : // Âmbar para pendente
          e.profissional?.cor || e.agendaCor || '#4285f4';

        return {
          id: e.id,
          resourceId: isGlobalBlock ? undefined : (e.profissional?.id || undefined),
          resourceIds: isGlobalBlock ? activeAgendas.map((a: any) => a.id) : undefined,
          title: isBlock ? (e.observacao || 'Bloqueio') : (e.cliente?.nome || e.nome || 'Agendamento'),
          start: e.start || e.inicio,
          end: e.end || e.fim,
          // Bloqueios ficam no fundo da coluna e não dividem a largura com os agendamentos
          display: isBlock ? 'background' : 'block',
          backgroundColor: isBlock ? backgroundColor : tint(backgroundColor),
          borderColor: isBlock ? 'transparent' : 'var(--vc-card-border, rgba(18, 19, 31, 0.08))',
          classNames: isBlock ? ['vc-block', isGlobalBlock ? 'vc-block-global' : ''] : [],
          extendedProps: {
            color: backgroundColor,
            whatsapp: e.cliente?.whatsapp || e.cliente?.telefone || '',
            servico: e.evento?.nome || e.servico || '',
            status: e.status || 'pendente',
            status_atendimento: statusAtendimento,
            is_encaixe: e.is_encaixe || false
          }
        };
    });
  }, [localEvents, searchPatient, selectedAgendas, activeAgendas, currentView]);

  const minInterval = useMemo(() => {
    const active = agendas.filter((a: any) => selectedAgendas.includes(a.id));
    if (active.length === 0) return 30;
    return Math.min(...active.map((a: any) => a.intervalo_minutos || 30));
  }, [agendas, selectedAgendas]);

  // Faixa de horários do calendário: do início mais cedo ao fim mais tarde das agendas marcadas.
  // Agendamentos fora do expediente (encaixes) no período aberto ampliam a faixa para não sumirem.
  const slotRange = useMemo(() => {
    const toMin = (t: string) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
    let min = Infinity, max = -Infinity;
    agendas
      .filter((a: any) => selectedAgendas.includes(a.id))
      .forEach((a: any) => (a.disponibilidade || []).forEach((d: any) => {
        min = Math.min(min, toMin(d.hora_inicio));
        max = Math.max(max, toMin(d.hora_fim));
      }));
    if (visibleRange) {
      localEvents.forEach((e: any) => {
        if (e.status === 'bloqueio' || !selectedAgendas.includes(e.profissional?.id)) return;
        const start = new Date(e.inicio), end = new Date(e.fim);
        if (start < visibleRange.start || start >= visibleRange.end) return;
        min = Math.min(min, start.getHours() * 60 + start.getMinutes());
        const endMin = end.getHours() * 60 + end.getMinutes();
        max = Math.max(max, endMin === 0 ? 24 * 60 : endMin);
      });
    }
    if (!isFinite(min) || !isFinite(max) || max <= min) return { start: '07:00:00', end: '20:00:00' };
    const hour = (m: number) => `${String(m / 60).padStart(2, '0')}:00:00`;
    return { start: hour(Math.floor(min / 60) * 60), end: hour(Math.min(24 * 60, Math.ceil(max / 60) * 60)) };
  }, [agendas, selectedAgendas, localEvents, visibleRange]);

  // Valores atuais para os callbacks do FullCalendar, que é criado uma única vez
  const latestRef = useRef<any>({});
  latestRef.current = { events, localEvents, agendas, selectedAgendas, handleSaveEvent, isModalOpen };

  useEffect(() => {
    if (!calendarRef.current) return;

    const calendar = new Calendar(calendarRef.current, {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: currentView,
      headerToolbar: false, // Desabilitar toolbar nativa
      locale: 'pt-br',
      events: events,
      eventDisplay: 'block',
      slotEventOverlap: false,
      height: '100%',
      slotMinTime: slotRange.start,
      slotMaxTime: slotRange.end,
      slotLabelInterval: '01:00:00',
      slotDuration: minInterval <= 15 ? '00:15:00' : (minInterval <= 20 ? '00:20:00' : '00:30:00'),
      eventMinHeight: 38,
      eventShortHeight: 32,
      allDaySlot: false,
      nowIndicator: true,
      dayHeaderFormat: { weekday: 'short', day: 'numeric', omitCommas: true },
      datesSet: (arg) => {
        setCalendarTitle(arg.view.title);
        setVisibleRange({ start: arg.view.currentStart, end: arg.view.currentEnd });
      },
      resourceLabelContent: (arg: any) => {
        const name = escapeHtml(arg.resource.title || 'Profissional');
        const cor = escapeHtml(arg.resource.extendedProps?.cor || '#5271ff');
        const cleanName = name.replace(/^(Dr\.|Dra\.|Prof\.)\s+/i, '');
        const parts = cleanName.split(' ').filter(Boolean);
        const initials = (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : cleanName.slice(0, 2)).toUpperCase();

        return {
          html: `
            <div class="vc-resource-head">
              <div class="vc-resource-avatar" style="background:${cor}">
                <span>${initials}</span>
              </div>
              <span class="vc-resource-name" title="${name}">${name}</span>
            </div>
          `
        };
      },
      dayHeaderContent: (arg) => {
        if (arg.view.type === 'resourceTimeGridDay') {
          return { html: '' };
        }
        const isMonthView = arg.view.type === 'dayGridMonth';
        const textStr = arg.text.split(' ');
        const weekday = textStr[0];
        const dayNum = textStr.length > 1 ? textStr[1] : '';
        
        if (isMonthView) {
          return { html: `<div class="vc-dayhead"><span class="vc-dow">${weekday}</span></div>` };
        }

        return {
          html: `<div class="vc-dayhead">
                   <span class="vc-dow">${weekday}</span>
                   <span class="vc-daynum${arg.isToday ? ' is-today' : ''}">${dayNum}</span>
                 </div>`
        };
      },
      eventContent: (arg) => {
        const title = escapeHtml(arg.event.title);

        if (arg.event.extendedProps.status === 'bloqueio') {
          return { html: `<div class="vc-block-label">${title}</div>` };
        }

        const start = arg.event.start;
        const end = arg.event.end;
        const durationMins = (end && start) ? (end.valueOf() - start.valueOf()) / 60000 : 60;
        
        const statusAgendamento = arg.event.extendedProps.status || 'pendente';
        const statusAtendimento = arg.event.extendedProps.status_atendimento || 'agendado';
        const servico = escapeHtml(arg.event.extendedProps.servico || 'Agendamento');
        
        const tooltipText = escapeHtml(`Paciente: ${arg.event.title}
Agendamento: ${statusAgendamento.toUpperCase()}
Atendimento: ${statusAtendimento.toUpperCase()}
WhatsApp: ${arg.event.extendedProps.whatsapp || 'Não informado'}
Procedimento: ${arg.event.extendedProps.servico || 'Agendamento'}
Horário: ${arg.timeText}`);

        const isCancelado = statusAgendamento === 'cancelado';
        const isPendente = statusAgendamento === 'pendente';
        const textStyle = isCancelado ? 'line-through opacity-75' : '';
        const color = escapeHtml(arg.event.extendedProps.color || '#5271ff');
        const dot = `<i class="vc-dot" style="background:${color}"></i>`;

        // Visualização limpa em visualização de mês
        if (arg.view.type === 'dayGridMonth') {
          return {
            html: `
              <div title="${tooltipText}" class="vc-month-event">
                ${dot}
                <span class="vc-month-time">${arg.timeText}</span>
                <span class="vc-month-title ${textStyle}">${title}</span>
              </div>
            `
          };
        }

        const pill = (label: string, dot: string, extra = '') =>
          `<span class="vc-pill ${extra}"><i style="background:${dot}"></i>${label}</span>`;

        const badges: string[] = [];
        if (arg.event.extendedProps.is_encaixe) badges.push(pill('Encaixe', '#eab308'));
        if (isPendente) badges.push(pill('Pendente', '#f59e0b'));
        else if (isCancelado) badges.push(pill('Cancelado', '#71717a'));
        else badges.push(pill('Confirmado', '#10b981'));

        // Exibe SEMPRE a badge do status de atendimento
        if (statusAtendimento === 'aguardando') badges.push(pill('Aguardando', '#8b5cf6', 'is-pulsing'));
        else if (statusAtendimento === 'atendido') badges.push(pill('Atendido', '#10b981'));
        else if (statusAtendimento === 'faltou') badges.push(pill('Faltou', '#ef4444'));
        else if (statusAtendimento === 'reagendou') badges.push(pill('Reagendou', '#f97316'));
        else badges.push(pill('Agendado', '#5271ff'));

        const badgesHtml = `<div class="vc-pills">${badges.join('')}</div>`;

        if (durationMins <= 30) {
          return {
            html: `
              <div title="${tooltipText}" class="vc-event is-short">
                <div class="vc-event-title ${textStyle}">${dot}${title}</div>
                ${badgesHtml}
              </div>
            `
          };
        }

        return {
          html: `
            <div title="${tooltipText}" class="vc-event">
              <div class="vc-event-time">${dot}${arg.timeText}</div>
              <div class="vc-event-title ${textStyle}">${title}</div>
              <div class="vc-event-meta">${servico}</div>
              ${badgesHtml}
            </div>
          `
        };
      },
      eventClick: (info) => {
        const original = latestRef.current.localEvents.find((e:any) => String(e.id) === String(info.event.id));
        if(original && original.status !== 'bloqueio') {
          setSelectedEventData({
            ...original,
            agendaId: (info as any).newResource?.id || original.profissional?.id,
            observacao: original.observacao
          });
          setIsModalOpen(true);
        }
      },
      dateClick: (info) => {
        const clickedTime = info.date.getTime();
        
        // Verificar se clicou em cima de um bloqueio visível
        const { events, agendas, selectedAgendas } = latestRef.current;
        const isBlocked = events.some((e:any) => {
          if (e.extendedProps?.status !== 'bloqueio') return false;
          
          const start = new Date(e.start).getTime();
          const end = new Date(e.end).getTime();
          // Verifica se o tempo clicado cai dentro do bloqueio
          return clickedTime >= start && clickedTime < end;
        });

        if (isBlocked) {
          alert('Este horário está bloqueado e não permite novos agendamentos.');
          return;
        }

        const dateObj = info.date;
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const mins = String(dateObj.getMinutes()).padStart(2, '0');
        
        const targetAgendaId = (info as any).resource?.id || (agendas.length === 1 ? agendas[0].id : (selectedAgendas.length === 1 ? selectedAgendas[0] : ''));
        const targetAgenda = agendas.find((a: any) => a.id === targetAgendaId);
        const slotMinutes = targetAgenda?.intervalo_minutos || 30;

        const endDt = new Date(dateObj.getTime() + slotMinutes * 60000);
        const endHours = String(endDt.getHours()).padStart(2, '0');
        const endMins = String(endDt.getMinutes()).padStart(2, '0');
        
        const inicioIso = `${year}-${month}-${day}T${hours}:${mins}:00`;
        const fimIso = `${year}-${month}-${day}T${endHours}:${endMins}:00`;

        setSelectedEventData({
          id: '',
          inicio: inicioIso,
          fim: fimIso,
          agendaId: targetAgendaId
        });
        setIsModalOpen(true);
      },
      editable: true, // Habilita Drag and Drop
      eventOverlap: (stillEvent) => {
        // Não permite sobrepor (arrastar) eventos para cima de um bloqueio
        return stillEvent.extendedProps?.status !== 'bloqueio';
      },
      eventDrop: async (info) => {
        const eventId = info.event.id;
        const original = latestRef.current.localEvents.find((e:any) => String(e.id) === String(eventId));
        if (original && info.event.start && info.event.end) {
           const adjustedData = `${info.event.start.getFullYear()}-${String(info.event.start.getMonth()+1).padStart(2,'0')}-${String(info.event.start.getDate()).padStart(2,'0')}`;
           const adjustedHoraInicio = `${String(info.event.start.getHours()).padStart(2,'0')}:${String(info.event.start.getMinutes()).padStart(2,'0')}`;
           const adjustedHoraFim = `${String(info.event.end.getHours()).padStart(2,'0')}:${String(info.event.end.getMinutes()).padStart(2,'0')}`;

           const formData = {
             id: original.id,
             clienteId: original.cliente?.id,
             nome: original.cliente?.nome,
             whatsapp: original.cliente?.whatsapp || original.cliente?.telefone,
             data: adjustedData,
             horaInicio: adjustedHoraInicio,
             horaFim: adjustedHoraFim,
             agendaId: (info as any).newResource?.id || original.profissional?.id,
             procedimentoId: original.evento?.id,
             observacao: original.observacao,
             status: original.status,
             status_atendimento: original.status_atendimento,
             is_encaixe: original.is_encaixe
           };
           await latestRef.current.handleSaveEvent(formData);
        }
      },
      eventResize: async (info) => {
        const eventId = info.event.id;
        const original = latestRef.current.localEvents.find((e:any) => String(e.id) === String(eventId));
        if (original && info.event.start && info.event.end) {
           const adjustedData = `${info.event.start.getFullYear()}-${String(info.event.start.getMonth()+1).padStart(2,'0')}-${String(info.event.start.getDate()).padStart(2,'0')}`;
           const adjustedHoraInicio = `${String(info.event.start.getHours()).padStart(2,'0')}:${String(info.event.start.getMinutes()).padStart(2,'0')}`;
           const adjustedHoraFim = `${String(info.event.end.getHours()).padStart(2,'0')}:${String(info.event.end.getMinutes()).padStart(2,'0')}`;

           const formData = {
             id: original.id,
             clienteId: original.cliente?.id,
             nome: original.cliente?.nome,
             whatsapp: original.cliente?.whatsapp || original.cliente?.telefone,
             data: adjustedData,
             horaInicio: adjustedHoraInicio,
             horaFim: adjustedHoraFim,
             agendaId: original.profissional?.id,
             procedimentoId: original.evento?.id,
             observacao: original.observacao,
             status: original.status,
             status_atendimento: original.status_atendimento,
             is_encaixe: original.is_encaixe
           };
           await latestRef.current.handleSaveEvent(formData);
        }
      }
    });

    calendar.render();
    calendarInstance.current = calendar;

    return () => calendar.destroy();
    // Criado uma vez: as atualizações abaixo mantêm a semana e a rolagem atuais
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const calendar = calendarInstance.current;
    if (!calendar) return;
    calendar.setOption('resources', resources);
  }, [resources]);

  // Atualiza os eventos no calendário existente, sem recriá-lo
  useEffect(() => {
    const calendar = calendarInstance.current;
    if (!calendar) return;
    calendar.batchRendering(() => {
      calendar.removeAllEventSources();
      calendar.addEventSource(events);
    });
  }, [events]);

  useEffect(() => {
    calendarInstance.current?.setOption('slotDuration', minInterval <= 15 ? '00:15:00' : (minInterval <= 20 ? '00:20:00' : '00:30:00'));
  }, [minInterval]);

  useEffect(() => {
    const calendar = calendarInstance.current;
    if (!calendar) return;
    calendar.setOption('slotMinTime', slotRange.start);
    calendar.setOption('slotMaxTime', slotRange.end);
  }, [slotRange.start, slotRange.end]);

  // Busca mudanças feitas fora desta tela (IA, n8n, página do paciente):
  // a cada 30s com a aba visível e ao voltar para a aba
  useEffect(() => {
    if (empresaId === 'mock-clinic') return;
    const refreshIfIdle = () => {
      if (document.visibilityState === 'visible' && !latestRef.current.isModalOpen) router.refresh();
    };
    const timer = setInterval(refreshIfIdle, 30000);
    document.addEventListener('visibilitychange', refreshIfIdle);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfIdle);
    };
  }, [empresaId, router]);


  const handlePrev = () => calendarInstance.current?.prev();
  const handleNext = () => calendarInstance.current?.next();
  const handleToday = () => calendarInstance.current?.today();
  const handleViewChange = (view: string) => {
    setCurrentView(view);
    calendarInstance.current?.changeView(view);
  };

  const views = [
    { value: 'resourceTimeGridDay', label: 'Dia' },
    { value: 'timeGridWeek', label: 'Semana' },
    { value: 'dayGridMonth', label: 'Mês' },
  ];

  const iconButton = 'w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors';
  const control = 'h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800';

  // Título do período no topo (ex: "Terça-feira, 27 de Outubro" no modo Dia ou "Outubro de 2026" na Semana/Mês)
  const monthTitle = visibleRange
    ? (() => {
        if (currentView === 'resourceTimeGridDay') {
          const d = visibleRange.start;
          const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
          const day = d.getDate();
          const month = d.toLocaleDateString('pt-BR', { month: 'long' });
          const year = d.getFullYear();
          const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
          return `${capWeekday}, ${day} de ${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`;
        }
        const t = visibleRange.start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return t.charAt(0).toUpperCase() + t.slice(1);
      })()
    : '';
  const periodSummary = useMemo(() => {
    if (!visibleRange) return null;
    const inRange = localEvents.filter((e: any) => {
      if (e.status === 'bloqueio' || e.status === 'cancelado') return false;
      if (!selectedAgendas.includes(e.profissional?.id)) return false;
      const start = new Date(e.inicio || e.start);
      return start >= visibleRange.start && start < visibleRange.end;
    });
    return { total: inRange.length, pending: inRange.filter((e: any) => e.status === 'pendente').length };
  }, [localEvents, selectedAgendas, visibleRange]);

  const openEvent = (original: any) => {
    setSelectedEventData({ ...original, agendaId: original.profissional?.id, observacao: original.observacao });
    setIsModalOpen(true);
  };

  const confirmEvent = (original: any) => {
    const start = new Date(original.inicio);
    const end = new Date(original.fim);
    const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return handleSaveEvent({
      id: original.id,
      clienteId: original.cliente?.id,
      nome: original.cliente?.nome,
      whatsapp: original.cliente?.whatsapp || original.cliente?.telefone,
      data: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
      horaInicio: hhmm(start),
      horaFim: hhmm(end),
      agendaId: original.profissional?.id,
      procedimentoId: original.evento?.id,
      observacao: original.observacao,
      status: 'confirmado',
      status_atendimento: original.status_atendimento,
      is_encaixe: original.is_encaixe
    });
  };

  return (
    <div className="flex flex-col h-screen w-full font-sans text-sm bg-zinc-100 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 gap-5 p-4 lg:px-7 lg:py-6">

      {/* Cabeçalho */}
      <header className="flex flex-wrap items-end gap-x-4 gap-y-3 shrink-0">
        <div className="min-w-0 mr-auto flex items-end gap-x-5 gap-y-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-extrabold tracking-tight text-zinc-900 dark:text-white truncate">
            {monthTitle || ' '}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 truncate">
            {calendarTitle}
            {periodSummary && (
              <>
                {' · '}{periodSummary.total} {periodSummary.total === 1 ? 'agendamento' : 'agendamentos'}
                {periodSummary.pending > 0 && <> · {periodSummary.pending} aguardando confirmação</>}
              </>
            )}
          </p>
        </div>

        <UnidadeSwitcher unidades={unidades} currentUnidadeId={currentUnidadeId} baseUrl={baseUrl} />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className={`relative hidden md:flex items-center w-56 px-3 gap-2 ${control}`}>
            <Search className="text-zinc-400 w-4 h-4 pointer-events-none shrink-0" />
            <input
              type="text"
              placeholder="Buscar paciente"
              className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
              value={searchPatient}
              onChange={e => setSearchPatient(e.target.value)}
            />
          </label>

          <div className={`flex items-center px-1 ${control}`}>
            <button onClick={handlePrev} className={iconButton} title="Anterior" aria-label="Anterior">
              <ChevronLeft size={17} />
            </button>
            <button
              onClick={handleToday}
              className="h-8 px-2.5 rounded-lg text-sm font-bold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Hoje
            </button>
            <button onClick={handleNext} className={iconButton} title="Próximo" aria-label="Próximo">
              <ChevronRight size={17} />
            </button>
          </div>

          <div className={`flex items-center p-1 ${control}`} role="tablist">
            {views.map(v => (
              <button
                key={v.value}
                role="tab"
                aria-selected={currentView === v.value}
                onClick={() => handleViewChange(v.value)}
                className={`h-full px-3.5 rounded-lg text-[13px] transition-all ${
                  currentView === v.value
                    ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setSelectedEventData(null); setIsModalOpen(true); }}
            className="h-10 flex items-center gap-1.5 px-4 bg-brand-600 hover:bg-brand-700 dark:bg-brand-400 dark:hover:bg-brand-300 text-white dark:text-zinc-950 rounded-xl text-sm font-bold shadow-lg shadow-brand-600/25 whitespace-nowrap transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Novo agendamento
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 gap-5">
        {/* Grade do Calendário */}
        <div className="flex-1 min-w-0 relative z-0 rounded-[20px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_1px_2px_rgba(18,19,31,0.04),0_12px_32px_-16px_rgba(18,19,31,0.16)] dark:shadow-none overflow-hidden">
          <div ref={calendarRef} className="absolute inset-0"></div>
        </div>

        <CalendarSidePanel
          localEvents={localEvents}
          selectedAgendas={selectedAgendas}
          visibleRange={visibleRange}
          isMonthView={currentView === 'dayGridMonth'}
          onGoToDate={(date: Date) => calendarInstance.current?.gotoDate(date)}
          onOpenEvent={openEvent}
          onConfirm={confirmEvent}
        />
      </div>

      {/* Modal de Eventos */}
      <EventModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedEventData(null); }}
        event={selectedEventData}
        agendas={agendas}
        procedimentos={procedimentos}
        localEvents={localEvents}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}

