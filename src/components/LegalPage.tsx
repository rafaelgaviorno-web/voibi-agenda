import Link from 'next/link';
import VoibiLogo from '@/components/VoibiLogo';

export const EMPRESA_LEGAL = {
  razaoSocial: 'RG da Silva Soluções e Serviços',
  cnpj: '43.727.777/0001-65',
  marca: 'Voibi',
  produto: 'Voibi Agenda',
  email: 'rafael@voibi.digital',
  site: 'https://agenda.voibi.com.br',
  atualizadoEm: '25 de novembro de 2026',
};

export default function LegalPage({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-5 py-5 flex items-center justify-between gap-4">
          <Link href="/" aria-label="Voibi Agenda"><VoibiLogo size="sm" /></Link>
          <nav className="flex gap-4 text-sm text-zinc-500">
            <Link href="/privacidade" className="hover:text-zinc-900 dark:hover:text-white">Privacidade</Link>
            <Link href="/termos" className="hover:text-zinc-900 dark:hover:text-white">Termos</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">{titulo}</h1>
        <p className="mt-2 text-sm text-zinc-500">Última atualização: {EMPRESA_LEGAL.atualizadoEm}</p>
        <div className="legal mt-8 space-y-4 text-[15px] leading-relaxed [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-zinc-900 dark:[&_h2]:text-white [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-blue-600 [&_a]:underline">
          {children}
        </div>
      </main>
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-5 py-6 text-xs text-zinc-500">
          {EMPRESA_LEGAL.razaoSocial} · CNPJ {EMPRESA_LEGAL.cnpj} · {EMPRESA_LEGAL.email}
        </div>
      </footer>
    </div>
  );
}
