'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, ChevronsUpDown, Check } from 'lucide-react';

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || name.charAt(0).toUpperCase();

export default function UnidadeSwitcher({
  unidades,
  currentUnidadeId,
  baseUrl,
  variant = 'compact',
  empresaNome,
}: {
  unidades: any[];
  currentUnidadeId: string;
  baseUrl: string;
  // "sidebar": cartão da clínica no topo do menu lateral
  variant?: 'compact' | 'sidebar';
  empresaNome?: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const currentUnidade = unidades.find(u => u.id === currentUnidadeId) || unidades[0];
  const canSwitch = unidades.length > 1;

  const handleSelect = (unidadeId: string) => {
    // Set cookie that expires in 365 days
    document.cookie = `voibi_unidade_id=${unidadeId}; path=/; max-age=31536000`;
    setIsOpen(false);
    // Refresh to apply changes server-side
    router.refresh();
  };

  const menu = isOpen && (
    <div className={`absolute top-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl shadow-zinc-900/10 z-50 overflow-hidden ${variant === 'sidebar' ? 'left-0 right-0' : 'right-0 w-60'}`}>
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
  );

  if (variant === 'sidebar') {
    return (
      <div className="relative">
        <button
          onClick={() => canSwitch && setIsOpen(!isOpen)}
          disabled={!canSwitch}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] enabled:hover:bg-white/[0.07] text-left transition-colors disabled:cursor-default"
          aria-label={canSwitch ? 'Alternar unidade' : undefined}
        >
          <span className="w-8 h-8 shrink-0 rounded-[9px] bg-brand-500 text-white flex items-center justify-center text-xs font-extrabold">
            {initialsOf(empresaNome || 'Clínica')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-white truncate">{empresaNome}</span>
            {currentUnidade && <span className="block text-[11.5px] text-zinc-400 truncate">{currentUnidade.nome}</span>}
          </span>
          {canSwitch && <ChevronsUpDown className="w-4 h-4 text-zinc-400 shrink-0" />}
        </button>
        {menu}
      </div>
    );
  }

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
      {menu}
    </div>
  );
}
