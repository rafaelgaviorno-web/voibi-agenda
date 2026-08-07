'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Settings, Stethoscope, Users, CalendarDays, ChevronDown, ChevronRight, CalendarX, Building2 } from 'lucide-react';

export default function SettingsDropdown({ baseUrl }: { baseUrl: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isActive = pathname.startsWith(`${baseUrl}/settings`);
  const [isOpen, setIsOpen] = useState(isActive);

  return (
    <div className="space-y-1 mt-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-zinc-100 transition-colors ${
          isActive && !isOpen ? 'bg-zinc-100 text-zinc-900 font-semibold' : 'text-zinc-700 font-medium'
        } text-sm`}
      >
        <div className="flex items-center gap-3">
          <Settings className={`w-4 h-4 ${isActive ? 'text-zinc-700' : 'text-zinc-500'}`} />
          <span>Configurações</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        )}
      </button>
      
      {isOpen && (
        <div className="pl-10 pr-3 py-1 space-y-1">
          <Link 
            href={`${baseUrl}/settings?tab=procedimentos`}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${isActive && searchParams.get('tab') !== 'usuarios' && searchParams.get('tab') !== 'agendas' && searchParams.get('tab') !== 'bloqueios' && searchParams.get('tab') !== 'unidades' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'}`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            Procedimentos
          </Link>
          <Link 
            href={`${baseUrl}/settings?tab=unidades`}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${isActive && searchParams.get('tab') === 'unidades' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'}`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Unidades
          </Link>
          <Link 
            href={`${baseUrl}/settings?tab=agendas`}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${isActive && searchParams.get('tab') === 'agendas' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'}`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Agendas (Profissionais)
          </Link>
          <Link 
            href={`${baseUrl}/settings?tab=usuarios`}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${isActive && searchParams.get('tab') === 'usuarios' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'}`}
          >
            <Users className="w-3.5 h-3.5" />
            Equipe e Acessos
          </Link>
          <Link 
            href={`${baseUrl}/settings?tab=bloqueios`}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors ${isActive && searchParams.get('tab') === 'bloqueios' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'}`}
          >
            <CalendarX className="w-3.5 h-3.5" />
            Bloqueios e Exceções
          </Link>
        </div>
      )}
    </div>
  );
}
