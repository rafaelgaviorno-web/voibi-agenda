import Link from 'next/link';

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100 font-sans">
      <aside className="w-64 bg-black flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <h1 className="text-xl font-bold tracking-tight text-white">Voibi Agenda</h1>
          <p className="text-xs text-zinc-500 mt-1">Superadmin (Mestre)</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/superadmin" className="block px-3 py-2 rounded-md bg-zinc-800 text-white hover:bg-zinc-700 text-sm font-medium transition-colors">
            Empresas (Tenants)
          </Link>
          <Link href="/superadmin/planos" className="block px-3 py-2 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white text-sm font-medium transition-colors">
            Planos SaaS
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-zinc-900 p-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
