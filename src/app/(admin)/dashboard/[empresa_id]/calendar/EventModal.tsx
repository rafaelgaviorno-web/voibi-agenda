'use client';

import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, User, Phone, FileText, Trash2, CheckCircle2, Check, UserCheck, AlertCircle, RotateCcw } from 'lucide-react';

export default function EventModal({ 
  isOpen, 
  onClose, 
  event, 
  agendas,
  procedimentos,
  localEvents,
  onSave, 
  onDelete 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  event?: any, 
  agendas: any[],
  procedimentos?: any[],
  localEvents?: any[],
  onSave: (data: any) => Promise<void>,
  onDelete: (id: string) => Promise<void>
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    clienteId: '',
    nome: '',
    whatsapp: '',
    data: '',
    horaInicio: '',
    horaFim: '',
    agendaId: '',
    procedimentoId: '',
    observacao: '',
    status: 'pendente',
    status_atendimento: 'agendado',
    is_encaixe: false
  });

  // Funções utilitárias para lidar com fuso horário corretamente
  const formatLocalDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString.split('T')[0] || '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatLocalTime = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString.split('T')[1]?.substring(0,5) || '';
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  };

  // Atualiza o form quando o evento prop muda
  useEffect(() => {
    if (event) {
      setFormData({
        id: event.id || '',
        clienteId: event.cliente?.id || '',
        nome: event.cliente?.nome || '',
        whatsapp: event.cliente?.whatsapp || event.cliente?.telefone || '',
        data: formatLocalDate(event.inicio),
        horaInicio: formatLocalTime(event.inicio),
        horaFim: formatLocalTime(event.fim),
        agendaId: event.profissional?.id || event.agendaId || '',
        procedimentoId: event.evento?.id || '',
        observacao: event.observacao || '',
        status: event.status || 'pendente',
        status_atendimento: event.status_atendimento || 'agendado',
        is_encaixe: event.is_encaixe || false
      });
    } else {
      // Form limpo para novo agendamento
      const today = new Date();
      const initialProcId = procedimentos && procedimentos.length > 0 ? procedimentos[0].id : '';
      const initialHoraInicio = '09:00';
      setFormData({
        id: '',
        clienteId: '',
        nome: '',
        whatsapp: '',
        data: formatLocalDate(today.toISOString()),
        horaInicio: initialHoraInicio,
        horaFim: calculateEnd(initialHoraInicio, initialProcId) || '09:30',
        agendaId: agendas[0]?.id || '',
        procedimentoId: initialProcId,
        observacao: '',
        status: 'pendente',
        status_atendimento: 'agendado',
        is_encaixe: false
      });
    }
  }, [event, agendas, procedimentos, isOpen]);

  // Early return is moved down below the hooks

  const isEditMode = !!formData.id;

  const getDuracao = (procIdOverride?: string) => {
    const pid = procIdOverride !== undefined ? procIdOverride : formData.procedimentoId;
    const p = procedimentos?.find(p => p.id === pid);
    if (p) return p.duracao_minutos;
    const selectedAgenda = agendas.find(a => a.id === formData.agendaId);
    return selectedAgenda?.intervalo_minutos || 30;
  };

  const calculateEnd = (start: string, procIdOverride?: string) => {
    if (!start) return '';
    const d = new Date(`1970-01-01T${start}:00`);
    d.setMinutes(d.getMinutes() + getDuracao(procIdOverride));
    return d.toTimeString().substring(0, 5);
  };

  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  
  useEffect(() => {
    if (formData.agendaId && formData.data) {
       const selectedAgenda = agendas.find(a => a.id === formData.agendaId);
       const agendaInterval = selectedAgenda?.intervalo_minutos || 30;
       
       const [year, month, day] = formData.data.split('-');
       const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
       const dayOfWeek = dateObj.getDay();
       
       let disps = selectedAgenda?.disponibilidade?.filter((d:any) => Number(d.dia_semana) === dayOfWeek) || [];
       
       const slots: string[] = [];
       
       if (disps.length === 0) {
         // Fallback availability if nothing is configured
         disps = [{ hora_inicio: '08:00', hora_fim: '18:00' }];
       }

       disps.forEach((d:any) => {
          let current = new Date(`1970-01-01T${d.hora_inicio.substring(0,5)}:00`);
          const endStr = d.hora_fim ? d.hora_fim.substring(0,5) : '18:00';
          const end = new Date(`1970-01-01T${endStr}:00`);
          
          while(current < end) {
             const timeStr = current.toTimeString().substring(0, 5);
             
             // Check if it's already booked
             const isBooked = localEvents?.some(e => {
                if (isEditMode && e.id === formData.id) return false;
                if (e.profissional?.id !== formData.agendaId) return false;
                
                const eStart = new Date(e.start || e.inicio);
                const eEnd = new Date(e.end || e.fim);
                const slotStart = new Date(`${formData.data}T${timeStr}:00`);
                const slotEnd = new Date(slotStart.getTime() + getDuracao() * 60000);
                
                return (slotStart < eEnd && slotEnd > eStart);
             });
             
             if (!isBooked) {
                slots.push(timeStr);
             }
             current = new Date(current.getTime() + agendaInterval * 60000);
          }
       });
       
       // Always ensure current value is in slots so the select doesn't break
       if (formData.horaInicio && !slots.includes(formData.horaInicio)) {
         slots.push(formData.horaInicio);
         slots.sort();
       }
       
       setAvailableSlots(slots);
       if (slots.length > 0 && !formData.horaInicio) {
          setFormData(prev => ({...prev, horaInicio: slots[0], horaFim: calculateEnd(slots[0])}));
       }
    }
  }, [formData.agendaId, formData.data, formData.procedimentoId, agendas, localEvents, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar se o horário bate com algum bloqueio (global ou da agenda específica)
    if (formData.data && formData.horaInicio && formData.horaFim) {
      const start = new Date(`${formData.data}T${formData.horaInicio}:00`).getTime();
      const end = new Date(`${formData.data}T${formData.horaFim}:00`).getTime();

      const isBlocked = localEvents?.some(e => {
        // Ignora se não for bloqueio
        if (e.status !== 'bloqueio') return false;
        
        // Se o bloqueio for de outra agenda e não for global, não afeta
        if (e.profissional && e.profissional.id !== formData.agendaId) return false;
        
        const bStart = new Date(e.start || e.inicio).getTime();
        const bEnd = new Date(e.end || e.fim).getTime();

        return (start < bEnd && end > bStart); // Overlap lógico
      });

      if (isBlocked) {
         alert('Este horário bate com um bloqueio existente! Por favor, escolha outro horário ou dia.');
         return; // Interrompe o salvamento
      }
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      onClose(); // Só fecha se salvar com sucesso
    } catch (err: any) {
      alert("Erro ao salvar agendamento! Detalhe: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
      setIsSaving(true);
      await onDelete(formData.id);
      setIsSaving(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl ring-1 ring-zinc-900/5 dark:ring-white/10 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {isEditMode ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-400 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="event-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          
          {/* Status do Agendamento & Status do Atendimento */}
          <div className="space-y-3 p-3.5 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
            {/* 1. Status do Agendamento (Confirmado / Pendente / Cancelado) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  Status do Agendamento:
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-zinc-500 bg-zinc-200 dark:bg-zinc-800">
                  {formData.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, status: 'pendente'})}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    formData.status === 'pendente' 
                      ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/20' 
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-amber-500 hover:text-amber-600'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Pendente
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, status: 'confirmado'})}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    formData.status === 'confirmado' 
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20' 
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 hover:text-emerald-600'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  Confirmado
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, status: 'cancelado'})}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    formData.status === 'cancelado' 
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/20' 
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-rose-500 hover:text-rose-600'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelado
                </button>
              </div>
            </div>

            {/* 2. Status do Atendimento (Presença na Clínica) */}
            <div className="space-y-2 pt-2.5 border-t border-zinc-200/70 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                  Status do Atendimento:
                </span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border transition-colors ${
                  formData.status_atendimento === 'aguardando' 
                    ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                    : formData.status_atendimento === 'atendido'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    : formData.status_atendimento === 'faltou'
                    ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                    : formData.status_atendimento === 'reagendou'
                    ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800'
                    : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                }`}>
                  {formData.status_atendimento === 'aguardando' ? 'Aguardando Atendimento' : formData.status_atendimento}
                </span>
              </div>

              {/* Linha 1: Agendado e Aguardando Atendimento com espaço de sobra para leitura perfeita */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, status_atendimento: 'agendado'})}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    formData.status_atendimento === 'agendado' 
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20' 
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-blue-500 hover:text-blue-600'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Agendado</span>
                </button>
                
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, status_atendimento: 'aguardando'})}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    formData.status_atendimento === 'aguardando' 
                      ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/20' 
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-purple-500 hover:text-purple-600'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Aguardando Atendimento</span>
                </button>
              </div>

              {/* Linha 2: Atendido, Faltou e Reagendou com visual equilibrado e ícones */}
              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, status_atendimento: 'atendido'})}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    formData.status_atendimento === 'atendido' 
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20' 
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 hover:text-emerald-600'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Atendido</span>
                </button>
                
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, status_atendimento: 'faltou'})}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    formData.status_atendimento === 'faltou' 
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/20' 
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-rose-500 hover:text-rose-600'
                  }`}
                >
                  <X className="w-3.5 h-3.5 shrink-0" />
                  <span>Faltou</span>
                </button>
                
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, status_atendimento: 'reagendou'})}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    formData.status_atendimento === 'reagendou' 
                      ? 'bg-orange-500 text-white shadow-sm ring-2 ring-orange-500/20' 
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-orange-500 hover:text-orange-600'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Reagendou</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <User className="w-4 h-4 text-zinc-400" />
              Nome do Paciente/Cliente
            </label>
            <input 
              required
              value={formData.nome}
              onChange={e => setFormData({...formData, nome: e.target.value})}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-shadow" 
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <Phone className="w-4 h-4 text-zinc-400" />
              WhatsApp
            </label>
            <input 
              required
              value={formData.whatsapp}
              onChange={e => setFormData({...formData, whatsapp: e.target.value})}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-shadow" 
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-zinc-400" />
                Data
              </label>
              <input 
                type="date"
                required
                value={formData.data}
                onChange={e => setFormData({...formData, data: e.target.value})}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-shadow" 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-400" />
                Agenda
              </label>
              <select 
                required
                value={formData.agendaId}
                onChange={e => setFormData({...formData, agendaId: e.target.value})}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-shadow"
              >
                <option value="" disabled>Selecione</option>
                {agendas.map(ag => (
                  <option key={ag.id} value={ag.id}>{ag.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                Procedimento
              </label>
              <select 
                value={formData.procedimentoId}
                onChange={e => setFormData({...formData, procedimentoId: e.target.value, horaFim: calculateEnd(formData.horaInicio, e.target.value)})}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-shadow"
              >
                <option value="" disabled>Selecione</option>
                {procedimentos?.map(p => (
                  <option key={p.id} value={p.id}>{p.nome} ({p.duracao_minutos} min)</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                Horário Disponível
              </label>
              <select 
                required
                value={formData.horaInicio}
                onChange={e => setFormData({...formData, horaInicio: e.target.value, horaFim: calculateEnd(e.target.value)})}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-shadow"
              >
                {!formData.horaInicio && availableSlots.length === 0 && <option value="" disabled>Selecione uma agenda...</option>}
                {formData.horaInicio && !availableSlots.includes(formData.horaInicio) && (
                   <option value={formData.horaInicio}>{formData.horaInicio} (Manual)</option>
                )}
                {availableSlots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input 
                type="checkbox" 
                checked={formData.is_encaixe}
                onChange={e => setFormData({...formData, is_encaixe: e.target.checked})}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-yellow-500 focus:ring-yellow-500/20"
              />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Marcar como Encaixe</span>
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              Observação
            </label>
            <textarea 
              value={formData.observacao}
              onChange={e => setFormData({...formData, observacao: e.target.value})}
              rows={3}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-shadow resize-none" 
              placeholder="Anotações adicionais..."
            />
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between">
          {isEditMode ? (
            <button 
              type="button" 
              onClick={handleDelete}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          ) : (
            <div></div> // Spacer
          )}
          
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              form="event-form"
              type="submit" 
              disabled={isSaving}
              className="px-6 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg font-semibold shadow-sm shadow-brand-500/30 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
