import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarCheck, Clock, MessageCircle, Video, ShieldCheck, Bell } from 'lucide-react';
import VoibiLogo from '@/components/VoibiLogo';
import { EMPRESA_LEGAL as E } from '@/components/LegalPage';

// Página inicial pública do Voibi Agenda: explica o produto (exigência do Google para verificar o app OAuth)
export const metadata: Metadata = {
  title: 'Voibi Agenda: agendamento online para clínicas',
  description:
    'Voibi Agenda é o sistema de agendamento online da Voibi para clínicas e consultórios: agenda dos profissionais, página de agendamento, agendamento por assistente virtual no WhatsApp e integração com Google Agenda e Google Meet.',
};

const recursos = [
  { icon: CalendarCheck, titulo: 'Agenda dos profissionais', texto: 'Horários de atendimento, intervalos, bloqueios e feriados de cada profissional, em uma agenda só.' },
  { icon: Clock, titulo: 'Agendamento online 24h', texto: 'Página pública onde o cliente escolhe o dia e o horário livre e confirma o agendamento.' },
  { icon: MessageCircle, titulo: 'Assistente virtual no WhatsApp', texto: 'A IA da clínica consulta horários, agenda, remarca e cancela direto na agenda, pela API do Voibi Agenda.' },
  { icon: Bell, titulo: 'Lembretes e confirmações', texto: 'Avisos automáticos antes do horário para reduzir faltas.' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <VoibiLogo size="md" />
          <Link href="/login" className="text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition-colors">
            Entrar
          </Link>
        </div>
      </header>

      <main>
        <section className="max-w-5xl mx-auto px-5 pt-14 pb-10">
          <p className="text-sm font-semibold text-brand-600">Voibi Agenda</p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white max-w-3xl leading-[1.08]">
            Agendamento online para clínicas e consultórios
          </h1>
          <p className="mt-5 text-lg max-w-2xl text-zinc-600 dark:text-zinc-400">
            O Voibi Agenda organiza a agenda dos profissionais e recebe agendamentos pela página da clínica, pelo painel da
            recepção e pelo assistente virtual no WhatsApp. É um produto da {E.marca}, usado pelas clínicas clientes da {E.marca}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors">
              Acessar o painel
            </Link>
            <a href={`mailto:${E.email}`} className="border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 px-5 py-3 rounded-xl font-semibold transition-colors">
              Falar com a Voibi
            </a>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-5 pb-12 grid gap-4 sm:grid-cols-2">
          {recursos.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
              <Icon className="w-6 h-6 text-brand-600" />
              <h2 className="mt-3 font-bold text-zinc-900 dark:text-white">{titulo}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{texto}</p>
            </div>
          ))}
        </section>

        <section className="bg-zinc-50 dark:bg-zinc-900 border-y border-zinc-200 dark:border-zinc-800">
          <div className="max-w-5xl mx-auto px-5 py-12 grid gap-8 md:grid-cols-[1fr_1.4fr]">
            <div>
              <Video className="w-7 h-7 text-brand-600" />
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Integração com Google Agenda e Google Meet
              </h2>
            </div>
            <div className="space-y-3 text-[15px] leading-relaxed">
              <p>
                Cada profissional pode, se quiser, conectar a própria conta Google à sua agenda no Voibi Agenda. Com a
                conexão, o Voibi Agenda usa as APIs do Google somente para:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>criar no Google Agenda do profissional um evento para cada agendamento feito no Voibi Agenda, com link do Google Meet para atendimentos online;</li>
                <li>atualizar ou excluir esse evento quando o agendamento é remarcado ou cancelado;</li>
                <li>consultar os horários em que o profissional está ocupado, para não oferecer esses horários aos clientes.</li>
              </ul>
              <p>
                O Voibi Agenda não lê o conteúdo dos outros eventos do calendário, não vende dados, não usa dados do Google
                para publicidade nem para treinar inteligência artificial, e não gera nem manipula imagens ou qualquer
                conteúdo de mídia. A conexão pode ser desfeita a qualquer momento. Detalhes na{' '}
                <Link href="/privacidade" className="text-brand-600 underline">Política de Privacidade</Link>.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-5 py-12 flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-brand-600 shrink-0" />
          <p className="text-[15px] leading-relaxed">
            Os dados são tratados de acordo com a LGPD. Cada clínica acessa somente os próprios dados, com usuário e senha, e
            o acesso ao Google fica guardado no servidor, nunca no navegador.
          </p>
        </section>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-5 py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
          <span>Voibi Agenda · {E.razaoSocial} · CNPJ {E.cnpj}</span>
          <nav className="flex gap-4">
            <Link href="/privacidade" className="hover:text-zinc-900 dark:hover:text-white">Política de Privacidade</Link>
            <Link href="/termos" className="hover:text-zinc-900 dark:hover:text-white">Termos de Serviço</Link>
            <a href={`mailto:${E.email}`} className="hover:text-zinc-900 dark:hover:text-white">{E.email}</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
