'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Calendar as CalendarIcon, Clock, CheckCircle2, User, Phone, ArrowRight } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
dayjs.locale('pt-br');

export default function BookingWizard({ empresa, profissional }: any) {
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientData, setClientData] = useState({ nome: '', whatsapp: '' });
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customFields, setCustomFields] = useState<any[]>(profissional.campos_personalizados || []);

  useEffect(() => {
    // Detect country code based on browser language/timezone
    if (!clientData.whatsapp) {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const lang = navigator.language || '';
        let prefix = '+55 '; // Default Brasil
        
        if (lang.includes('US') || tz.includes('New_York') || tz.includes('Los_Angeles')) prefix = '+1 ';
        else if (lang.includes('PT') && !lang.includes('BR')) prefix = '+351 '; // Portugal
        else if (tz.includes('Europe/London')) prefix = '+44 ';
        
        setClientData(prev => ({ ...prev, whatsapp: prefix }));
      } catch (e) {
        setClientData(prev => ({ ...prev, whatsapp: '+55 ' }));
      }
    }

    if (empresa.nome === 'Clínica de Teste Voibi') {
      const saved = localStorage.getItem(`mock_campos_${profissional.id}`);
      if (saved) {
        setCustomFields(JSON.parse(saved));
      }
    }
  }, [empresa.nome, profissional.id]);

  // Mock de dias do mês atual para o calendário
  const today = dayjs();
  const startOfMonth = today.startOf('month');
  const daysInMonth = today.daysInMonth();
  const firstDayOfWeek = startOfMonth.day();
  
  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(startOfMonth.date(i));

  // Cálculo de horários dinâmicos
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      return;
    }

    const computeSlots = () => {
      // 1. Achar o dia da semana (0=Domingo, 1=Segunda, etc). No BD, 0=Domingo.
      let dayOfWeek = dayjs(selectedDate).day(); 
      // Se no BD a segunda é 1 e domingo é 0, bate certinho.
      const regras = (profissional.disponibilidade || []).filter((d:any) => Number(d.dia_semana) === dayOfWeek);
      
      if (regras.length === 0) {
        setAvailableSlots([]);
        return;
      }

      let eventos = [];
      let permitirSobreposicao = profissional.permitir_sobreposicao;
      
      if (empresa.nome === 'Clínica de Teste Voibi') {
         eventos = JSON.parse(localStorage.getItem('voibi_mock_events') || '[]');
         const mockSobrep = localStorage.getItem(`mock_sobreposicao_agenda_${profissional.id}`);
         if (mockSobrep) permitirSobreposicao = mockSobrep === 'true';
      }

      const targetDateStr = dayjs(selectedDate).format('YYYY-MM-DD');
      const ocupados = eventos.filter((e:any) => {
        if (!e.inicio.startsWith(targetDateStr)) return false;
        
        // Se permitir sobreposição é TRUE, ignora eventos das outras agendas
        if (permitirSobreposicao) {
          return e.profissional?.id === profissional.id;
        } else {
          // Se FALSE, bloqueia se a própria clínica estiver ocupada (qualquer profissional)
          return true; 
        }
      });

      const intervalMins = 30; // 30 min default
      let gerados: string[] = [];
      
      for (const regra of regras) {
        let atual = dayjs(`${targetDateStr}T${regra.hora_inicio}`);
        const fim = dayjs(`${targetDateStr}T${regra.hora_fim}`);
        
        while (atual.isBefore(fim)) {
           const timeStr = atual.format('HH:mm');
           const slotFim = atual.add(intervalMins, 'minute');
           
           const conflito = ocupados.some((e:any) => {
              const eInicio = dayjs(e.inicio);
              const eFim = dayjs(e.fim);
              return (atual.isBefore(eFim) && slotFim.isAfter(eInicio));
           });
           
           // Mostrar se não tem conflito e se é horário futuro (caso seja hoje)
           if (!conflito && (atual.isAfter(dayjs()) || !dayjs(selectedDate).isSame(dayjs(), 'day'))) {
             gerados.push(timeStr);
           }
           atual = slotFim;
        }
      }
      
      gerados = [...new Set(gerados)].sort();
      setAvailableSlots(gerados);
    };

    computeSlots();
  }, [selectedDate, profissional.id, profissional.disponibilidade, empresa.nome, profissional.permitir_sobreposicao]);

  const handleNextStep = () => {
    if (step === 1 && (!selectedDate || !selectedTime)) return;
    setStep(prev => prev + 1);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    // Simula tempo de rede
    await new Promise(r => setTimeout(r, 1500));

    // Salvar no localStorage para o calendário de teste (mock-clinic) ver
    if (empresa.nome === 'Clínica de Teste Voibi') {
      const existing = JSON.parse(localStorage.getItem('voibi_mock_events') || '[]');
      
      // Criar a string de data/hora no formato ISO para o FullCalendar
      const formattedDate = dayjs(selectedDate).format('YYYY-MM-DD');
      const [h, m] = (selectedTime || '00:00').split(':');
      const startIso = `${formattedDate}T${h}:${m}:00`;
      
      // Assume duração de 30 minutos como padrão da UI
      const endIso = dayjs(startIso).add(30, 'minute').format('YYYY-MM-DDTHH:mm:00');

      // Montar objeto estruturado com as respostas para o webhook
      const respostasEstruturadas: Record<string, string> = {};
      Object.entries(customAnswers).forEach(([k, v]) => {
        const field = customFields.find((f:any) => f.id === k);
        if (field) respostasEstruturadas[field.titulo] = v;
      });

      const newEvent = {
        id: 'mock-' + Date.now(),
        cliente: { nome: clientData.nome, whatsapp: clientData.whatsapp },
        profissional: profissional,
        evento: { nome: 'Agendamento Externo' },
        inicio: startIso,
        fim: endIso,
        status: 'confirmado',
        respostas_personalizadas: respostasEstruturadas,
        observacao: 'Agendado pelo site público\n' + 
          Object.entries(customAnswers).map(([k,v]) => {
            const field = customFields.find((f:any) => f.id === k);
            return field ? `${field.titulo}: ${v}` : '';
          }).join('\n')
      };

      existing.push(newEvent);
      localStorage.setItem('voibi_mock_events', JSON.stringify(existing));

      // Trigger Webhook if configured
      const agendaWebhook = localStorage.getItem(`mock_webhook_agenda_${profissional.id}`);
      const globalWebhook = localStorage.getItem('voibi_mock_webhook') || 'https://n8n.minhaclinica.com/webhook/agendamento';
      const webhook = agendaWebhook || globalWebhook;
      
      if (webhook) {
        try {
          fetch(webhook, {
            method: 'POST',
            mode: 'no-cors', // Ignore CORS for mock test
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'appointment_created', data: newEvent })
          }).catch(() => console.log('Webhook disparado (mas falhou por CORS ou endpoint falso)'));
        } catch (e) {}
      }
    }

    setIsSubmitting(false);
    setStep(3); // Success screen
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-zinc-50/50">
      <div className="max-w-5xl w-full mx-auto px-4 py-8 md:py-12 flex-1 flex flex-col justify-center">
        
        {/* Card Principal - Layout Duas Colunas */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 flex flex-col md:flex-row overflow-hidden min-h-[600px]">
          
          {/* Coluna Esquerda: Dados da Clínica e Resumo */}
          <div className="w-full md:w-[340px] bg-zinc-50/50 p-8 border-b md:border-b-0 md:border-r border-zinc-100 flex flex-col">
            <div className="flex-1">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-zinc-100 mb-6 flex items-center justify-center text-2xl font-bold" style={{ color: profissional.cor }}>
                {empresa.nome.charAt(0)}
              </div>
              <h2 className="text-zinc-500 font-medium mb-2">{empresa.nome}</h2>
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-8">{profissional.nome}</h1>

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-zinc-600">
                  <Clock className="w-5 h-5 text-zinc-400 mt-0.5" />
                  <div>
                    <div className="font-medium">Sessão de Atendimento</div>
                    <div className="text-sm text-zinc-500">30 min</div>
                  </div>
                </div>

                {selectedDate && selectedTime && (
                  <div className="flex items-start gap-3 text-blue-700 bg-blue-50/50 p-3 rounded-xl border border-blue-100 transition-all">
                    <CalendarIcon className="w-5 h-5 mt-0.5 text-blue-500" />
                    <div>
                      <div className="font-semibold capitalize">{dayjs(selectedDate).format('dddd, D [de] MMMM')}</div>
                      <div className="text-sm font-medium">às {selectedTime}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer da lateral */}
            <div className="mt-8 pt-8 border-t border-zinc-200/60">
              <div className="text-xs text-zinc-400 font-medium">
                Powered by <span className="text-zinc-600 font-bold">Voibi</span>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Fluxo de Agendamento */}
          <div className="flex-1 p-8 relative flex flex-col">
            
            {/* Header / Botão Voltar */}
            {step > 1 && step < 3 && (
              <div className="mb-6">
                <button 
                  onClick={() => setStep(step - 1)} 
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors p-2 -ml-2 rounded-lg hover:bg-blue-50 w-fit"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Voltar
                </button>
              </div>
            )}

            <div className="flex-1 flex flex-col">
              
              {/* Passo 1: Calendário e Horários */}
              {step === 1 && (
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-zinc-900 mb-6">Selecione uma Data e Horário</h3>
                  
                  <div className="flex flex-col xl:flex-row gap-8 xl:gap-12">
                    {/* Calendário */}
                    <div className="flex-1 max-w-[400px]">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="font-semibold text-zinc-900 capitalize text-lg">{today.format('MMMM YYYY')}</h4>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                          <div key={i} className="text-xs font-bold text-zinc-400 py-2">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((d, i) => {
                          if (!d) return <div key={i} className="aspect-square"></div>;
                          const isPast = d.isBefore(today, 'day');
                          const isSelected = selectedDate && d.isSame(selectedDate, 'day');
                          return (
                            <button
                              key={i}
                              disabled={isPast}
                              onClick={() => { setSelectedDate(d.toDate()); setSelectedTime(null); }}
                              className={`aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                                isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 
                                isPast ? 'text-zinc-300 cursor-not-allowed' : 
                                'bg-blue-50/50 text-blue-900 hover:bg-blue-100 hover:text-blue-700'
                              }`}
                            >
                              {d.date()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Horários (Aparece se dia selecionado) */}
                    <div className={`xl:w-[220px] transition-all duration-300 ${selectedDate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none hidden xl:block'}`}>
                      <h4 className="font-medium text-zinc-700 mb-4 flex items-center gap-2">
                        <span className="capitalize">{selectedDate ? dayjs(selectedDate).format('dddd, D') : ''}</span>
                      </h4>
                      <div className="grid grid-cols-2 xl:grid-cols-1 gap-2 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                        {availableSlots.map(time => (
                          <div key={time} className="flex gap-2">
                            <button
                              onClick={() => setSelectedTime(time)}
                              className={`flex-1 p-3.5 rounded-xl border text-sm font-semibold transition-all ${
                                selectedTime === time 
                                ? 'border-zinc-800 bg-zinc-800 text-white shadow-md' 
                                : 'border-blue-200 text-blue-700 bg-white hover:border-blue-300 hover:shadow-sm'
                              }`}
                            >
                              {time}
                            </button>
                            {selectedTime === time && (
                              <button 
                                onClick={handleNextStep}
                                className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-md text-sm"
                              >
                                Avançar
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Passo 2: Formulário */}
              {step === 2 && (
                <div className="max-w-md w-full mx-auto md:mx-0 flex-1 flex flex-col justify-center">
                  <h3 className="text-2xl font-bold text-zinc-900 mb-2">Quase lá!</h3>
                  <p className="text-zinc-500 mb-8">Preencha seus dados para confirmar o agendamento.</p>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-semibold text-zinc-700 mb-2 block">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input 
                          type="text" 
                          className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-zinc-900"
                          placeholder="Ex: João da Silva"
                          value={clientData.nome}
                          onChange={e => setClientData({...clientData, nome: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-zinc-700 mb-2 block">WhatsApp com DDD</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input 
                          type="tel" 
                          className="w-full pl-11 pr-4 py-3.5 bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-zinc-900"
                          placeholder="(11) 99999-9999"
                          value={clientData.whatsapp}
                          onChange={e => setClientData({...clientData, whatsapp: e.target.value})}
                        />
                      </div>
                    </div>

                    {/* Campos Dinâmicos */}
                    {customFields.length > 0 && (
                      <div className="pt-4 mt-4 border-t border-zinc-100 space-y-5">
                        {customFields.map((campo: any) => (
                          <div key={campo.id}>
                            <label className="text-sm font-semibold text-zinc-700 mb-2 block">
                              {campo.titulo} {campo.obrigatorio && <span className="text-red-500">*</span>}
                            </label>
                            {campo.tipo === 'select' ? (
                              <select 
                                className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-zinc-900 appearance-none cursor-pointer"
                                required={campo.obrigatorio}
                                value={customAnswers[campo.id] || ''}
                                onChange={e => setCustomAnswers({...customAnswers, [campo.id]: e.target.value})}
                              >
                                <option value="" disabled>Selecione uma opção</option>
                                {campo.opcoes?.split(',').map((opt: string) => (
                                  <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                ))}
                              </select>
                            ) : campo.tipo === 'textarea' ? (
                              <textarea 
                                className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-zinc-900 resize-none h-24"
                                required={campo.obrigatorio}
                                value={customAnswers[campo.id] || ''}
                                onChange={e => setCustomAnswers({...customAnswers, [campo.id]: e.target.value})}
                              />
                            ) : (
                              <input 
                                type="text" 
                                className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-zinc-900"
                                required={campo.obrigatorio}
                                value={customAnswers[campo.id] || ''}
                                onChange={e => setCustomAnswers({...customAnswers, [campo.id]: e.target.value})}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <button 
                      onClick={handleConfirm}
                      disabled={
                        !clientData.nome || 
                        !clientData.whatsapp || 
                        isSubmitting ||
                        customFields.some((c:any) => c.obrigatorio && !customAnswers[c.id])
                      }
                      className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      ) : (
                        'Confirmar Agendamento'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Passo 3: Sucesso */}
              {step === 3 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                  <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-6 relative">
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <h2 className="text-3xl font-bold text-zinc-900 mb-3">Agendamento Confirmado!</h2>
                  <p className="text-zinc-500 mb-8 max-w-md text-lg">
                    Olá <strong>{clientData.nome}</strong>, seu horário está reservado para o dia <strong>{dayjs(selectedDate).format('DD/MM/YYYY')}</strong> às <strong>{selectedTime}</strong>. 
                  </p>
                  
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-medium transition-colors"
                  >
                    Fazer outro agendamento
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
