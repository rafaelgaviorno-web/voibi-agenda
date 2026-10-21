'use client';

import { useState } from 'react';
import { User, LogOut, Lock, Moon, Sun, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { logout } from '@/app/login/actions';
import { navIcon, navItem, navItemIdle } from './navStyles';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await logout();
    router.push('/login');
  };

  const isDark = resolvedTheme === 'dark';

  return (
    <div className="mt-auto border-t border-zinc-200 dark:border-zinc-800 p-3">
      {isOpen && (
        <div className="pb-2 space-y-0.5">
          <Link 
            href="/redefinir-senha" 
            className={`${navItem} ${navItemIdle}`}
          >
            <Lock className={navIcon} />
            Alterar Senha
          </Link>
          
          <button 
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`${navItem} ${navItemIdle}`}
          >
            {isDark ? <Sun className={navIcon} /> : <Moon className={navIcon} />}
            Tema {isDark ? 'Claro' : 'Escuro'}
          </button>

          <button 
            onClick={handleLogout}
            className={`${navItem} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10`}
          >
            <LogOut className={navIcon} />
            Sair da conta
          </button>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`${navItem} justify-between ${navItemIdle} ${isOpen ? 'bg-zinc-100 dark:bg-zinc-800/70' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-500/15 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-brand-600 dark:text-brand-300" />
          </div>
          <span className="text-zinc-700 dark:text-zinc-300">Meu Perfil</span>
        </div>
        <ChevronUp className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? '' : 'rotate-180'}`} />
      </button>
    </div>
  );
}
