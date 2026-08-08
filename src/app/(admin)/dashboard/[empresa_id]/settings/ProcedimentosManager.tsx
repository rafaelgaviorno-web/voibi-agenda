'use client';

import { useState } from 'react';
import { Clock, Plus, Trash2, Edit2, X, Check } from 'lucide-react';

export default function ProcedimentosManager({ 
  initialProcedimentos, 
  empresa_id,
  unidades,
  createProcedimento,
  updateProcedimento,
  deleteProcedimento 
}: { 
  initialProcedimentos: any[],
  empresa_id: string,
  unidades: any[],
  createProcedimento: (data: FormData) => Promise<void>,
  updateProcedimento: (data: FormData) => Promise<void>,
  deleteProcedimento: (data: FormData) => Promise<void>
}) {
  const [procedimentos, setProcedimentos] = useState(initialProcedimentos);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editDuracao, setEditDuracao] = useState(30);
  const [editUnidade, setEditUnidade] = useState('');
  const [editIsRecorrente, setEditIsRecorrente] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleCreate(formData: FormData) {
    if (empresa_id === 'mock-clinic') {
       const nome = formData.get('nome') as string;
       const duracao = parseInt(formData.get('duracao') as string) || 30;
       const unidade_id = formData.get('unidade_id') as string;
       const isRecorrente = formData.get('is_recorrente') === 'true';
       const newProc = { id: `proc-mock-${Date.now()}`, nome, duracao_minutos: duracao, is_recorrente: isRecorrente, unidade_id };
       setProcedimentos([...procedimentos, newProc]);
       // Reset form
       const form = document.getElementById('form-create-proc') as HTMLFormElement;
       if (form) form.reset();
       return;
    }
    
    setIsPending(true);
    await createProcedimento(formData);
    setIsPending(false);
  }

  async function handleDelete(id: string) {
    if (empresa_id === 'mock-clinic') {
       setProcedimentos(procedimentos.filter(p => p.id !== id));
       return;
    }
    
    setIsPending(true);
    const fd = new FormData();
    fd.append('id', id);
    await deleteProcedimento(fd);
    setIsPending(false);
  }

  function startEdit(p: any) {
    setEditingId(p.id);
    setEditNome(p.nome);
    setEditDuracao(p.duracao_minutos);
    setEditUnidade(p.unidade_id || '');
    setEditIsRecorrente(p.is_recorrente);
  }

  async function saveEdit(id: string) {
    if (empresa_id === 'mock-clinic') {
       setProcedimentos(procedimentos.map(p => 
         p.id === id ? { ...p, nome: editNome, duracao_minutos: editDuracao, unidade_id: editUnidade, is_recorrente: editIsRecorrente } : p
       ));
       setEditingId(null);
       return;
    }
    
    setIsPending(true);
    const fd = new FormData();
    fd.append('id', id);
    fd.append('nome', editNome);
    fd.append('duracao', editDuracao.toString());
    fd.append('unidade_id', editUnidade);
    fd.append('is_recorrente', editIsRecorrente.toString());
    await updateProcedimento(fd);
    setEditingId(null);
    setIsPending(false);
  }

  return (
    <div className="p-5">
      <form id="form-create-proc" action={handleCreate} className="flex flex-col sm:flex-row flex-wrap gap-4 items-end mb-6">
        <div className="flex-1 min-w-[200px] space-y-1.5 w-full">
           <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome do Procedimento</label>
           <input required name="nome" disabled={isPending} className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" placeholder="Ex: Consulta Inicial" />
        </div>
        <div className="w-full sm:w-32 space-y-1.5">
           <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Minutos</label>
           <input type="number" required name="duracao" defaultValue="30" min="5" step="5" disabled={isPending} className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
        </div>
        {unidades && unidades.length > 0 && (
          <div className="w-full sm:w-48 space-y-1.5">
             <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Unidade (Opcional)</label>
             <select name="unidade_id" disabled={isPending} className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer">
               <option value="">Todas (Geral)</option>
               {unidades.map(u => (
                 <option key={u.id} value={u.id}>{u.nome}</option>
               ))}
             </select>
          </div>
        )}
        <div className="w-full sm:w-auto space-y-1.5 flex flex-col justify-end pb-2">
           <label className="flex items-center gap-2 cursor-pointer">
             <input type="checkbox" name="is_recorrente" value="true" disabled={isPending} className="rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 w-4 h-4" />
             <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Recorrência Mensal</span>
           </label>
        </div>
        <button type="submit" disabled={isPending} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shrink-0">
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </form>

      <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
          <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-700 text-xs uppercase text-zinc-500 dark:text-zinc-400 font-semibold">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3 w-32">Duração</th>
              {unidades && unidades.length > 0 && (
                <th className="px-4 py-3 w-40">Unidade</th>
              )}
              <th className="px-4 py-3 w-40 text-center">Recorrência</th>
              <th className="px-4 py-3 w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {procedimentos.map(p => {
              const isEditing = editingId === p.id;
              
              return (
                <tr key={p.id} className="hover:bg-zinc-50/50 dark:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={editNome} 
                        onChange={e => setEditNome(e.target.value)} 
                        className="w-full border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none" 
                        autoFocus 
                      />
                    ) : (
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{p.nome}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          value={editDuracao} 
                          onChange={e => setEditDuracao(parseInt(e.target.value) || 0)} 
                          className="w-16 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none" 
                        />
                        <span className="text-zinc-500 dark:text-zinc-400">min</span>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        {p.duracao_minutos} min
                      </span>
                    )}
                  </td>
                  {unidades && unidades.length > 0 && (
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select 
                          value={editUnidade} 
                          onChange={e => setEditUnidade(e.target.value)} 
                          className="w-full border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none"
                        >
                          <option value="">Geral</option>
                          {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                        </select>
                      ) : (
                        <span className="text-zinc-600 dark:text-zinc-400 text-sm">
                          {p.unidade_id ? (unidades.find(u => u.id === p.unidade_id)?.nome || 'Geral') : 'Geral'}
                        </span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <input 
                        type="checkbox" 
                        checked={editIsRecorrente} 
                        onChange={e => setEditIsRecorrente(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                    ) : (
                      p.is_recorrente ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700">
                          Ativa
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400 font-medium">Não</span>
                      )
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(p.id)} disabled={isPending} className="text-green-600 hover:bg-green-50 p-1.5 rounded-md transition-colors" title="Salvar">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} disabled={isPending} className="text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-md transition-colors" title="Cancelar">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(p)} disabled={isPending} className="text-zinc-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition-colors" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} disabled={isPending} className="text-zinc-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {procedimentos.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  Nenhum procedimento cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
