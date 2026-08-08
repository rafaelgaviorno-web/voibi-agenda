'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Users, Building, Tag, FileText, Download } from 'lucide-react';

export default function ReportsClient({
  rawEvents,
  profissionais,
  procedimentos,
  unidades,
  empresaId
}: {
  rawEvents: any[],
  profissionais: any[],
  procedimentos: any[],
  unidades: any[],
  empresaId: string
}) {
  const [localEvents, setLocalEvents] = useState(rawEvents);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'geral' | 'encaixes'>('geral');

  // Filters
  const [filtroUnidade, setFiltroUnidade] = useState('');
  const [filtroAgenda, setFiltroAgenda] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroProcedimento, setFiltroProcedimento] = useState('');
  
  // Dates
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const [dataInicio, setDataInicio] = useState(todayStr);
  const [dataFim, setDataFim] = useState(nextWeekStr);

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
    
    syncFromStorage();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'voibi_mock_events') syncFromStorage();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [rawEvents, empresaId]);

  // Aplicação dos Filtros
  const filteredEvents = localEvents.filter(ev => {
    // 1. Tab (Encaixes)
    if (activeTab === 'encaixes' && !ev.is_encaixe) return false;

    // 2. Data
    const evDate = (ev.inicio || ev.start)?.split('T')[0];
    if (dataInicio && evDate < dataInicio) return false;
    if (dataFim && evDate > dataFim) return false;

    // 3. Unidade (Se o profissional estiver atrelado a uma unidade)
    if (filtroUnidade && ev.profissional) {
      // Tenta achar o profissional correspondente na lista para pegar a unidade_id
      const profInfo = profissionais.find(p => p.id === ev.profissional.id);
      if (profInfo && profInfo.unidade_id && profInfo.unidade_id !== filtroUnidade) return false;
    }

    // 4. Agenda (Profissional)
    if (filtroAgenda && ev.profissional?.id !== filtroAgenda) return false;

    // 5. Status
    if (filtroStatus && ev.status !== filtroStatus) return false;

    // 6. Procedimento
    if (filtroProcedimento && ev.evento?.id !== filtroProcedimento) return false;

    return true;
  });

  // Sort by date/time
  filteredEvents.sort((a, b) => new Date(a.inicio || a.start).getTime() - new Date(b.inicio || b.start).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado': return 'bg-green-100 text-green-700';
      case 'pendente': return 'bg-yellow-100 text-yellow-700';
      case 'cancelado': return 'bg-red-100 text-red-700';
      case 'atendido': return 'bg-blue-100 text-blue-700';
      case 'faltou': return 'bg-gray-100 text-gray-700';
      default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300';
    }
  };

  const statusOptions = ['confirmado', 'pendente', 'cancelado', 'atendido', 'faltou', 'reagendou'];

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-900/50">
      {/* Header & Tabs */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-6 pt-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Relatórios</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Gere relatórios detalhados de agendamentos e encaixes.</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-950 shadow-sm transition-all">
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('geral')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'geral' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Relatório de Agenda
          </button>
          <button 
            onClick={() => setActiveTab('encaixes')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'encaixes' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Relatório de Encaixes
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden flex flex-col max-h-full">
          
          {/* Filters Bar */}
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <Building className="w-3.5 h-3.5" /> Unidade
              </label>
              <select 
                value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-md px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Todas as Unidades</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Período
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-md px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-zinc-400">até</span>
                <input 
                  type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-md px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Agenda (Doutor)
              </label>
              <select 
                value={filtroAgenda} onChange={e => setFiltroAgenda(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-md px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Todas as Agendas</option>
                {profissionais
                  .filter(p => !filtroUnidade || p.unidade_id === filtroUnidade || !p.unidade_id)
                  .map(p => <option key={p.id} value={p.id}>{p.nome}</option>)
                }
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5" /> Procedimento
              </label>
              <select 
                value={filtroProcedimento} onChange={e => setFiltroProcedimento(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-md px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Todos</option>
                {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" /> Status
              </label>
              <select 
                value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-md px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 capitalize"
              >
                <option value="">Todos os Status</option>
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white dark:bg-zinc-900 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">Data e Hora</th>
                  <th className="py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">Paciente</th>
                  <th className="py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">Agenda</th>
                  <th className="py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">Procedimento</th>
                  <th className="py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-zinc-500 dark:text-zinc-400">
                      <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
                      <p>Nenhum agendamento encontrado para os filtros selecionados.</p>
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map(ev => {
                    const dt = new Date(ev.inicio || ev.start);
                    const formattedDate = dt.toLocaleDateString('pt-BR');
                    const formattedTime = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                    return (
                      <tr key={ev.id} className="hover:bg-zinc-50 dark:bg-zinc-950 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                          {formattedDate} <span className="text-zinc-500 dark:text-zinc-400 font-normal ml-1">{formattedTime}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{ev.cliente?.nome || 'Sem Nome'}</div>
                          {ev.cliente?.telefone && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{ev.cliente.telefone}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ev.profissional?.cor }}></div>
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">{ev.profissional?.nome}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-zinc-700 dark:text-zinc-300">{ev.evento?.nome || 'N/A'}</div>
                          {ev.is_encaixe && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 mt-1 uppercase tracking-wider">
                              Encaixe
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(ev.status)}`}>
                            {ev.status || 'pendente'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-700 px-4 py-3 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
            <span>Total de registros encontrados: <strong className="text-zinc-900 dark:text-zinc-100">{filteredEvents.length}</strong></span>
          </div>

        </div>
      </div>
    </div>
  );
}
