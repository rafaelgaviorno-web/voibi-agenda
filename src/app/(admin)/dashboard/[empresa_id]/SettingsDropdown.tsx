'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Settings, Stethoscope, Users, CalendarDays, ChevronDown, CalendarX, Building2, Key } from 'lucide-react';
import { navIcon, navItem, navItemActive, navItemIdle, subItem, subItemActive, subItemIdle, subNav } from './navStyles';

export default function SettingsDropdown({ baseUrl }: { baseUrl: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isActive = pathname.startsWith(`${baseUrl}/settings`);
  const [isOpen, setIsOpen] = useState(isActive);

  const tab = searchParams.get('tab');
  const otherTabs = ['usuarios', 'agendas', 'bloqueios', 'unidades'];

  const links = [
    { href: `${baseUrl}/settings?tab=procedimentos`, label: 'Procedimentos', icon: Stethoscope, active: isActive && !otherTabs.includes(tab || '') },
    { href: `${baseUrl}/settings?tab=unidades`, label: 'Unidades', icon: Building2, active: isActive && tab === 'unidades' },
    { href: `${baseUrl}/settings?tab=agendas`, label: 'Agendas (Profissionais)', icon: CalendarDays, active: isActive && tab === 'agendas' },
    { href: `${baseUrl}/settings?tab=usuarios`, label: 'Equipe e Acessos', icon: Users, active: isActive && tab === 'usuarios' },
    { href: `${baseUrl}/settings?tab=bloqueios`, label: 'Bloqueios e Exceções', icon: CalendarX, active: isActive && tab === 'bloqueios' },
    { href: `${baseUrl}/automations?tab=api`, label: 'Chave de API & Integrações', icon: Key, active: false },
  ];

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${navItem} justify-between ${isActive && !isOpen ? navItemActive : navItemIdle}`}
      >
        <div className="flex items-center gap-3">
          <Settings className={navIcon} />
          <span>Configurações</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
      </button>

      {isOpen && (
        <div className={subNav}>
          {links.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              className={`${subItem} ${active ? subItemActive : subItemIdle}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
