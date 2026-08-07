import { getServiceSupabase } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';
import CreatePlanoForm from './CreatePlanoForm';

export const dynamic = 'force-dynamic';

export default async function PlanosPage() {
  const supabase = getServiceSupabase();
  const { data: planos } = await supabase.from('agend_planos').select('*').order('preco_mensal', { ascending: true });

  async function createPlano(formData: FormData) {
    'use server'
    const supabase = getServiceSupabase();
    const { error } = await supabase.from('agend_planos').insert({ 
      nome: formData.get('nome'), 
      max_agendas: parseInt(formData.get('max_agendas') as string),
      preco_mensal: parseFloat(formData.get('preco_mensal') as string)
    });
    if (error) {
      console.error("Erro ao criar plano:", error);
    }
    revalidatePath('/superadmin/planos');
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Planos de Assinatura</h2>
        <p className="text-sm text-zinc-400 mt-1">Crie os pacotes comerciais do seu SaaS e defina os limites de uso.</p>
      </div>

      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6">
        <h3 className="font-semibold text-white mb-4">Criar Novo Plano</h3>
        <CreatePlanoForm />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planos?.map(plano => (
          <div key={plano.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 flex flex-col h-full relative overflow-hidden">
            <h4 className="text-xl font-bold text-white mb-2">{plano.nome}</h4>
            <div className="text-3xl font-black text-white mb-4">
              R$ {Number(plano.preco_mensal).toFixed(2)}<span className="text-sm text-zinc-400 font-normal">/mês</span>
            </div>
            
            <ul className="space-y-3 mb-6 flex-1 text-sm text-zinc-300">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                {plano.max_agendas === -1 ? 'Agendas Ilimitadas' : `Até ${plano.max_agendas} agendas/profissionais`}
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                Agendamentos ilimitados
              </li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
