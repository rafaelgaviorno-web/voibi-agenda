'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Check } from 'lucide-react';

export default function UnidadeSwitcher({ unidades, currentUnidadeId, baseUrl }: { unidades: any[], currentUnidadeId: string, baseUrl: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const currentUnidade = unidades.find(u => u.id === currentUnidadeId) || unidades[0];

  const handleSelect = (unidadeId: string) => {
    // Set cookie that expires in 365 days
    document.cookie = `voibi_unidade_id=${unidadeId}; path=/; max-age=31536000`;
    setIsOpen(false);
    // Refresh to apply changes server-side
    router.refresh();
  };

  if (!unidades || unidades.length === 0) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 max-w-[14rem] bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-zinc-200 dark:border-zinc-700"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
          <span className="truncate">{currentUnidade?.nome || 'Selecione uma unidade'}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1.5 w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl shadow-zinc-900/10 z-50 overflow-hidden">
          <div className="px-3 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
            Alternar Unidade
          </div>
          <div className="max-h-60 overflow-y-auto">
            {unidades.map(unidade => (
              <button
                key={unidade.id}
                onClick={() => handleSelect(unidade.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <span className={unidade.id === currentUnidadeId ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-zinc-700 dark:text-zinc-300 font-medium'}>
                  {unidade.nome}
                </span>
                {unidade.id === currentUnidadeId && <Check className="w-4 h-4 text-brand-600 dark:text-brand-400" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
