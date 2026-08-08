'use client';

import { useState } from 'react';
import { User, LogOut, Lock, Moon, Sun, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Link from 'next/link';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie = 'voibi-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/login');
  };

  return (
    <div className="mt-auto border-t border-zinc-200 dark:border-zinc-800">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Meu Perfil</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-1">
          <Link 
            href="/redefinir-senha" 
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-400 transition-colors"
          >
            <Lock className="w-4 h-4" />
            Alterar Senha
          </Link>
          
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-400 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            Tema {theme === 'dark' ? 'Claro' : 'Escuro'}
          </button>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium text-red-600 dark:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </button>
        </div>
      )}
    </div>
  );
}
