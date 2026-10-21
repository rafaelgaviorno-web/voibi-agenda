import Link from 'next/link';
import VoibiLogo from '@/components/VoibiLogo';

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark flex h-screen bg-zinc-950 text-zinc-100 font-sans">
      <aside className="w-64 bg-zinc-900/60 border-r border-zinc-800 flex flex-col">
        <div className="h-16 px-5 flex items-center border-b border-zinc-800">
          <VoibiLogo subtitle="Superadmin (Mestre)" />
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/superadmin" className="block px-3 py-2 rounded-lg bg-brand-500/10 text-brand-300 text-sm font-medium transition-colors">
            Empresas (Tenants)
          </Link>
          <Link href="/superadmin/planos" className="block px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800/70 hover:text-white text-sm font-medium transition-colors">
            Planos SaaS
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-zinc-950 p-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
