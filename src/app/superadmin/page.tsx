import { getServiceSupabase } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SuperadminPage() {
  const supabase = getServiceSupabase();
  const { data: empresas } = await supabase.from('agend_empresas').select('*, agend_planos(nome)').order('created_at', { ascending: false });
  const { data: planos } = await supabase.from('agend_planos').select('id, nome, preco_mensal').order('preco_mensal', { ascending: true });

  async function createEmpresa(formData: FormData) {
    'use server'
    const supabase = getServiceSupabase();
    const plano_id = formData.get('plano_id')?.toString();
    const { data: empresa, error } = await supabase.from('agend_empresas').insert({ 
      nome: formData.get('nome'), 
      slug: formData.get('slug'),
      plano_id: plano_id ? plano_id : null
    }).select().single();

    if (error) {
        console.error("Erro ao criar empresa:", error);
    }

    if (empresa) {
      await supabase.from('agend_unidades').insert({
        empresa_id: empresa.id,
        nome: 'Matriz'
      });
    }
    revalidatePath('/superadmin');
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Tenants (Empresas)</h2>
        <p className="text-sm text-zinc-400 mt-1">Gerencie todas as clínicas que usam o sistema.</p>
      </div>

      <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6">
        <h3 className="font-semibold text-white mb-4">Cadastrar Nova Empresa</h3>
        <form action={createEmpresa} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1 w-full">
             <label className="text-sm font-medium text-zinc-300">Nome da Clínica</label>
             <input required name="nome" className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Ex: Clínica Sorriso" />
          </div>
          <div className="flex-1 space-y-1 w-full">
             <label className="text-sm font-medium text-zinc-300">Slug (URL)</label>
             <input required name="slug" className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="clinica-sorriso" />
          </div>
          <div className="flex-1 space-y-1 w-full">
             <label className="text-sm font-medium text-zinc-300">Plano SaaS</label>
             <select required name="plano_id" className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
               <option value="">Selecione...</option>
               {planos?.map(plano => (
                 <option key={plano.id} value={plano.id}>{plano.nome} (R$ {Number(plano.preco_mensal).toFixed(2)})</option>
               ))}
             </select>
          </div>
          <button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors">
            Cadastrar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {empresas?.map(empresa => (
          <div key={empresa.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex flex-col h-full">
            <h4 className="text-lg font-bold text-white mb-1">{empresa.nome}</h4>
            <p className="text-xs text-zinc-400 mb-1">Slug: {empresa.slug}</p>
            <p className="text-xs font-semibold text-blue-400 mb-6">Plano: {empresa.agend_planos?.nome || 'Sem plano'}</p>
            <div className="mt-auto space-y-2">
              <Link 
                href={`/dashboard/${empresa.id}/calendar`}
                className="block text-center w-full bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-md text-sm font-semibold transition-colors"
              >
                Acessar Painel (Admin)
              </Link>
              <Link 
                href={`/${empresa.slug}`}
                target="_blank"
                className="block text-center w-full bg-transparent border border-zinc-600 text-white hover:bg-zinc-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Ver Link Público
              </Link>
            </div>
          </div>
        ))}
        {empresas?.length === 0 && (
          <div className="text-zinc-500 text-sm col-span-3">Nenhuma empresa cadastrada ainda.</div>
        )}
      </div>
    </div>
  );
}
