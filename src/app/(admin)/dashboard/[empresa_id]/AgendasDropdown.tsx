'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';

export default function AgendasDropdown({ agendas, baseUrl }: { agendas: any[], baseUrl: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Lê os IDs selecionados da URL, ou assume que todos estão selecionados se não houver parâmetro
  const agendasParam = searchParams.get('agendas');
  const selectedIds = agendasParam ? agendasParam.split(',') : agendas.map(a => a.id);

  const toggleAgenda = (id: string) => {
    let newSelected: string[];
    
    if (selectedIds.includes(id)) {
      newSelected = selectedIds.filter(selectedId => selectedId !== id);
    } else {
      newSelected = [...selectedIds, id];
    }
    
    // Se estivermos em outra página (ex: Configurações), ao clicar na agenda vamos para o calendário
    const isCalendarPage = pathname.includes('/calendar');
    const targetPath = isCalendarPage ? pathname : `${baseUrl}/calendar`;
    
    const newParams = new URLSearchParams(searchParams.toString());
    if (newSelected.length > 0) {
      newParams.set('agendas', newSelected.join(','));
    } else {
      newParams.set('agendas', 'none'); // Indica explicitamente que nenhum está selecionado
    }
    
    router.push(`${targetPath}?${newParams.toString()}`);
  };

  return (
    <details className="group [&_summary::-webkit-details-marker]:hidden" open>
      <summary className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-zinc-100 dark:bg-zinc-800 text-sm font-medium transition-colors cursor-pointer text-zinc-700 dark:text-zinc-300">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          Agendas
        </div>
        <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400 transition-transform group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </summary>
      <div className="mt-1 flex flex-col gap-1 pl-10 pr-2">
        <Link href={`${baseUrl}/agendas`} className="text-xs font-medium text-blue-600 hover:underline py-1.5 mb-1">
          Gerenciar Agendas
        </Link>
        {agendas.map(agenda => (
          <label key={agenda.id} className="flex items-center gap-2 py-1.5 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={selectedIds.includes(agenda.id)}
              onChange={() => toggleAgenda(agenda.id)}
              className="peer sr-only"
            />
            <div 
              className="w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-colors flex-shrink-0"
              style={{ 
                borderColor: agenda.cor || '#039be5', 
                backgroundColor: selectedIds.includes(agenda.id) ? (agenda.cor || '#039be5') : 'transparent' 
              }}
            >
              {selectedIds.includes(agenda.id) && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 14 14" fill="none">
                  <path d="M3 8L6 11L11 3.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor"/>
                </svg>
              )}
            </div>
            <span className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:text-zinc-100 transition-colors truncate">
              {agenda.nome}
            </span>
          </label>
        ))}
        {agendas.length === 0 && (
          <p className="text-xs text-zinc-400 py-1">Nenhuma agenda criada</p>
        )}
      </div>
    </details>
  );
}
