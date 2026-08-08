'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronDown, ChevronRight, ArrowRightLeft } from 'lucide-react';
import TransferModal from './calendar/TransferModal';
import { transferAppointments } from './calendar/actions';

export default function SidebarAgendas({ agendas, baseUrl, empresaId }: { agendas: any[], baseUrl: string, empresaId: string }) {
  const [isOpen, setIsOpen] = useState(true);
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

  const toggleAgenda = (id: string) => {
    let newSelected = [...selectedAgendas];
    if (newSelected.includes(id)) {
      newSelected = newSelected.filter(aId => aId !== id);
    } else {
      newSelected.push(id);
    }

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
        <div className="pl-6 pr-3 py-1 space-y-1">
          {agendas.map(agenda => (
            <div key={agenda.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-zinc-50 dark:bg-zinc-950 rounded-lg group transition-colors">
              <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                <input 
                  type="checkbox"
                  checked={selectedAgendas.includes(agenda.id)}
                  onChange={() => toggleAgenda(agenda.id)}
                  className="w-4 h-4 rounded text-indigo-600 border-zinc-300 dark:border-zinc-600 focus:ring-indigo-500/20"
                />
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: agenda.cor }}></div>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:text-zinc-100 truncate">{agenda.nome}</span>
              </label>
              <button
                onClick={() => { setTransferSourceId(agenda.id); setIsTransferModalOpen(true); }}
                title="Transferir Agendamentos"
                className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
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
