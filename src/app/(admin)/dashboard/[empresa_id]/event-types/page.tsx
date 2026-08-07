import { getServiceSupabase } from '@/lib/supabase/client';
import { Clock, Link as LinkIcon, MoreHorizontal } from 'lucide-react';

export default async function EventTypesPage({ params }: { params: Promise<{ empresa_id: string }> }) {
  const { empresa_id } = await params;
  const supabase = getServiceSupabase();
  const { data: eventos } = await supabase.from('agend_tipos_evento').select('*, agend_profissionais!inner(nome, slug, empresa_id, agend_empresas(slug))').eq('agend_profissionais.empresa_id', empresa_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tipos de Evento</h2>
          <p className="text-sm text-zinc-500 mt-1">Crie e gerencie os serviços que você oferece.</p>
        </div>
        <button className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors">
          + Novo Tipo de Evento
        </button>
      </div>

      <div className="grid gap-4 mt-8">
        {!eventos || eventos.length === 0 ? (
           <div className="p-12 text-center border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
             <p className="text-zinc-500 font-medium">Nenhum evento cadastrado.</p>
             <p className="text-sm text-zinc-400 mt-1">Vá em Configurações para criar seu Perfil antes.</p>
           </div>
        ) : null}
        
        {eventos?.map((ev) => (
          <div key={ev.id} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex items-center justify-between group hover:border-zinc-300 transition-colors">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">{ev.nome}</h3>
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {ev.duracao_minutos} min
                </span>
                <span className="flex items-center gap-1">
                  <LinkIcon className="w-4 h-4" />
                  /{ev.agend_profissionais?.agend_empresas?.slug}/{ev.agend_profissionais?.slug}/{ev.slug}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
               <button className="p-2 text-zinc-400 hover:text-zinc-900 rounded-md hover:bg-zinc-100 transition-colors">
                 <MoreHorizontal className="w-5 h-5" />
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
