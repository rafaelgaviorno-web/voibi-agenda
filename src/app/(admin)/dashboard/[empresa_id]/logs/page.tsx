import { getServiceSupabase } from '@/lib/supabase/client';
import LogsViewer from '../automations/LogsViewer';

export default async function LogsPage({ params }: { params: Promise<{ empresa_id: string }> }) {
  const { empresa_id } = await params;

  let empresaNome = '';
  let empresaSlug = '';

  if (empresa_id === 'mock-clinic') {
    empresaNome = 'Clínica de Teste Voibi';
    empresaSlug = 'mock-clinic';
  } else {
    try {
      const supabase = getServiceSupabase();
      const { data: emp } = await supabase
        .from('agend_empresas')
        .select('nome, slug')
        .eq('id', empresa_id)
        .maybeSingle();
      if (emp) {
        empresaNome = emp.nome;
        empresaSlug = emp.slug;
      }
    } catch {
      // Ignora erro
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-8 lg:p-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Logs de Execução da API
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Monitoramento em tempo real de requisições enviadas pela IA de WhatsApp e integrações externas para{' '}
          <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">{empresaNome || empresa_id}</strong>.
        </p>
      </div>

      <LogsViewer empresa_id={empresa_id} empresa_nome={empresaNome} empresa_slug={empresaSlug} />
    </div>
  );
}
