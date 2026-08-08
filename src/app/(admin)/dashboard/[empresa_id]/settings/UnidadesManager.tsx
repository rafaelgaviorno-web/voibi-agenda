'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit2, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UnidadesManager({ unidades, empresa_id }: { unidades: any[], empresa_id: string }) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Na vida real chamaria server actions para inserir/atualizar
    // Mock apenas dá um refresh na página ou simula alert
    if (empresa_id === 'mock-clinic') {
       alert(`Unidade mockada ${editingId ? 'editada' : 'criada'}: ` + nome);
       setIsAdding(false);
       setEditingId(null);
       setNome('');
       setIsLoading(false);
       return;
    }

    try {
      const res = await fetch(`/api/v1/unidades`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           id: editingId,
           nome,
           empresa_id
        })
      });
      if (res.ok) {
        setIsAdding(false);
        setEditingId(null);
        setNome('');
        router.refresh();
      }
    } catch(err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta unidade?')) return;
    setIsLoading(true);
    if (empresa_id === 'mock-clinic') {
       alert('Unidade mockada excluída!');
       setIsLoading(false);
       return;
    }
    try {
      await fetch(`/api/v1/unidades?id=${id}`, { method: 'DELETE' });
      router.refresh();
    } catch(err) {
      console.error(err);
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
          Unidades (Filiais)
        </h3>
        {!isAdding && !editingId && (
          <button onClick={() => { setIsAdding(true); setNome(''); }} className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova Unidade
          </button>
        )}
      </div>

      <div className="p-5">
        {(isAdding || editingId) && (
          <form onSubmit={handleSubmit} className="mb-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 p-4 rounded-lg flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome da Unidade</label>
              <input 
                type="text" 
                required
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="Ex: Filial Zona Sul"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-md text-sm font-medium hover:bg-zinc-50 dark:bg-zinc-950">
                Cancelar
              </button>
              <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                Salvar
              </button>
            </div>
          </form>
        )}

        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
            <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-700 text-xs uppercase text-zinc-500 dark:text-zinc-400 font-semibold">
              <tr>
                <th className="px-4 py-3">Nome da Unidade</th>
                <th className="px-4 py-3 w-24 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {unidades.length === 0 && (
                 <tr><td colSpan={2} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">Nenhuma unidade cadastrada.</td></tr>
              )}
              {unidades.map(unidade => (
                <tr key={unidade.id} className="hover:bg-zinc-50/50 dark:bg-zinc-900/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{unidade.nome}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditingId(unidade.id); setNome(unidade.nome); }} className="p-1.5 text-zinc-400 hover:text-blue-600 rounded transition-colors" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(unidade.id)} className="p-1.5 text-zinc-400 hover:text-red-600 rounded transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
