'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Blocks, Zap, Bell, Code, ChevronDown, ChevronRight } from 'lucide-react';

export default function AutomationsDropdown({ baseUrl }: { baseUrl: string }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(`${baseUrl}/automations`);
  const [isOpen, setIsOpen] = useState(isActive);

  return (
    <div className="space-y-1">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-zinc-100 dark:bg-zinc-800 transition-colors ${
          isActive && !isOpen ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold' : 'text-zinc-700 dark:text-zinc-300 font-medium'
        } text-sm`}
      >
        <div className="flex items-center gap-3">
          <Blocks className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-zinc-500 dark:text-zinc-400'}`} />
          <span>Automações</span>
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
            href={`${baseUrl}/automations?tab=n8n`}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            N8N Nativo
          </Link>
          <Link 
            href={`${baseUrl}/automations?tab=reminders`}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            Lembretes
          </Link>
          <Link 
            href={`${baseUrl}/automations?tab=api`}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
            API Geral
          </Link>
        </div>
      )}
    </div>
  );
}
