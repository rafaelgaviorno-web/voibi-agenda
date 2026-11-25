'use client';

import { useState, useTransition } from 'react';
import { CalendarCheck, Video, AlertTriangle, CheckCircle2, Unlink } from 'lucide-react';

const STATUS_MSG: Record<string, { ok: boolean; text: string }> = {
  conectado: { ok: true, text: 'Google Agenda conectado. Os próximos agendamentos já vão para o calendário, com link do Meet.' },
  cancelado: { ok: false, text: 'A conexão foi cancelada na tela do Google.' },
  sem_token: { ok: false, text: 'O Google não devolveu a autorização completa. Clique em conectar de novo e aceite todas as permissões.' },
  sem_acesso: { ok: false, text: 'Você não tem acesso a esta agenda.' },
  nao_configurado: { ok: false, text: 'A integração com o Google ainda não foi configurada no servidor (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET).' },
  erro: { ok: false, text: 'Não foi possível concluir a conexão com o Google. Tente de novo.' },
};

export default function GoogleAgendaCard({ empresaId, agendaId, conta, disponivel, status, onDisconnect, onSaveOpcoes }: any) {
  const [bloquear, setBloquear] = useState<boolean>(conta?.bloquear_ocupados ?? true);
  const [meet, setMeet] = useState<boolean>(conta?.criar_meet ?? true);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const msg = status ? STATUS_MSG[status] : null;
  const connectHref = `/api/google/connect?empresa=${encodeURIComponent(empresaId)}&agenda=${encodeURIComponent(agendaId)}`;

  const salvar = (next: { bloquear_ocupados: boolean; criar_meet: boolean }) => {
    setFeedback(null);
    startTransition(async () => {
      try {
        await onSaveOpcoes(next);
        setFeedback('Preferências salvas.');
      } catch {
        setFeedback('Não foi possível salvar.');
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-4">
      {msg && (
        <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${msg.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Google Agenda e Google Meet</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Cada agendamento desta agenda vira um evento no Google Agenda do profissional, com link do Google Meet.
              Remarcações e cancelamentos são atualizados no Google automaticamente.
            </p>

            {!disponivel && (
              <p className="mt-4 text-sm text-amber-700">
                A integração ainda não foi configurada no servidor. Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e APP_URL.
              </p>
            )}

            {disponivel && !conta && (
              <a href={connectHref} className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <CalendarCheck className="w-4 h-4" /> Conectar Google Agenda
              </a>
            )}

            {conta && (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold"><CheckCircle2 className="w-4 h-4" /> Conectado</span>
                  <span className="text-zinc-600 dark:text-zinc-300 break-all">{conta.email || 'Conta Google'}</span>
                </div>

                {conta.ultimo_erro && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Última falha ao falar com o Google: {conta.ultimo_erro}. Se continuar, desconecte e conecte de novo.</span>
                  </div>
                )}

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={meet} disabled={pending}
                    onChange={(e) => { setMeet(e.target.checked); salvar({ bloquear_ocupados: bloquear, criar_meet: e.target.checked }); }}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-zinc-300" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium inline-flex items-center gap-1"><Video className="w-4 h-4" /> Criar link do Google Meet</span>
                    <span className="block text-xs text-zinc-500">O link volta na API de agendamento e no webhook (campo meet_link), para a IA enviar ao cliente.</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={bloquear} disabled={pending}
                    onChange={(e) => { setBloquear(e.target.checked); salvar({ bloquear_ocupados: e.target.checked, criar_meet: meet }); }}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-zinc-300" />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium">Compromissos do Google bloqueiam horários</span>
                    <span className="block text-xs text-zinc-500">Horários ocupados no Google Agenda deixam de ser oferecidos aqui.</span>
                  </span>
                </label>

                <div className="flex items-center gap-3 pt-2">
                  <button type="button" disabled={pending}
                    onClick={() => startTransition(async () => { await onDisconnect(); })}
                    className="inline-flex items-center gap-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                    <Unlink className="w-4 h-4" /> Desconectar
                  </button>
                  {feedback && <span className="text-xs text-zinc-500">{feedback}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
