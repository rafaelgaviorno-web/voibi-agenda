import { CalendarCheck, BellRing, Bot } from 'lucide-react';
import VoibiLogo, { VoibiMark } from './VoibiLogo';
import ThemeToggleLogin from '@/app/login/ThemeToggleLogin';

// Estilos compartilhados das telas de acesso (login, recuperação de senha)
export const authLabel = 'text-sm font-medium text-zinc-700 dark:text-zinc-300';
export const authInput =
  'w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-zinc-900 dark:text-white shadow-sm focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600';
export const authButton =
  'w-full bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-sm shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed';

export function AuthAlert({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const styles =
    type === 'error'
      ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300'
      : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300';
  return <div className={`border p-3 rounded-xl text-sm mb-6 ${styles}`}>{children}</div>;
}

const features = [
  { icon: CalendarCheck, text: 'Link de agendamento online para seus pacientes' },
  { icon: BellRing, text: 'Lembretes e confirmações automáticas' },
  { icon: Bot, text: 'Integração com IA, n8n e seu chat' },
];

export default function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-white dark:bg-zinc-950">
      {/* Painel da marca */}
      <aside className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 bg-zinc-950 text-white">
        <div
          aria-hidden="true"
          className="absolute -top-40 -left-40 w-[36rem] h-[36rem] rounded-full bg-brand-500/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-48 -right-24 w-[30rem] h-[30rem] rounded-full bg-brand-700/30 blur-3xl"
        />
        <VoibiMark
          mono
          className="absolute -right-24 bottom-10 w-[26rem] text-white/[0.04]"
        />

        <div className="relative flex items-center gap-2.5">
          <VoibiMark className="w-9 text-white" />
          <span className="text-2xl font-bold tracking-tight">
            voibi <span className="text-brand-400 font-semibold">agenda</span>
          </span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold tracking-tight leading-tight">
            Sua agenda organizada,
            <br />
            <span className="text-brand-300">sem esforço.</span>
          </h2>
          <ul className="mt-8 space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-zinc-300">
                <span className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-brand-300" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-zinc-500">© {new Date().getFullYear()} Voibi Digital</p>
      </aside>

      {/* Formulário */}
      <main className="relative flex items-center justify-center px-6 py-12">
        <ThemeToggleLogin />
        <div className="w-full max-w-sm">
          <VoibiLogo size="lg" className="lg:hidden mb-10" />
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">{title}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 mb-8">{description}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
