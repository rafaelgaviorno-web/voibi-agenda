import LogsViewer from '../automations/LogsViewer';

export default async function LogsPage({ params }: { params: Promise<{ empresa_id: string }> }) {
  const { empresa_id } = await params;

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-8 lg:p-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Logs de Execução da API
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Monitoramento em tempo real de requisições enviadas pela IA de WhatsApp e integrações externas.
        </p>
      </div>

      <LogsViewer empresa_id={empresa_id} />
    </div>
  );
}
