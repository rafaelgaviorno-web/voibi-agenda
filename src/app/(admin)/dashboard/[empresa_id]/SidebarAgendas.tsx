'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronDown, ChevronRight, ArrowRightLeft, Search } from 'lucide-react';
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
    <div className="space-y-1">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-zinc-100 dark:bg-zinc-800 transition-colors ${
          isOpen ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold' : 'text-zinc-700 dark:text-zinc-300 font-medium'
        } text-sm`}
      >
        <div className="flex items-center gap-3">
          <CalendarDays className={`w-4 h-4 ${isOpen ? 'text-indigo-600' : 'text-zinc-500 dark:text-zinc-400'}`} />
          <span>Agendas</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        )}
      </button>
      
      {isOpen && (
        <div className="pl-6 pr-3 py-2 space-y-3">
          
          <div className="relative flex items-center">
             <Search className="absolute left-2.5 text-zinc-400 w-3.5 h-3.5" />
             <input 
               type="text" 
               placeholder="Buscar agenda..." 
               className="pl-8 pr-3 py-1.5 w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-zinc-700 dark:text-zinc-300"
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
             />
          </div>

          <div className="flex items-center justify-between px-1">
            <button onClick={handleSelectAll} className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
              Marcar todas
            </button>
            <button onClick={handleDeselectAll} className="text-[11px] font-medium text-zinc-500 hover:text-red-600 transition-colors">
              Desmarcar todas
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredAgendas.map(agenda => (
              <div key={agenda.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-50 dark:bg-zinc-950 rounded-lg group transition-colors">
                <button 
                  onClick={() => toggleAgenda(agenda.id)}
                  className={`flex items-center gap-3 cursor-pointer flex-1 min-w-0 text-left transition-opacity ${selectedAgendas.includes(agenda.id) ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: agenda.cor }}></div>
                  <span className={`text-sm truncate ${selectedAgendas.includes(agenda.id) ? 'font-semibold text-zinc-800 dark:text-zinc-100' : 'font-medium text-zinc-500 dark:text-zinc-400'}`}>
                    {agenda.nome}
                  </span>
                </button>
                <button
                  onClick={() => { setTransferSourceId(agenda.id); setIsTransferModalOpen(true); }}
                  title="Transferir Agendamentos"
                  className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
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
