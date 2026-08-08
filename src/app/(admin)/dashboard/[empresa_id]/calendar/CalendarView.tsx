'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Menu, ChevronLeft, ChevronRight, Search, Plus } from 'lucide-react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import EventModal from './EventModal';
import { saveAppointment, deleteAppointment } from './actions';
import UnidadeSwitcher from '../UnidadeSwitcher';
import '@/app/calendar.css';

export default function CalendarView({ rawEvents, profissionais: agendas, procedimentos, unidades, currentUnidadeId, baseUrl }: any) {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const empresaId = params.empresa_id as string;
  const agendasParam = searchParams.get('agendas');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
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
  const [currentView, setCurrentView] = useState('timeGridWeek');
  
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarInstance = useRef<any>(null);

  // (Removido toggleAgenda pois agora está na Sidebar Global)

  const handleSaveEvent = async (formData: any) => {
    if (empresaId === 'mock-clinic') {
      if (formData.id) {
         const updated = localEvents.map((e: any) => e.id === formData.id ? {
           ...e,
           cliente: { nome: formData.nome, whatsapp: formData.whatsapp },
           profissional: agendas.find((a: any) => a.id === formData.agendaId),
           evento: procedimentos?.find((p: any) => p.id === formData.procedimentoId),
           inicio: `${formData.data}T${formData.horaInicio}:00`,
           fim: `${formData.data}T${formData.horaFim}:00`,
           observacao: formData.observacao,
           status: formData.status,
           is_encaixe: formData.is_encaixe
         } : e);
         setLocalEvents(updated);
         // Atualiza localStorage só com os que vieram do storage local
         const stored = JSON.parse(localStorage.getItem('voibi_mock_events') || '[]');
         const updatedStored = stored.map((e: any) => e.id === formData.id ? updated.find((u: any) => u.id === formData.id) : e);
         localStorage.setItem('voibi_mock_events', JSON.stringify(updatedStored));
      } else {
         const newEvent = {
           id: 'mock-' + Date.now(),
           cliente: { nome: formData.nome, whatsapp: formData.whatsapp },
           profissional: agendas.find((a: any) => a.id === formData.agendaId),
           evento: procedimentos?.find((p: any) => p.id === formData.procedimentoId),
           inicio: `${formData.data}T${formData.horaInicio}:00`,
           fim: `${formData.data}T${formData.horaFim}:00`,
           status: formData.status || 'confirmado',
           observacao: formData.observacao,
           is_encaixe: formData.is_encaixe
         };
         setLocalEvents((prev: any) => [...prev, newEvent]);
         
         const stored = JSON.parse(localStorage.getItem('voibi_mock_events') || '[]');
         stored.push(newEvent);
         localStorage.setItem('voibi_mock_events', JSON.stringify(stored));
      }
    } else {
      await saveAppointment(formData, empresaId);
      router.refresh();
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (empresaId === 'mock-clinic') {
      setLocalEvents((prev: any) => prev.filter((e: any) => e.id !== id));
      const stored = JSON.parse(localStorage.getItem('voibi_mock_events') || '[]');
      const filteredStored = stored.filter((e: any) => e.id !== id);
      localStorage.setItem('voibi_mock_events', JSON.stringify(filteredStored));
    } else {
      await deleteAppointment(id, empresaId);
      router.refresh();
    }
  };



  const events = useMemo(() => {
    return localEvents
      .filter((e: any) => {
      // Filtrar por busca
      if (searchPatient && !e.cliente?.nome.toLowerCase().includes(searchPatient.toLowerCase())) return false;
      // Bloqueios globais não estão vinculados a um profissional específico, então não filtramos
      if (e.status === 'bloqueio' && !e.profissional) {
        // passa no filtro de agenda, continua validando
      } else if (e.status === 'bloqueio' && e.profissional) {
        // Bloqueio Específico: só aparece se a agenda afetada for a única selecionada no filtro
        if (selectedAgendas.length !== 1 || !selectedAgendas.includes(e.profissional.id)) {
          return false;
        }
      } else if (!selectedAgendas.includes(e.profissional?.id)) {
        return false;
      }
      
      return true;
    })
    .map((e: any) => {
        const isBlock = e.status === 'bloqueio';
        const isGlobalBlock = isBlock && !e.profissional;

        const backgroundColor = 
          isGlobalBlock ? '#fee2e2' : // Fundo vermelho claro para bloqueio geral
          isBlock ? '#64748b' : // Cinza/grafite para bloqueio especifico
          e.status === 'atendido' ? '#16a34a' :
          e.status === 'faltou' ? '#dc2626' :
          e.status === 'reagendou' ? '#f97316' :
          e.profissional?.cor || e.agendaCor || '#4285f4';

        return {
          id: e.id,
          title: isBlock ? (e.observacao || 'Bloqueio') : (e.cliente?.nome || e.nome || 'Agendamento'),
          start: e.start || e.inicio,
          end: e.end || e.fim,
          display: 'block',
          backgroundColor,
          borderColor: backgroundColor,
          extendedProps: {
            whatsapp: e.cliente?.whatsapp || e.cliente?.telefone || '',
            servico: e.evento?.nome || e.servico || '',
            status: e.status,
            is_encaixe: e.is_encaixe || false
          }
        };
    });
  }, [localEvents, searchPatient, selectedAgendas]);

  useEffect(() => {
    if (!calendarRef.current) return;

    if (calendarInstance.current) {
       calendarInstance.current.destroy();
    }

    const calendar = new Calendar(calendarRef.current, {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: currentView,
      headerToolbar: false, // Desabilitar toolbar nativa
      locale: 'pt-br',
      events: events,
      eventDisplay: 'block',
      height: '100%',
      slotMinTime: '07:00:00',
      slotMaxTime: '20:00:00',
      slotLabelInterval: '01:00:00',
      allDaySlot: false,
      nowIndicator: true,
      dayHeaderFormat: { weekday: 'short', day: 'numeric', omitCommas: true },
      datesSet: (arg) => {
        setCalendarTitle(arg.view.title);
      },
      dayHeaderContent: (arg) => {
        const isMonthView = arg.view.type === 'dayGridMonth';
        const textStr = arg.text.split(' ');
        const weekday = textStr[0];
        const dayNum = textStr.length > 1 ? textStr[1] : '';
        
        if (isMonthView) {
          return {
            html: `<div style="display:flex; flex-direction:column; align-items:center; padding: 8px 0;">
                     <span style="font-size: 11px; text-transform: uppercase; color: #70757a; font-weight: 500;">${weekday}</span>
                   </div>`
          };
        }

        return {
          html: `<div style="display:flex; flex-direction:column; align-items:center; padding: 4px 0;">
                   <span style="font-size: 11px; text-transform: uppercase; color: #70757a; font-weight: 500; margin-bottom: 2px;">${weekday}</span>
                   <span style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 24px; color: ${arg.isToday ? '#fff' : '#3c4043'}; background-color: ${arg.isToday ? '#1a73e8' : 'transparent'}; margin:0 auto;">
                     ${dayNum}
                   </span>
                 </div>`
        };
      },
      eventContent: (arg) => {
        if (arg.event.extendedProps.status === 'bloqueio') {
          return { 
            html: `<div class="p-1 text-zinc-700 dark:text-zinc-300 font-bold text-[10px] uppercase text-center w-full h-full flex items-center justify-center bg-zinc-200/50 rounded-sm border border-zinc-300 dark:border-zinc-600 border-dashed" style="min-height: 24px;">
                     ${arg.event.title}
                   </div>` 
          };
        }

        const start = arg.event.start;
        const end = arg.event.end;
        const durationMins = (end && start) ? (end.valueOf() - start.valueOf()) / 60000 : 60;
        
        const tooltipText = `Paciente: ${arg.event.title}\nWhatsApp: ${arg.event.extendedProps.whatsapp || 'Não informado'}\nProcedimento: ${arg.event.extendedProps.servico || 'Agendamento'}\nHorário: ${arg.timeText}`;

        if (durationMins <= 30) {
          return {
            html: `
              <div title="${tooltipText}" class="px-1 py-0.5 leading-none text-white h-full flex flex-col justify-center overflow-hidden cursor-pointer relative">
                ${arg.event.extendedProps.is_encaixe ? '<div class="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-[8px] font-bold px-1 rounded-br-sm z-10" style="padding: 1px 3px;">ENCAIXE</div>' : ''}
                <div class="font-semibold text-[11px] truncate w-full mb-[2px] pl-${arg.event.extendedProps.is_encaixe ? '10' : '0'}">${arg.event.title} &bull; ${arg.event.extendedProps.whatsapp || 'S/Wpp'}</div>
                <div class="text-[10px] opacity-80 truncate w-full pl-${arg.event.extendedProps.is_encaixe ? '10' : '0'}">
                  ${arg.event.extendedProps.servico || 'Agendamento'}
                </div>
              </div>
            `
          };
        }

        return {
          html: `
            <div title="${tooltipText}" class="p-1 leading-tight text-white h-full flex flex-col justify-start overflow-hidden cursor-pointer relative">
              ${arg.event.extendedProps.is_encaixe ? '<div class="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1.5 py-0.5 rounded-br z-10">ENCAIXE</div>' : ''}
              <div class="font-semibold text-[13px] truncate pt-${arg.event.extendedProps.is_encaixe ? '3' : '0'}">${arg.event.title}</div>
              <div class="text-[11px] opacity-90 truncate flex items-center gap-1 mt-0.5">
                ${arg.event.extendedProps.whatsapp || 'S/ WhatsApp'}
              </div>
              <div class="text-[11px] opacity-75 truncate mt-0.5">
                ${arg.event.extendedProps.servico || 'Agendamento'}
              </div>
            </div>
          `
        };
      },
      eventClick: (info) => {
        const original = localEvents.find((e:any) => String(e.id) === String(info.event.id));
        if(original && original.status !== 'bloqueio') {
          setSelectedEventData({
            ...original,
            agendaId: original.profissional?.id,
            observacao: original.observacao
          });
          setIsModalOpen(true);
        }
      },
      dateClick: (info) => {
        const clickedTime = info.date.getTime();
        
        // Verificar se clicou em cima de um bloqueio visível
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
        
        const endDt = new Date(dateObj.getTime() + 30 * 60000);
        const endHours = String(endDt.getHours()).padStart(2, '0');
        const endMins = String(endDt.getMinutes()).padStart(2, '0');
        
        const inicioIso = `${year}-${month}-${day}T${hours}:${mins}:00`;
        const fimIso = `${year}-${month}-${day}T${endHours}:${endMins}:00`;

        setSelectedEventData({
          id: '',
          inicio: inicioIso,
          fim: fimIso,
          agendaId: agendas.length === 1 ? agendas[0].id : ''
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
        const original = localEvents.find((e:any) => String(e.id) === String(eventId));
        if (original && info.event.start && info.event.end) {
           const adjustedData = `${info.event.start.getFullYear()}-${String(info.event.start.getMonth()+1).padStart(2,'0')}-${String(info.event.start.getDate()).padStart(2,'0')}`;
           const adjustedHoraInicio = `${String(info.event.start.getHours()).padStart(2,'0')}:${String(info.event.start.getMinutes()).padStart(2,'0')}`;
           const adjustedHoraFim = `${String(info.event.end.getHours()).padStart(2,'0')}:${String(info.event.end.getMinutes()).padStart(2,'0')}`;

           const formData = {
             id: original.id,
             nome: original.cliente?.nome,
             whatsapp: original.cliente?.whatsapp,
             data: adjustedData,
             horaInicio: adjustedHoraInicio,
             horaFim: adjustedHoraFim,
             agendaId: original.profissional?.id,
             procedimentoId: original.evento?.id,
             observacao: original.observacao
           };
           await handleSaveEvent(formData);
        }
      },
      eventResize: async (info) => {
        const eventId = info.event.id;
        const original = localEvents.find((e:any) => String(e.id) === String(eventId));
        if (original && info.event.start && info.event.end) {
           const adjustedData = `${info.event.start.getFullYear()}-${String(info.event.start.getMonth()+1).padStart(2,'0')}-${String(info.event.start.getDate()).padStart(2,'0')}`;
           const adjustedHoraInicio = `${String(info.event.start.getHours()).padStart(2,'0')}:${String(info.event.start.getMinutes()).padStart(2,'0')}`;
           const adjustedHoraFim = `${String(info.event.end.getHours()).padStart(2,'0')}:${String(info.event.end.getMinutes()).padStart(2,'0')}`;

           const formData = {
             id: original.id,
             nome: original.cliente?.nome,
             whatsapp: original.cliente?.whatsapp,
             data: adjustedData,
             horaInicio: adjustedHoraInicio,
             horaFim: adjustedHoraFim,
             agendaId: original.profissional?.id,
             procedimentoId: original.evento?.id,
             observacao: original.observacao
           };
           await handleSaveEvent(formData);
        }
      }
    });

    calendar.render();
    calendarInstance.current = calendar;

    return () => calendar.destroy();
  }, [events, currentView]);

  const handlePrev = () => calendarInstance.current?.prev();
  const handleNext = () => calendarInstance.current?.next();
  const handleToday = () => calendarInstance.current?.today();
  const handleViewChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const view = e.target.value;
    setCurrentView(view);
    calendarInstance.current?.changeView(view);
  };

  return (
    <div className="flex flex-col h-screen w-full font-sans text-sm bg-white dark:bg-zinc-900 text-[#3c4043]">
      
      {/* Top Bar - Estilo Google Calendar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[#dadce0]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors text-[#5f6368]"
            title="Menu principal"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-2 mr-4">
            <span className="text-[22px] font-normal text-[#3c4043]">Agenda</span>
          </div>

          <button 
            onClick={handleToday}
            className="px-4 py-2 font-medium text-sm border border-[#dadce0] rounded hover:bg-[#f1f3f4] transition-colors"
          >
            Hoje
          </button>

          <div className="flex items-center gap-1">
            <button 
              onClick={handlePrev}
              className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors text-[#5f6368]"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={handleNext}
              className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors text-[#5f6368]"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <h2 className="text-[22px] font-normal text-[#3c4043] ml-2 capitalize">
            {calendarTitle}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <UnidadeSwitcher unidades={unidades} currentUnidadeId={currentUnidadeId} baseUrl={baseUrl} />
          </div>
          
          <button 
            onClick={() => { setSelectedEventData(null); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white shadow-sm rounded-full text-sm font-medium hover:bg-blue-700 hover:shadow transition-all"
          >
            <Plus size={18} className="text-white" />
            Criar Agendamento
          </button>
          
          <div className="relative flex items-center hidden md:flex">
            <Search className="absolute left-3 text-gray-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              className="pl-10 pr-4 py-2 bg-[#f1f3f4] border-none rounded-md focus:bg-white dark:bg-zinc-900 focus:ring-1 focus:ring-blue-500 focus:shadow-md transition-all text-sm w-64"
              value={searchPatient}
              onChange={e => setSearchPatient(e.target.value)}
            />
          </div>

          <select 
            value={currentView} 
            onChange={handleViewChange}
            className="border border-[#dadce0] rounded px-3 py-2 text-sm font-medium hover:bg-[#f1f3f4] focus:outline-none transition-colors appearance-none bg-white dark:bg-zinc-900 min-w-[100px] cursor-pointer"
          >
            <option value="timeGridDay">Dia</option>
            <option value="timeGridWeek">Semana</option>
            <option value="dayGridMonth">Mês</option>
          </select>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Grade do Calendário */}
        <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-900 relative z-0">
          <div ref={calendarRef} className="absolute inset-0"></div>
        </div>
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

