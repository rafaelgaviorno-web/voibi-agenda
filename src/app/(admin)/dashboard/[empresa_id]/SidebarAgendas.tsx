'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronDown, ArrowRightLeft, Search, Check, X } from 'lucide-react';
import { navIcon, navItem, navItemIdle } from './navStyles';
import TransferModal from './calendar/TransferModal';
import { transferAppointments } from './calendar/actions';

export default function SidebarAgendas({ agendas, baseUrl, empresaId }: { agendas: any[], baseUrl: string, empresaId: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const agendasParam = searchParams.get('agendas');

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferSourceId, setTransferSourceId] = useState('');

  const selectedAgendas = agendasParam === 'none' 
    ? [] 
    : agendasParam 
      ? agendasParam.split(',') 
      : agendas.map((a: any) => a.id);

  const filteredAgendas = useMemo(() => {
    return agendas.filter(a => a.nome.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [agendas, searchQuery]);

  const isAllSelected = agendas.length > 0 && selectedAgendas.length === agendas.length;
  const isNoneSelected = selectedAgendas.length === 0;

  const updateUrl = (newSelected: string[]) => {
    const newUrl = new URL(window.location.href);
    if (newSelected.length === 0) {
      newUrl.searchParams.set('agendas', 'none');
    } else if (newSelected.length === agendas.length) {
      newUrl.searchParams.delete('agendas');
    } else {
      newUrl.searchParams.set('agendas', newSelected.join(','));
    }
    
    // Check if we're not in the calendar, push to calendar
    if (!window.location.pathname.includes('/calendar')) {
      router.push(`${baseUrl}/calendar${newUrl.search}`);
    } else {
      router.push(newUrl.pathname + newUrl.search);
    }
  };

  const toggleAgenda = (id: string) => {
    let newSelected = [...selectedAgendas];
    if (newSelected.includes(id)) {
      newSelected = newSelected.filter(aId => aId !== id);
    } else {
      newSelected.push(id);
    }
    updateUrl(newSelected);
  };

  const handleSelectAll = () => {
    updateUrl(agendas.map(a => a.id));
  };

  const handleDeselectAll = () => {
    updateUrl([]);
  };

  const handleTransfer = async (sourceId: string, targetId: string, date: string) => {
    if (empresaId === 'mock-clinic') {
      const targetAgenda = agendas.find((a: any) => a.id === targetId);
      const stored = JSON.parse(localStorage.getItem('voibi_mock_events') || '[]');
      
      const updatedStored = stored.map((e: any) => {
        const eDate = (e.inicio || e.start)?.split('T')[0];
        if (e.profissional?.id === sourceId && eDate === date) {
          return { ...e, profissional: targetAgenda };
        }
        return e;
      });
      localStorage.setItem('voibi_mock_events', JSON.stringify(updatedStored));
      window.dispatchEvent(new Event('voibi_agendas_updated'));
    } else {
      await transferAppointments(sourceId, targetId, date, empresaId);
      router.refresh();
    }
  };

  return (
    <div className="space-y-0.5">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`${navItem} justify-between ${navItemIdle}`}
      >
        <div className="flex items-center gap-3">
          <CalendarDays className={navIcon} />
          <span>Agendas</span>
          {agendas.length > 0 && (
            <span className="text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
              {selectedAgendas.length}/{agendas.length}
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
      </button>
      
      {isOpen && (
        <div className="ml-[1.4rem] pl-3 border-l border-zinc-200 dark:border-zinc-800 py-1.5 space-y-2">
          
          {agendas.length > 5 && (
            <div className="relative flex items-center">
               <Search className="absolute left-2.5 text-zinc-400 w-3.5 h-3.5" />
               <input 
                 type="text" 
                 placeholder="Buscar agenda..." 
                 className="pl-8 pr-3 py-1.5 w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 transition-all text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400"
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
               />
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <button 
              type="button"
              onClick={handleSelectAll} 
              disabled={isAllSelected}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 shadow-xs bg-brand-50 hover:bg-brand-100 text-brand-700 border-brand-200/90 dark:bg-brand-500/20 dark:hover:bg-brand-500/30 dark:text-brand-300 dark:border-brand-500/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-brand-50 dark:disabled:hover:bg-brand-500/20 active:scale-95"
              title="Marcar todas as agendas"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Marcar todas</span>
            </button>
            <button 
              type="button"
              onClick={handleDeselectAll} 
              disabled={isNoneSelected}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 shadow-xs bg-zinc-100 hover:bg-red-50 text-zinc-700 hover:text-red-600 border-zinc-200 hover:border-red-200 dark:bg-zinc-800/90 dark:hover:bg-red-950/40 dark:text-zinc-200 dark:hover:text-red-300 dark:border-zinc-700 dark:hover:border-red-800/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zinc-100 dark:disabled:hover:bg-zinc-800/90 active:scale-95"
              title="Desmarcar todas as agendas"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Desmarcar todas</span>
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
            {filteredAgendas.map(agenda => {
              const selected = selectedAgendas.includes(agenda.id);
              return (
                <div key={agenda.id} className="flex items-center justify-between px-1.5 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 rounded-md group transition-colors">
                  <button 
                    onClick={() => toggleAgenda(agenda.id)}
                    className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 text-left"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border-2 transition-colors"
                      style={{ borderColor: agenda.cor, backgroundColor: selected ? agenda.cor : 'transparent' }}
                    >
                      {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />}
                    </span>
                    <span className={`text-[13px] truncate transition-colors ${selected ? 'font-medium text-zinc-800 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`}>
                      {agenda.nome}
                    </span>
                  </button>
                  <button
                    onClick={() => { setTransferSourceId(agenda.id); setIsTransferModalOpen(true); }}
                    title="Transferir Agendamentos"
                    className="p-1 text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-zinc-700 rounded opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all shrink-0"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            {filteredAgendas.length === 0 && (
              <p className="text-xs text-zinc-400 text-center py-2">Nenhuma agenda encontrada.</p>
            )}
          </div>
        </div>
      )}

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        sourceAgendaId={transferSourceId}
        agendas={agendas}
        onTransfer={handleTransfer}
      />
    </div>
  );
}
