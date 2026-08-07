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
    <div className="relative mb-4 px-4 mt-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-zinc-200"
      >
        <div className="flex items-center gap-2 truncate">
          <Building2 className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span className="truncate">{currentUnidade?.nome || 'Selecione uma unidade'}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          <div className="px-3 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-50 border-b border-zinc-100">
            Alternar Unidade
          </div>
          <div className="max-h-60 overflow-y-auto">
            {unidades.map(unidade => (
              <button
                key={unidade.id}
                onClick={() => handleSelect(unidade.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-left hover:bg-zinc-50 transition-colors"
              >
                <span className={unidade.id === currentUnidadeId ? 'font-semibold text-blue-600' : 'text-zinc-700 font-medium'}>
                  {unidade.nome}
                </span>
                {unidade.id === currentUnidadeId && <Check className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
