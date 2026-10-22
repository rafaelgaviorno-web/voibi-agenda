'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, Check, Layers } from 'lucide-react';

// Escolha da unidade no topo do calendário. "all" mostra as agendas de todas as unidades juntas.
export default function UnidadeSwitcher({ unidades, currentUnidadeId }: { unidades: any[], currentUnidadeId: string, baseUrl?: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isOpen]);

  if (!unidades || unidades.length < 2) return null;

  const isAll = currentUnidadeId === 'all';
  const currentUnidade = unidades.find(u => u.id === currentUnidadeId) || unidades[0];

  const handleSelect = (unidadeId: string) => {
    // Lembra a escolha por 1 ano
    document.cookie = `voibi_unidade_id=${unidadeId}; path=/; max-age=31536000`;
    setIsOpen(false);
    router.refresh();
  };

  const options = [{ id: 'all', nome: 'Todas as unidades' }, ...unidades];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="h-10 flex items-center gap-2.5 max-w-[16rem] pl-3 pr-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-sm transition-colors"
      >
        <span className="w-6 h-6 shrink-0 rounded-md bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center">
          {isAll ? <Layers className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
        </span>
        <span className="min-w-0 text-left leading-tight">
          <span className="block text-[10.5px] font-bold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">Unidade</span>
          <span className="block font-bold text-zinc-900 dark:text-white truncate">{isAll ? 'Todas as unidades' : currentUnidade?.nome}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div role="listbox" className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-zinc-900/10 z-50 overflow-hidden py-1">
          {options.map((unidade, i) => {
            const selected = unidade.id === currentUnidadeId || (!isAll && unidade.id === currentUnidade?.id && i > 0);
            return (
              <button
                key={unidade.id}
                role="option"
                aria-selected={selected}
                onClick={() => handleSelect(unidade.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${i === 0 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
              >
                <span className={`flex items-center gap-2 ${selected ? 'font-bold text-brand-700 dark:text-brand-300' : 'text-zinc-700 dark:text-zinc-300 font-medium'}`}>
                  {i === 0 && <Layers className="w-4 h-4 opacity-70" />}
                  {unidade.nome}
                </span>
                {selected && <Check className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
