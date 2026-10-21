'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPlano } from '../actions';

export default function CreatePlanoForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await createPlano({
      nome: String(formData.get('nome') || ''),
      max_agendas: String(formData.get('max_agendas') || ''),
      preco_mensal: String(formData.get('preco_mensal') || ''),
    });

    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Erro ao salvar plano.');
    } else {
      setError('');
      form.reset();
      router.refresh();
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
      <div className="flex-1 space-y-1 w-full">
         <label className="text-sm font-medium text-zinc-300">Nome do Plano</label>
         <input required name="nome" className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Ex: Premium" />
      </div>
      <div className="flex-1 space-y-1 w-full">
         <label className="text-sm font-medium text-zinc-300">Limite de Agendas</label>
         <input required type="number" name="max_agendas" className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Ex: 5 (Use -1 para Ilimitado)" />
      </div>
      <div className="flex-1 space-y-1 w-full">
         <label className="text-sm font-medium text-zinc-300">Preço (R$)</label>
         <input required type="text" name="preco_mensal" className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Ex: 99.90 ou 99,90" />
      </div>
      <button type="submit" disabled={loading} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
        {loading ? 'Salvando...' : 'Adicionar Plano'}
      </button>
    </form>
    {error && <p className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}
    </>
  );
}
