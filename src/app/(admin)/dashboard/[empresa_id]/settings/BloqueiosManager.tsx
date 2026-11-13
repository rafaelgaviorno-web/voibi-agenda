'use client';

import { useState, useRef } from 'react';
import { Calendar, Repeat, Clock, CalendarDays, Pencil, CalendarCheck, X } from 'lucide-react';

const DIAS_DA_SEMANA = [
  { num: 0, label: 'Dom', full: 'Domingo' },
  { num: 1, label: 'Seg', full: 'Segunda-feira' },
  { num: 2, label: 'Ter', full: 'Terça-feira' },
  { num: 3, label: 'Qua', full: 'Quarta-feira' },
  { num: 4, label: 'Qui', full: 'Quinta-feira' },
  { num: 5, label: 'Sex', full: 'Sexta-feira' },
  { num: 6, label: 'Sáb', full: 'Sábado' },
];

export default function BloqueiosManager({ initialBloqueios, agendas, unidades, saveBloqueio }: any) {
  const [bloqueios, setBloqueios] = useState(initialBloqueios || []);
  const [tipoBloqueio, setTipoBloqueio] = useState<'data' | 'recorrente'>('data');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [erroMsg, setErroMsg] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  // Controle rápido de "Abrir dia específico" na tabela
  const [openDayTargetId, setOpenDayTargetId] = useState<string | null>(null);
  const [quickOpenDate, setQuickOpenDate] = useState('');

  // Estado para Bloqueio Pontual (por Data Específica)
  const [novoPontual, setNovoPontual] = useState({
    inicio: '',
    fim: '',
    motivo: '',
    profissional_id: '',
    unidade_id: ''
  });
  const [isDiaTodoPontual, setIsDiaTodoPontual] = useState(false);

  // Estado para Bloqueio Recorrente (por Dias da Semana)
  const todayStr = new Date().toISOString().split('T')[0];
  const [novoRecorrente, setNovoRecorrente] = useState({
    dias_semana: [1] as number[],
    isDiaTodo: false,
    hora_inicio: '14:00',
    hora_fim: '18:00',
    data_inicio: todayStr,
    temDataFim: false,
    data_fim: '',
    datas_liberadas: [] as string[],
    motivo: '',
    profissional_id: '',
    unidade_id: ''
  });
  const [formOpenDateInput, setFormOpenDateInput] = useState('');

  const resetForms = () => {
    setEditingId(null);
    setErroMsg('');
    setIsDiaTodoPontual(false);
    setNovoPontual({ inicio: '', fim: '', motivo: '', profissional_id: '', unidade_id: '' });
    setNovoRecorrente({
      dias_semana: [1],
      isDiaTodo: false,
      hora_inicio: '14:00',
      hora_fim: '18:00',
      data_inicio: todayStr,
      temDataFim: false,
      data_fim: '',
      datas_liberadas: [],
      motivo: '',
      profissional_id: '',
      unidade_id: ''
    });
    setFormOpenDateInput('');
  };

  const formatToDatetimeLocal = (isoStr: string) => {
    if (!isoStr) return '';
    // Se já vier como YYYY-MM-DDTHH:mm...
    const clean = String(isoStr).replace(' ', 'T');
    if (clean.length >= 16 && !clean.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(clean)) {
      return clean.slice(0, 16);
    }
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
  };

  const handleStartEdit = (b: any) => {
    setErroMsg('');
    setEditingId(b.id);

    if (b.tipo === 'recorrente') {
      setTipoBloqueio('recorrente');
      const isFullDay =
        (!b.hora_inicio && !b.hora_fim) ||
        (String(b.hora_inicio).startsWith('00:00') && String(b.hora_fim).startsWith('23:59'));
      const fimLimite = b.data_fim_recorrencia || (b.fim ? String(b.fim).slice(0, 10) : '');

      setNovoRecorrente({
        dias_semana: Array.isArray(b.dias_semana) ? [...b.dias_semana].sort((a, c) => a - c) : [],
        isDiaTodo: isFullDay,
        hora_inicio: b.hora_inicio && !isFullDay ? String(b.hora_inicio).slice(0, 5) : '14:00',
        hora_fim: b.hora_fim && !isFullDay ? String(b.hora_fim).slice(0, 5) : '18:00',
        data_inicio: b.inicio ? String(b.inicio).slice(0, 10) : todayStr,
        temDataFim: Boolean(fimLimite),
        data_fim: fimLimite ? String(fimLimite).slice(0, 10) : '',
        datas_liberadas: Array.isArray(b.datas_liberadas)
          ? b.datas_liberadas.map((d: any) => String(d).slice(0, 10)).sort()
          : [],
        motivo: b.motivo || '',
        profissional_id: b.profissional_id || '',
        unidade_id: b.unidade_id || ''
      });
    } else {
      setTipoBloqueio('data');
      const iniLocal = formatToDatetimeLocal(b.inicio);
      const fimLocal = formatToDatetimeLocal(b.fim);
      const isFullDay = iniLocal.endsWith('T00:00') && fimLocal.endsWith('T23:59');
      setIsDiaTodoPontual(isFullDay);
      setNovoPontual({
        inicio: isFullDay ? iniLocal.slice(0, 10) : iniLocal,
        fim: isFullDay ? fimLocal.slice(0, 10) : fimLocal,
        motivo: b.motivo || '',
        profissional_id: b.profissional_id || '',
        unidade_id: b.unidade_id || ''
      });
    }

    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleDiaSemana = (num: number) => {
    setNovoRecorrente(prev => {
      const exists = prev.dias_semana.includes(num);
      const updated = exists
        ? prev.dias_semana.filter(d => d !== num)
        : [...prev.dias_semana, num].sort((a, b) => a - b);
      return { ...prev, dias_semana: updated };
    });
  };

  const selecionarDiasUteis = () => {
    setNovoRecorrente(prev => ({ ...prev, dias_semana: [1, 2, 3, 4, 5] }));
  };

  const selecionarTodosDias = () => {
    setNovoRecorrente(prev => ({ ...prev, dias_semana: [0, 1, 2, 3, 4, 5, 6] }));
  };

  const aplicarAtalhoDataFim = (meses: number) => {
    const base = novoRecorrente.data_inicio ? new Date(novoRecorrente.data_inicio + 'T00:00:00') : new Date();
    base.setMonth(base.getMonth() + meses);
    const targetStr = base.toISOString().split('T')[0];
    setNovoRecorrente(prev => ({
      ...prev,
      temDataFim: true,
      data_fim: targetStr
    }));
  };

  const addLiberatedDateToForm = () => {
    if (!formOpenDateInput) return;
    if (novoRecorrente.datas_liberadas.includes(formOpenDateInput)) {
      setFormOpenDateInput('');
      return;
    }
    const [y, m, d] = formOpenDateInput.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    if (!novoRecorrente.dias_semana.includes(dow)) {
      const labelDia = DIAS_DA_SEMANA.find(item => item.num === dow)?.full || '';
      setErroMsg(`A data ${formOpenDateInput.split('-').reverse().join('/')} (${labelDia}) não faz parte dos dias da semana bloqueados.`);
      return;
    }
    setErroMsg('');
    setNovoRecorrente(prev => ({
      ...prev,
      datas_liberadas: [...prev.datas_liberadas, formOpenDateInput].sort()
    }));
    setFormOpenDateInput('');
  };

  const removeLiberatedDateFromForm = (dateStr: string) => {
    setNovoRecorrente(prev => ({
      ...prev,
      datas_liberadas: prev.datas_liberadas.filter(d => d !== dateStr)
    }));
  };

  const handleSaveBloqueio = async () => {
    setErroMsg('');
    const action = editingId ? 'update' : 'add';

    if (tipoBloqueio === 'data') {
      if (!novoPontual.inicio || !novoPontual.fim) {
        setErroMsg('Preencha as datas de início e fim do bloqueio pontual.');
        return;
      }
      setIsSaving(true);

      let inicioFinal = novoPontual.inicio;
      let fimFinal = novoPontual.fim;

      if (isDiaTodoPontual) {
        inicioFinal = `${novoPontual.inicio}T00:00:00`;
        fimFinal = `${novoPontual.fim}T23:59:59`;
      }

      const blockData: any = {
        ...(editingId ? { id: editingId } : {}),
        tipo: 'data',
        dias_semana: null,
        hora_inicio: null,
        hora_fim: null,
        data_fim_recorrencia: null,
        datas_liberadas: [],
        inicio: inicioFinal,
        fim: fimFinal,
        motivo: novoPontual.motivo,
        profissional_id: novoPontual.profissional_id === '' ? null : novoPontual.profissional_id,
        unidade_id: novoPontual.unidade_id === '' ? null : novoPontual.unidade_id
      };

      const result = await saveBloqueio(blockData, action);
      if (result && !result.error) {
        if (editingId) {
          setBloqueios(bloqueios.map((b: any) => (b.id === editingId ? result : b)));
        } else {
          setBloqueios([...bloqueios, result]);
        }
        resetForms();
      } else if (result?.error) {
        setErroMsg(result.error);
      }
      setIsSaving(false);
    } else {
      if (novoRecorrente.dias_semana.length === 0) {
        setErroMsg('Selecione ao menos um dia da semana para o bloqueio recorrente.');
        return;
      }

      if (!novoRecorrente.isDiaTodo && (!novoRecorrente.hora_inicio || !novoRecorrente.hora_fim)) {
        setErroMsg('Informe o horário inicial e final do bloqueio recorrente.');
        return;
      }

      if (!novoRecorrente.isDiaTodo && novoRecorrente.hora_inicio >= novoRecorrente.hora_fim) {
        setErroMsg('O horário final deve ser maior que o horário inicial.');
        return;
      }

      setIsSaving(true);

      const horaInicioFinal = novoRecorrente.isDiaTodo ? '00:00:00' : `${novoRecorrente.hora_inicio}:00`;
      const horaFimFinal = novoRecorrente.isDiaTodo ? '23:59:59' : `${novoRecorrente.hora_fim}:00`;

      const blockData: any = {
        ...(editingId ? { id: editingId } : {}),
        tipo: 'recorrente',
        dias_semana: novoRecorrente.dias_semana,
        hora_inicio: horaInicioFinal,
        hora_fim: horaFimFinal,
        inicio: novoRecorrente.data_inicio ? `${novoRecorrente.data_inicio}T00:00:00` : `${todayStr}T00:00:00`,
        fim: (novoRecorrente.temDataFim && novoRecorrente.data_fim) ? `${novoRecorrente.data_fim}T23:59:59` : null,
        data_fim_recorrencia: (novoRecorrente.temDataFim && novoRecorrente.data_fim) ? novoRecorrente.data_fim : null,
        datas_liberadas: novoRecorrente.datas_liberadas,
        motivo: novoRecorrente.motivo,
        profissional_id: novoRecorrente.profissional_id === '' ? null : novoRecorrente.profissional_id,
        unidade_id: novoRecorrente.unidade_id === '' ? null : novoRecorrente.unidade_id
      };

      const result = await saveBloqueio(blockData, action);
      if (result && !result.error) {
        if (editingId) {
          setBloqueios(bloqueios.map((b: any) => (b.id === editingId ? result : b)));
        } else {
          setBloqueios([...bloqueios, result]);
        }
        resetForms();
      } else if (result?.error) {
        setErroMsg(result.error);
      }
      setIsSaving(false);
    }
  };

  // Ação rápida na tabela: liberar ou re-bloquear uma data específica dentro de um bloqueio recorrente
  const handleQuickAddLiberatedDate = async (b: any) => {
    if (!quickOpenDate) return;
    setErroMsg('');

    const [y, m, d] = quickOpenDate.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    const dias = Array.isArray(b.dias_semana) ? b.dias_semana : [];
    if (!dias.includes(dow)) {
      const labelDia = DIAS_DA_SEMANA.find(item => item.num === dow)?.full || '';
      setErroMsg(`A data ${quickOpenDate.split('-').reverse().join('/')} (${labelDia}) não está bloqueada por esta regra recorrente.`);
      return;
    }

    const atuais: string[] = Array.isArray(b.datas_liberadas)
      ? b.datas_liberadas.map((x: any) => String(x).slice(0, 10))
      : [];
    if (atuais.includes(quickOpenDate)) {
      setQuickOpenDate('');
      return;
    }

    const novaLista = [...atuais, quickOpenDate].sort();
    setIsSaving(true);
    const result = await saveBloqueio({ ...b, datas_liberadas: novaLista }, 'update');
    if (result && !result.error) {
      setBloqueios(bloqueios.map((item: any) => (item.id === b.id ? result : item)));
      setQuickOpenDate('');
    } else if (result?.error) {
      setErroMsg(result.error);
    }
    setIsSaving(false);
  };

  const handleQuickRemoveLiberatedDate = async (b: any, dateStr: string) => {
    const atuais: string[] = Array.isArray(b.datas_liberadas)
      ? b.datas_liberadas.map((x: any) => String(x).slice(0, 10))
      : [];
    const novaLista = atuais.filter(d => d !== dateStr);

    setIsSaving(true);
    const result = await saveBloqueio({ ...b, datas_liberadas: novaLista }, 'update');
    if (result && !result.error) {
      setBloqueios(bloqueios.map((item: any) => (item.id === b.id ? result : item)));
    } else if (result?.error) {
      setErroMsg(result.error);
    }
    setIsSaving(false);
  };

  const handleRemoveBloqueio = async (id: string) => {
    setIsSaving(true);
    await saveBloqueio({ id }, 'remove');
    setBloqueios(bloqueios.filter((b: any) => b.id !== id));
    if (editingId === id) resetForms();
    setIsSaving(false);
  };

  const formatDiasSemana = (dias?: number[]) => {
    if (!dias || dias.length === 0) return '-';
    if (dias.length === 7) return 'Todos os dias';
    if (dias.length === 5 && [1, 2, 3, 4, 5].every(d => dias.includes(d))) return 'Segunda a Sexta';
    return dias
      .map(d => DIAS_DA_SEMANA.find(item => item.num === d)?.label || d)
      .join(', ');
  };

  const formatDateBR = (dateStr: string) => {
    const clean = String(dateStr).slice(0, 10);
    const parts = clean.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : clean;
  };

  return (
    <div className="p-5" ref={formRef}>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Configure períodos de bloqueio para impedir novos agendamentos. Você pode bloquear datas pontuais, criar bloqueios recorrentes por dias da semana, editar regras existentes ou liberar dias específicos dentro de um bloqueio recorrente.
      </p>

      {editingId && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
          <span className="text-xs font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <Pencil className="w-3.5 h-3.5" />
            Editando bloqueio selecionado
          </span>
          <button
            type="button"
            onClick={resetForms}
            className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline"
          >
            Cancelar edição
          </button>
        </div>
      )}

      {/* Tabs para alternar o Tipo de Bloqueio */}
      <div className="flex items-center gap-2 mb-4 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => { setTipoBloqueio('data'); setErroMsg(''); }}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            tipoBloqueio === 'data'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Data Específica (Pontual)
        </button>
        <button
          type="button"
          onClick={() => { setTipoBloqueio('recorrente'); setErroMsg(''); }}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            tipoBloqueio === 'recorrente'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Repeat className="w-3.5 h-3.5 text-blue-600" />
          Dias da Semana (Recorrente)
        </button>
      </div>

      {erroMsg && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-lg">
          {erroMsg}
        </div>
      )}

      {/* Formulário de Adição / Edição */}
      <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-8 space-y-4">
        
        {tipoBloqueio === 'data' ? (
          /* MODO: DATA ESPECÍFICA */
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="diaTodoPontual" 
                checked={isDiaTodoPontual} 
                onChange={(e) => {
                  setIsDiaTodoPontual(e.target.checked);
                  setNovoPontual({ ...novoPontual, inicio: '', fim: '' });
                }}
                className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-600 focus:ring-blue-500"
              />
              <label htmlFor="diaTodoPontual" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                Bloquear dia todo
              </label>
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              {unidades && unidades.length > 0 && (
                <div className="flex-1 min-w-[140px] space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Unidade Afetada</label>
                  <select 
                    value={novoPontual.unidade_id} 
                    onChange={e => setNovoPontual({ ...novoPontual, unidade_id: e.target.value })} 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Todas (Geral)</option>
                    {unidades.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex-1 min-w-[140px] space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Agenda Afetada</label>
                <select 
                  value={novoPontual.profissional_id} 
                  onChange={e => setNovoPontual({ ...novoPontual, profissional_id: e.target.value })} 
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todas da Unidade</option>
                  {agendas.filter((a: any) => !novoPontual.unidade_id || a.unidade_id === novoPontual.unidade_id).map((a: any) => (
                    <option key={a.id} value={a.id}>Apenas: {a.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[160px] space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Data Inicial</label>
                <input 
                  type={isDiaTodoPontual ? "date" : "datetime-local"} 
                  value={novoPontual.inicio} 
                  onChange={e => setNovoPontual({ ...novoPontual, inicio: e.target.value })} 
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500" 
                />
              </div>

              <div className="flex-1 min-w-[160px] space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Data Final</label>
                <input 
                  type={isDiaTodoPontual ? "date" : "datetime-local"} 
                  value={novoPontual.fim} 
                  onChange={e => setNovoPontual({ ...novoPontual, fim: e.target.value })} 
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500" 
                />
              </div>

              <div className="flex-1 min-w-[140px] space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Motivo</label>
                <input 
                  type="text" 
                  placeholder="Ex: Feriado, Folga" 
                  value={novoPontual.motivo} 
                  onChange={e => setNovoPontual({ ...novoPontual, motivo: e.target.value })} 
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500" 
                />
              </div>

              <div className="w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                <button 
                  onClick={handleSaveBloqueio} 
                  disabled={isSaving || !novoPontual.inicio || !novoPontual.fim} 
                  className="w-full sm:w-auto bg-zinc-900 hover:bg-black text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 h-[38px] flex items-center justify-center gap-1.5"
                >
                  {isSaving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Adicionar Bloqueio')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* MODO: DIAS DA SEMANA (RECORRENTE) */
          <div className="space-y-5">
            {/* 1. Seleção dos dias da semana */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                  Dias da Semana a Bloquear
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selecionarDiasUteis}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium hover:underline"
                  >
                    Seg a Sex
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <button
                    type="button"
                    onClick={selecionarTodosDias}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium hover:underline"
                  >
                    Todos os dias
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {DIAS_DA_SEMANA.map(d => {
                  const isSelected = novoRecorrente.dias_semana.includes(d.num);
                  return (
                    <button
                      key={d.num}
                      type="button"
                      onClick={() => toggleDiaSemana(d.num)}
                      className={`py-2.5 px-2 rounded-lg text-xs font-semibold border transition-all flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                          : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      <span className="text-sm font-bold">{d.label}</span>
                      <span className="text-[10px] opacity-75 font-normal hidden sm:inline">{d.full.split('-')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Horários e Abrangência */}
            <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
              <div className="flex items-center gap-2 mb-3">
                <input 
                  type="checkbox" 
                  id="diaTodoRecorrente" 
                  checked={novoRecorrente.isDiaTodo} 
                  onChange={(e) => setNovoRecorrente({ ...novoRecorrente, isDiaTodo: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-600 focus:ring-blue-500"
                />
                <label htmlFor="diaTodoRecorrente" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  Bloquear dia todo nos dias selecionados
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {!novoRecorrente.isDiaTodo && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        Horário de Início
                      </label>
                      <input 
                        type="time" 
                        value={novoRecorrente.hora_inicio} 
                        onChange={e => setNovoRecorrente({ ...novoRecorrente, hora_inicio: e.target.value })} 
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        Horário de Término
                      </label>
                      <input 
                        type="time" 
                        value={novoRecorrente.hora_fim} 
                        onChange={e => setNovoRecorrente({ ...novoRecorrente, hora_fim: e.target.value })} 
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500" 
                      />
                    </div>
                  </>
                )}

                {unidades && unidades.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Unidade Afetada</label>
                    <select 
                      value={novoRecorrente.unidade_id} 
                      onChange={e => setNovoRecorrente({ ...novoRecorrente, unidade_id: e.target.value })} 
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Todas (Geral)</option>
                      {unidades.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Agenda Afetada</label>
                  <select 
                    value={novoRecorrente.profissional_id} 
                    onChange={e => setNovoRecorrente({ ...novoRecorrente, profissional_id: e.target.value })} 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Todas da Unidade</option>
                    {agendas.filter((a: any) => !novoRecorrente.unidade_id || a.unidade_id === novoRecorrente.unidade_id).map((a: any) => (
                      <option key={a.id} value={a.id}>Apenas: {a.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Motivo</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Treinamento semanal, Almoço fixo" 
                    value={novoRecorrente.motivo} 
                    onChange={e => setNovoRecorrente({ ...novoRecorrente, motivo: e.target.value })} 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500" 
                  />
                </div>
              </div>
            </div>

            {/* 3. Exceções: Abrir dias específicos dentro do bloqueio */}
            <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                Dias Abertos / Exceções (Opcional)
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2.5">
                Precisa atender em um dia específico que cai dentro deste bloqueio recorrente? Adicione a data abaixo para liberá-la sem desfazer o bloqueio.
              </p>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                <input
                  type="date"
                  value={formOpenDateInput}
                  onChange={e => setFormOpenDateInput(e.target.value)}
                  className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={addLiberatedDateToForm}
                  disabled={!formOpenDateInput}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-colors"
                >
                  Abrir este dia
                </button>
              </div>

              {novoRecorrente.datas_liberadas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {novoRecorrente.datas_liberadas.map(d => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-medium"
                    >
                      {formatDateBR(d)}
                      <button
                        type="button"
                        onClick={() => removeLiberatedDateFromForm(d)}
                        className="hover:text-emerald-900 dark:hover:text-emerald-100"
                        title="Remover liberação (voltar a bloquear)"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Vigência e Duração */}
            <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider block mb-3">
                Vigência do Bloqueio (Duração da Repetição)
              </label>

              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[150px] space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">A partir de (Início)</label>
                  <input 
                    type="date" 
                    value={novoRecorrente.data_inicio} 
                    onChange={e => setNovoRecorrente({ ...novoRecorrente, data_inicio: e.target.value })} 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500" 
                  />
                </div>

                <div className="flex-1 min-w-[200px] space-y-2">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="temDataFim" 
                      checked={novoRecorrente.temDataFim} 
                      onChange={e => {
                        const checked = e.target.checked;
                        setNovoRecorrente({
                          ...novoRecorrente,
                          temDataFim: checked,
                          data_fim: checked && !novoRecorrente.data_fim ? todayStr : novoRecorrente.data_fim
                        });
                      }} 
                      className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-600 focus:ring-blue-500"
                    />
                    <label htmlFor="temDataFim" className="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      Definir data de término (limite de repetição)
                    </label>
                  </div>

                  {novoRecorrente.temDataFim ? (
                    <div className="space-y-1.5">
                      <input 
                        type="date" 
                        value={novoRecorrente.data_fim} 
                        onChange={e => setNovoRecorrente({ ...novoRecorrente, data_fim: e.target.value })} 
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500" 
                      />
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-zinc-400">Atalhos:</span>
                        <button type="button" onClick={() => aplicarAtalhoDataFim(1)} className="px-2 py-0.5 rounded text-[11px] bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700">
                          +1 mês
                        </button>
                        <button type="button" onClick={() => aplicarAtalhoDataFim(3)} className="px-2 py-0.5 rounded text-[11px] bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700">
                          +3 meses
                        </button>
                        <button type="button" onClick={() => aplicarAtalhoDataFim(6)} className="px-2 py-0.5 rounded text-[11px] bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700">
                          +6 meses
                        </button>
                        <button type="button" onClick={() => aplicarAtalhoDataFim(12)} className="px-2 py-0.5 rounded text-[11px] bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700">
                          +1 ano
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                      Repete continuamente por tempo indeterminado
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
                  <button 
                    onClick={handleSaveBloqueio} 
                    disabled={isSaving || novoRecorrente.dias_semana.length === 0} 
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 h-[38px] flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isSaving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Adicionar Bloqueio Recorrente')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Tabela de Bloqueios Cadastrados */}
      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
          <span>Bloqueios Ativos</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal">
            {bloqueios.length}
          </span>
        </h3>

        {bloqueios.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">Nenhum bloqueio cadastrado.</p>
        ) : (
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Dias / Horários</th>
                  <th className="px-4 py-3">Vigência</th>
                  <th className="px-4 py-3">Agenda Afetada</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {bloqueios.map((b: any) => {
                  const isRecorrente = b.tipo === 'recorrente';
                  const agendaAfetada = b.profissional_id 
                    ? agendas.find((a: any) => a.id === b.profissional_id)?.nome 
                    : 'Geral (Clínica toda)';
                  const liberadas: string[] = Array.isArray(b.datas_liberadas)
                    ? b.datas_liberadas.map((d: any) => String(d).slice(0, 10)).sort()
                    : [];
                  const isQuickOpenExpanded = openDayTargetId === b.id;

                  return (
                    <tr key={b.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 align-top">
                      {/* Tipo */}
                      <td className="px-4 py-3">
                        {isRecorrente ? (
                          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-medium border border-purple-200 dark:border-purple-800">
                            <Repeat className="w-3 h-3" />
                            Recorrente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium border border-zinc-200 dark:border-zinc-700">
                            <Calendar className="w-3 h-3" />
                            Pontual
                          </span>
                        )}
                      </td>

                      {/* Dias / Horários */}
                      <td className="px-4 py-3">
                        {isRecorrente ? (
                          <div className="space-y-1.5">
                            <div>
                              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                {formatDiasSemana(b.dias_semana)}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {b.hora_inicio && b.hora_fim 
                                  ? (b.hora_inicio.startsWith('00:00') && b.hora_fim.startsWith('23:59')
                                      ? 'Dia todo' 
                                      : `${b.hora_inicio.slice(0, 5)} às ${b.hora_fim.slice(0, 5)}`)
                                  : 'Dia todo'}
                              </p>
                            </div>

                            {liberadas.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {liberadas.map(d => (
                                  <span
                                    key={d}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium"
                                  >
                                    Aberto: {formatDateBR(d)}
                                    <button
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() => handleQuickRemoveLiberatedDate(b, d)}
                                      className="hover:text-emerald-900 dark:hover:text-emerald-100"
                                      title="Voltar a bloquear este dia"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}

                            {isQuickOpenExpanded && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                                <input
                                  type="date"
                                  value={quickOpenDate}
                                  onChange={e => setQuickOpenDate(e.target.value)}
                                  className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 text-xs text-zinc-900 dark:text-zinc-100"
                                />
                                <button
                                  type="button"
                                  disabled={isSaving || !quickOpenDate}
                                  onClick={() => handleQuickAddLiberatedDate(b)}
                                  className="px-2.5 py-1 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
                                >
                                  Liberar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setOpenDayTargetId(null); setQuickOpenDate(''); }}
                                  className="px-2 py-1 rounded text-xs text-zinc-500 hover:text-zinc-700"
                                >
                                  Fechar
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                              {b.inicio ? new Date(b.inicio).toLocaleDateString('pt-BR') : '-'}
                              {b.fim && new Date(b.inicio).toDateString() !== new Date(b.fim).toDateString() 
                                ? ` até ${new Date(b.fim).toLocaleDateString('pt-BR')}` 
                                : ''}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {b.inicio && b.fim
                                ? `${new Date(b.inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} às ${new Date(b.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                                : '-'}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Vigência */}
                      <td className="px-4 py-3 text-xs">
                        {isRecorrente ? (
                          <div className="space-y-0.5">
                            <p className="text-zinc-700 dark:text-zinc-300">
                              A partir de: {b.inicio ? formatDateBR(b.inicio) : 'Criação'}
                            </p>
                            <p className="text-zinc-500 dark:text-zinc-400">
                              {b.data_fim_recorrencia || b.fim 
                                ? `Até: ${formatDateBR(b.data_fim_recorrencia || b.fim)}`
                                : 'Sem data final (Contínuo)'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-zinc-400">Data única</span>
                        )}
                      </td>

                      {/* Agenda */}
                      <td className="px-4 py-3 font-medium">
                        {b.profissional_id ? (
                          <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-100 dark:border-blue-900/50">
                            {agendaAfetada}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-medium border border-rose-100 dark:border-rose-900/50">
                            {b.unidade_id ? `Unidade: ${unidades?.find((u: any) => u.id === b.unidade_id)?.nome || 'Específica'}` : 'Geral (Clínica toda)'}
                          </span>
                        )}
                      </td>

                      {/* Motivo */}
                      <td className="px-4 py-3">{b.motivo || '-'}</td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {isRecorrente && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenDayTargetId(isQuickOpenExpanded ? null : b.id);
                                setQuickOpenDate('');
                                setErroMsg('');
                              }}
                              disabled={isSaving}
                              className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium text-xs px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                              title="Abrir/liberar um dia específico dentro deste bloqueio recorrente"
                            >
                              Abrir dia
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(b)}
                            disabled={isSaving}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-xs px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                          >
                            Editar
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleRemoveBloqueio(b.id)} 
                            disabled={isSaving}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-xs px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
