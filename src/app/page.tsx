import React from "react";
import Link from 'next/link';

export default function Home() {
  const empresas = [
    { id: 'c89d25a6-91f0-4f24-abdd-acabbabcfee3', nome: 'Voibi Clínica (VPS)', slug: 'voibi-vps' }
  ];

  return (
    <div className="flex min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-6 flex flex-col hidden md:flex">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
            V
          </div>
          <h1 className="text-xl font-bold tracking-tight">Voibi Agenda</h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            Início
          </Link>
        </nav>
        
        <div className="mt-auto pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
              <span className="font-medium text-sm text-zinc-500 dark:text-zinc-400">RG</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">Rafael Gaviorno</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-8 flex items-center justify-between z-10 sticky top-0">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Suas Clínicas</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Selecione uma clínica para testar a agenda</p>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {empresas.map((empresa) => (
              <div key={empresa.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{empresa.nome}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Slug: {empresa.slug}</p>
                
                <div className="mt-auto space-y-3">
                  <Link 
                    href={`/dashboard/${empresa.id}/calendar`}
                    className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    Acessar Agenda Oficial
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
