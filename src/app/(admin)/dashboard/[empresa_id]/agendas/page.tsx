import { getServiceSupabase } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AgendasPage({ params }: { params: Promise<{ empresa_id: string }> }) {
  const { empresa_id } = await params;
  
  let agendas: any[] = [];
  let unidades: any[] = [];
  
  if (empresa_id === 'mock-clinic') {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const customAgendasStr = cookieStore.get('voibi_mock_agendas')?.value;
    const customAgendas = customAgendasStr ? JSON.parse(customAgendasStr) : [];

    agendas = [
      { id: 'prof-1', nome: 'Dr. João Silva', cor: '#4285f4', unidade_id: 'un-1' },
      { id: 'prof-2', nome: 'Dra. Maria Souza', cor: '#0f9d58', unidade_id: 'un-1' },
      { id: 'prof-3', nome: 'Dr. Pedro (Zona Sul)', cor: '#eab308', unidade_id: 'un-2' },
      ...customAgendas
    ];
    unidades = [
      { id: 'un-1', nome: 'Matriz (Centro)', empresa_id: 'mock-clinic' },
      { id: 'un-2', nome: 'Filial Zona Sul', empresa_id: 'mock-clinic' }
    ];
  } else {
    const supabase = getServiceSupabase();
    const { data } = await supabase.from('agend_profissionais').select('*').eq('empresa_id', empresa_id).order('created_at', { ascending: false });
    agendas = data || [];
    
    const { data: uns } = await supabase.from('agend_unidades').select('*').eq('empresa_id', empresa_id);
    unidades = uns || [];
  }

  async function createAgenda(formData: FormData) {
    'use server'
    const supabase = getServiceSupabase();
    const nome = formData.get('nome') as string;
    const cor = formData.get('cor') as string;
    const emp_id = formData.get('empresa_id') as string;
    const unidade_id = formData.get('unidade_id') as string;
    
    if (emp_id !== 'mock-clinic') {
      await supabase.from('agend_profissionais').insert({ 
        nome, 
        cor, 
        empresa_id: emp_id,
        unidade_id: unidade_id || null
      });
      revalidatePath(`/dashboard/${emp_id}/layout`);
      revalidatePath(`/dashboard/${emp_id}/agendas`);
    } else {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const customAgendasStr = cookieStore.get('voibi_mock_agendas')?.value;
      const customAgendas = customAgendasStr ? JSON.parse(customAgendasStr) : [];
      
      customAgendas.push({
        id: 'prof-mock-' + Date.now(),
        nome,
        cor,
        empresa_id: emp_id,
        unidade_id
      });
      
      cookieStore.set('voibi_mock_agendas', JSON.stringify(customAgendas));
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Agendas</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Crie e gerencie as agendas da sua clínica. Uma agenda pode ser um profissional (ex: Dr. João) ou um recurso/unidade (ex: Sala 1).
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Nova Agenda</h2>
        <form action={createAgenda} className="flex flex-col lg:flex-row gap-6 items-end">
          <input type="hidden" name="empresa_id" value={empresa_id} />
          
          <div className="flex-1 min-w-[200px] space-y-1.5">
             <label className="text-sm font-medium text-zinc-700">Nome da Agenda</label>
             <input required name="nome" className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" placeholder="Ex: Dr. Carlos / Sala de Raio-X" />
          </div>

          {unidades.length > 0 && (
            <div className="flex-1 min-w-[150px] space-y-1.5">
               <label className="text-sm font-medium text-zinc-700">Unidade</label>
               <select name="unidade_id" required className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer">
                 <option value="">Selecione...</option>
                 {unidades.map(u => (
                   <option key={u.id} value={u.id}>{u.nome}</option>
                 ))}
               </select>
            </div>
          )}
          
          <div className="space-y-1.5">
             <label className="text-sm font-medium text-zinc-700">Cor no Calendário</label>
             <div className="flex flex-wrap items-center gap-2">
                {[
                  '#1d4ed8', '#3b82f6', '#60a5fa', // Azuis
                  '#6d28d9', '#8b5cf6', '#a78bfa', // Roxos
                  '#be185d', '#ec4899', '#f472b6', // Rosas
                  '#0f766e', '#14b8a6', '#5eead4', // Teals
                  '#0369a1', '#0ea5e9', '#7dd3fc', // Cianos
                  '#475569', '#64748b', '#94a3b8'  // Cinzas
                ].map(c => (
                  <label key={c} className="cursor-pointer">
                    <input type="radio" name="cor" value={c} className="peer sr-only" required defaultChecked={c === '#3b82f6'} />
                    <div className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:ring-2 peer-checked:ring-offset-1 peer-checked:ring-zinc-900 transition-all shadow-sm hover:scale-110" style={{ backgroundColor: c }}></div>
                  </label>
                ))}
             </div>
          </div>
          
          <button type="submit" className="w-full lg:w-auto shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
            Criar Agenda
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Agendas Cadastradas</h2>
        {agendas.length === 0 ? (
          <div className="text-center py-10 bg-zinc-50 rounded-xl border border-zinc-200 border-dashed">
            <p className="text-sm text-zinc-500">Nenhuma agenda cadastrada ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agendas.map(agenda => (
              <Link key={agenda.id} href={`/dashboard/${empresa_id}/agendas/${agenda.id}`} className="bg-white border border-zinc-200 rounded-xl p-5 flex items-start gap-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: agenda.cor || '#ccc' }}>
                  {agenda.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-zinc-900 truncate group-hover:text-blue-600 transition-colors" title={agenda.nome}>{agenda.nome}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: agenda.cor || '#ccc' }}></span>
                    Configurar horários
                  </p>
                </div>
                <div className="flex items-center text-zinc-400 group-hover:text-blue-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
