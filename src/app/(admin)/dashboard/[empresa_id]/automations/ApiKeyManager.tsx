'use client';

import { useState } from 'react';
import { Key, Copy, Check, Eye, EyeOff, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';

interface ApiKeyManagerProps {
  initialApiKey: string;
  empresa_id: string;
  onApiKeyRegenerated?: (newKey: string) => void;
  onRegenerateKeyAction: () => Promise<{ success: boolean; newApiKey?: string; error?: string }>;
}

export default function ApiKeyManager({
  initialApiKey,
  empresa_id,
  onApiKeyRegenerated,
  onRegenerateKeyAction
}: ApiKeyManagerProps) {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleCopy = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmRegenerate = async () => {
    setIsRegenerating(true);
    setFeedback(null);
    try {
      const res = await onRegenerateKeyAction();
      if (res.success && res.newApiKey) {
        setApiKey(res.newApiKey);
        setIsRevealed(true); // Revela a nova chave para o usuário poder copiá-la
        if (onApiKeyRegenerated) {
          onApiKeyRegenerated(res.newApiKey);
        }
        setFeedback({
          type: 'success',
          message: 'Chave de API redefinida com sucesso! Certifique-se de atualizar suas integrações (N8N, MCP, IAs externas).'
        });
        setIsModalOpen(false);
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Falha ao redefinir a chave de API.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro inesperado ao redefinir a chave.'
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const maskedKey = apiKey
    ? isRevealed
      ? apiKey
      : apiKey.slice(0, 4) + '•'.repeat(Math.max(16, apiKey.length - 8)) + apiKey.slice(-4)
    : 'Nenhuma chave configurada';

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 shadow-sm space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Chave de API (API Key)</h3>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                Ativa
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Utilize no cabeçalho <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[11px]">Authorization: Bearer &lt;API_KEY&gt;</code>
            </p>
          </div>
        </div>

        {/* Botão de Redefinir / Resetar */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-200 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 rounded-lg transition-colors cursor-pointer"
          title="Revogar chave atual e gerar uma nova"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Redefinir Chave
        </button>
      </div>

      {/* Campo da Chave */}
      <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg p-2.5 flex items-center justify-between gap-2">
        <code className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 font-mono select-all overflow-hidden text-ellipsis flex-1">
          {maskedKey}
        </code>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsRevealed(!isRevealed)}
            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors"
            title={isRevealed ? "Ocultar chave" : "Revelar chave"}
          >
            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-md transition-colors"
            title="Copiar chave"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Feedback de Sucesso ou Erro */}
      {feedback && (
        <div
          className={`text-xs p-3 rounded-lg border flex items-start gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {feedback.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          </div>
          <p className="leading-relaxed flex-1">{feedback.message}</p>
        </div>
      )}

      {/* Aviso de Segurança */}
      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/60 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <span>
          Esta chave dá acesso completo aos agendamentos e horários desta clínica. Mantenha em segurança. Se suspeitar de vazamento, redefina-a imediatamente acima.
        </span>
      </p>

      {/* Modal de Confirmação de Reset */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">Redefinir Chave de API?</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Ação irreversível de segurança</p>
              </div>
            </div>

            <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 leading-relaxed bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <p>
                Ao redefinir sua chave de API:
              </p>
              <ul className="list-disc list-inside space-y-1 text-zinc-700 dark:text-zinc-300 font-medium">
                <li>A chave atual será <span className="text-rose-600 dark:text-rose-400 font-bold">invalidada imediatamente</span>.</li>
                <li>Todas as conexões ativas no <strong>N8N</strong>, <strong>MCP Servers</strong>, <strong>Typebot</strong> e <strong>robôs de IA</strong> deixarão de funcionar até que você informe a nova chave.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isRegenerating}
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRegenerating}
                onClick={handleConfirmRegenerate}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isRegenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Gerando nova chave...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sim, redefinir chave
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
