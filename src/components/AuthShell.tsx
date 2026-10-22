import { CalendarCheck, BellRing, Bot } from 'lucide-react';
import VoibiLogo, { VoibiMark } from './VoibiLogo';
import ThemeToggleLogin from '@/app/login/ThemeToggleLogin';

// Estilos compartilhados das telas de acesso (login, recuperação de senha)
export const authLabel = 'text-[13px] font-bold text-zinc-800 dark:text-zinc-200';
export const authInput =
  'w-full h-12 bg-white dark:bg-zinc-950/60 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 text-zinc-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500';
export const authButton =
  'w-full h-12 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 dark:bg-brand-400 dark:hover:bg-brand-300 text-white dark:text-zinc-950 font-extrabold rounded-xl transition-colors shadow-lg shadow-brand-600/25 disabled:opacity-50 disabled:cursor-not-allowed';

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
    <div className="min-h-screen grid lg:grid-cols-[1.15fr_1fr] bg-zinc-100 dark:bg-zinc-950">
      {/* Painel da marca, no tom escuro da logo */}
      <aside className="hidden lg:flex relative overflow-hidden flex-col justify-between px-14 py-12 bg-ink dark:bg-ink-deep text-white">
        <VoibiMark
          mono
          className="absolute -right-28 -bottom-20 w-[35rem] text-white/[0.06]"
        />

        <div className="relative flex items-center gap-3">
          <VoibiMark className="w-10 text-white" />
          <span className="text-[23px] font-extrabold tracking-tight">
            Voibi <span className="text-brand-400 font-bold">Agenda</span>
          </span>
        </div>

        <div className="relative max-w-[500px]">
          <h2 className="text-[44px] font-extrabold tracking-[-0.035em] leading-[1.08]">
            Sua agenda organizada, <span className="text-brand-300">sem esforço.</span>
          </h2>
          <ul className="mt-8 space-y-3.5">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3.5 text-[15px] text-zinc-200">
                <span className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px] text-brand-300" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[12.5px] text-zinc-400">© {new Date().getFullYear()} Voibi Digital</p>
      </aside>

      {/* Formulário em cartão sobre o fundo cinza-lilás */}
      <main className="relative flex items-center justify-center px-5 py-12">
        <ThemeToggleLogin />
        <div className="w-full max-w-[420px]">
          <VoibiLogo size="lg" className="lg:hidden mb-8 justify-center" />
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_24px_48px_-24px_rgba(18,19,31,0.25)] dark:shadow-none p-7 sm:p-9">
            <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-zinc-900 dark:text-white">{title}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 mb-7">{description}</p>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
