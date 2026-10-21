'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Blocks, Zap, Bell, Code, ChevronDown, Activity, Bot } from 'lucide-react';
import { navIcon, navItem, navItemActive, navItemIdle, subItem, subItemActive, subItemIdle, subNav } from './navStyles';

export default function AutomationsDropdown({ baseUrl }: { baseUrl: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isActive = pathname.startsWith(`${baseUrl}/automations`);
  const [isOpen, setIsOpen] = useState(isActive);

  const tab = searchParams.get('tab');
  const sub = searchParams.get('sub');

  const links = [
    { href: `${baseUrl}/automations?tab=logs`, label: 'Logs de Execução (API)', icon: Activity, active: tab === 'logs' },
    { href: `${baseUrl}/automations?tab=api&sub=mcp`, label: 'Servidor MCP (IA)', icon: Bot, active: tab === 'api' && sub === 'mcp' },
    { href: `${baseUrl}/automations?tab=api`, label: 'API Geral & IA', icon: Code, active: tab === 'api' && sub !== 'mcp' },
    { href: `${baseUrl}/automations?tab=n8n`, label: 'N8N Nativo', icon: Zap, active: tab === 'n8n' },
    { href: `${baseUrl}/automations?tab=reminders`, label: 'Lembretes', icon: Bell, active: tab === 'reminders' },
  ];

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${navItem} justify-between ${isActive && !isOpen ? navItemActive : navItemIdle}`}
      >
        <div className="flex items-center gap-3">
          <Blocks className={navIcon} />
          <span>Automações</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
      </button>

      {isOpen && (
        <div className={subNav}>
          {links.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              className={`${subItem} ${isActive && active ? subItemActive : subItemIdle}`}
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
