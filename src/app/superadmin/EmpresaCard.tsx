'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, X, AlertTriangle } from 'lucide-react';
import { updateEmpresa, deleteEmpresa } from './actions';

const input =
  'w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15';
const label = 'text-sm font-medium text-zinc-300';

export default function EmpresaCard({ empresa, planos }: { empresa: any; planos: any[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view');
  const [error, setError] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [isPending, startTransition] = useTransition();

  const close = () => {
    setMode('view');
    setError('');
    setConfirmName('');
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError('');
    startTransition(async () => {
      const res = await updateEmpresa(empresa.id, {
        nome: String(fd.get('nome') || ''),
        slug: String(fd.get('slug') || ''),
        cnpj: String(fd.get('cnpj') || ''),
        plano_id: String(fd.get('plano_id') || ''),
      });
      if (!res.success) return setError(res.error || 'Erro ao salvar.');
      close();
      router.refresh();
    });
  };

  const handleDelete = () => {
    setError('');
    startTransition(async () => {
      const res = await deleteEmpresa(empresa.id);
      if (!res.success) return setError(res.error || 'Erro ao excluir.');
      close();
      router.refresh();
    });
  };

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col h-full">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h4 className="text-lg font-bold text-white min-w-0 truncate">{empresa.nome}</h4>
          <div className="flex items-center gap-1 shrink-0 -mr-1.5 -mt-1">
            <button
              onClick={() => setMode('edit')}
              title="Editar empresa"
              aria-label={`Editar ${empresa.nome}`}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode('delete')}
              title="Excluir empresa"
              aria-label={`Excluir ${empresa.nome}`}
              className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-zinc-400 mb-1">Slug: {empresa.slug}</p>
        {empresa.cnpj && <p className="text-xs text-zinc-400 mb-1">CNPJ: {empresa.cnpj}</p>}
        <p className="text-xs font-semibold text-brand-400 mb-6">Plano: {empresa.agend_planos?.nome || 'Sem plano'}</p>
        <div className="mt-auto space-y-2">
          <Link
            href={`/dashboard/${empresa.id}/calendar`}
            className="block text-center w-full bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Acessar Painel (Admin)
          </Link>
          <Link
            href={`/${empresa.slug}`}
            target="_blank"
            className="block text-center w-full bg-transparent border border-zinc-700 text-white hover:bg-zinc-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Ver Link Público
          </Link>
        </div>
      </div>

      {mode !== 'view' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={close}>
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">
                {mode === 'edit' ? 'Editar empresa' : 'Excluir empresa'}
              </h3>
              <button onClick={close} aria-label="Fechar" className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            {mode === 'edit' && (
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label htmlFor={`nome-${empresa.id}`} className={label}>Nome da Clínica</label>
                  <input id={`nome-${empresa.id}`} required name="nome" defaultValue={empresa.nome} className={input} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor={`slug-${empresa.id}`} className={label}>Slug (URL)</label>
                    <input id={`slug-${empresa.id}`} required name="slug" defaultValue={empresa.slug} className={input} />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={`cnpj-${empresa.id}`} className={label}>CNPJ (Opcional)</label>
                    <input id={`cnpj-${empresa.id}`} name="cnpj" defaultValue={empresa.cnpj || ''} placeholder="00.000.000/0000-00" className={input} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label htmlFor={`plano-${empresa.id}`} className={label}>Plano SaaS</label>
                  <select id={`plano-${empresa.id}`} name="plano_id" defaultValue={empresa.plano_id || ''} className={input}>
                    <option value="">Sem plano</option>
                    {planos.map((plano) => (
                      <option key={plano.id} value={plano.id}>
                        {plano.nome} (R$ {Number(plano.preco_mensal).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-zinc-500">
                  Trocar o slug muda o link público da clínica. Links antigos enviados aos pacientes deixam de funcionar.
                </p>

                {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={close} className="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 rounded-lg">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50"
                  >
                    {isPending ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </form>
            )}

            {mode === 'delete' && (
              <div className="p-6 space-y-4">
                <div className="flex gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-200">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                  <p>
                    Isso apaga <strong>definitivamente</strong> a empresa <strong>{empresa.nome}</strong> e tudo dela: agendas,
                    agendamentos, pacientes, procedimentos, unidades, lembretes, logs e os logins da equipe. Não dá para desfazer.
                  </p>
                </div>
                <div className="space-y-1">
                  <label htmlFor={`confirm-${empresa.id}`} className={label}>
                    Para confirmar, digite <span className="font-semibold text-white">{empresa.nome}</span>
                  </label>
                  <input
                    id={`confirm-${empresa.id}`}
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    autoComplete="off"
                    className={input}
                  />
                </div>

                {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={close} className="px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 rounded-lg">
                    Cancelar
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isPending || confirmName.trim() !== empresa.nome.trim()}
                    className="px-5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'Excluindo...' : 'Excluir empresa'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
