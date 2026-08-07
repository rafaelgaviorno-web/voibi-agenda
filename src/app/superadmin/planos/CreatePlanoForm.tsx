'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function CreatePlanoForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const preco = formData.get('preco_mensal') as string;
    
    // Tratamento para vírgula
    const precoFormatado = preco.replace(',', '.');

    const { error } = await supabase.from('agend_planos').insert({
      nome: formData.get('nome'),
      max_agendas: parseInt(formData.get('max_agendas') as string),
      preco_mensal: parseFloat(precoFormatado)
    });

    setLoading(false);

    if (error) {
      alert("Erro ao salvar plano: " + error.message + "\n\nDetalhes: " + JSON.stringify(error));
      console.error(error);
    } else {
      router.refresh();
      (e.target as HTMLFormElement).reset();
    }
  }

  return (
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
  );
}
