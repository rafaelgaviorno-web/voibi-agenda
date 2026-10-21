import { getServiceSupabase } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';
import AutomationsClient from './AutomationsClient';

export default async function AutomationsPage({ params }: { params: Promise<{ empresa_id: string }> }) {
  const { empresa_id } = await params;
  
  let apiKey = '';
  let webhookUrl = '';
  let initialLembretes: any[] = [];

  if (empresa_id === 'mock-clinic') {
    apiKey = 'sk_test_voibi_1234567890abcdef';
    webhookUrl = 'https://n8n.minhaclinica.com/webhook/agendamento';
    initialLembretes = [
      {
        id: 'mock_1',
        nome: 'Lembrete Padrão (1 Dia antes)',
        minutos_antes: 1440,
        mensagem_template: 'Olá {{cliente_nome}}, confirmando seu agendamento para o dia {{data_hora}} com {{profissional_nome}}.',
        ativo: true
      }
    ];
  } else {
    const supabase = getServiceSupabase();
    const [{ data }, { data: regras }] = await Promise.all([
      supabase.from('agend_empresas').select('api_key, webhook_url').eq('id', empresa_id).single(),
      supabase
        .from('agend_regras_lembretes')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('minutos_antes', { ascending: false })
    ]);
    if (data) {
      apiKey = data.api_key;
      webhookUrl = data.webhook_url || '';
    }

    initialLembretes = regras || [];
  }

  async function updateWebhook(formData: FormData) {
    'use server'
    if (empresa_id === 'mock-clinic') return;
    const url = formData.get('webhook_url') as string;
    const supabase = getServiceSupabase();
    await supabase.from('agend_empresas').update({ webhook_url: url }).eq('id', empresa_id);
    revalidatePath(`/dashboard/${empresa_id}/automations`);
  }

  async function regenerateApiKey(): Promise<{ success: boolean; newApiKey?: string; error?: string }> {
    'use server';
    if (empresa_id === 'mock-clinic') {
      const newMockKey = `sk_test_voibi_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      return { success: true, newApiKey: newMockKey };
    }

    try {
      const newApiKey = crypto.randomUUID();
      const supabase = getServiceSupabase();

      const { data: current } = await supabase
        .from('agend_empresas')
        .select('api_key')
        .eq('id', empresa_id)
        .maybeSingle();

      const { error } = await supabase
        .from('agend_empresas')
        .update({ api_key: newApiKey })
        .eq('id', empresa_id);

      if (error) {
        return { success: false, error: error.message };
      }

      const { invalidateApiKeyCache } = await import('@/lib/api-logger');
      invalidateApiKeyCache(current?.api_key);

      revalidatePath(`/dashboard/${empresa_id}/automations`);
      return { success: true, newApiKey };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao gerar nova chave de API' };
    }
  }

  async function saveLembreteAction(regra: { id?: string; nome: string; minutos_antes: number; mensagem_template: string; ativo?: boolean }): Promise<{ success: boolean; data?: any; error?: string }> {
    'use server';
    if (empresa_id === 'mock-clinic') {
      return { success: true, data: { ...regra, id: regra.id || Date.now().toString() } };
    }

    try {
      const supabase = getServiceSupabase();
      if (regra.id) {
        const { data, error } = await supabase
          .from('agend_regras_lembretes')
          .update({
            nome: regra.nome,
            minutos_antes: regra.minutos_antes,
            mensagem_template: regra.mensagem_template,
            ativo: regra.ativo ?? true
          })
          .eq('id', regra.id)
          .eq('empresa_id', empresa_id)
          .select()
          .maybeSingle();

        if (error) return { success: false, error: error.message };
        revalidatePath(`/dashboard/${empresa_id}/automations`);
        return { success: true, data };
      } else {
        const { data, error } = await supabase
          .from('agend_regras_lembretes')
          .insert({
            empresa_id,
            nome: regra.nome,
            minutos_antes: regra.minutos_antes,
            mensagem_template: regra.mensagem_template,
            ativo: regra.ativo ?? true
          })
          .select()
          .maybeSingle();

        if (error) return { success: false, error: error.message };
        revalidatePath(`/dashboard/${empresa_id}/automations`);
        return { success: true, data };
      }
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao salvar regra' };
    }
  }

  async function deleteLembreteAction(id: string): Promise<{ success: boolean; error?: string }> {
    'use server';
    if (empresa_id === 'mock-clinic') return { success: true };
    try {
      const supabase = getServiceSupabase();
      const { error } = await supabase
        .from('agend_regras_lembretes')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresa_id);
      if (error) return { success: false, error: error.message };
      revalidatePath(`/dashboard/${empresa_id}/automations`);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao excluir regra' };
    }
  }

  async function toggleLembreteAction(id: string, ativo: boolean): Promise<{ success: boolean; error?: string }> {
    'use server';
    if (empresa_id === 'mock-clinic') return { success: true };
    try {
      const supabase = getServiceSupabase();
      const { error } = await supabase
        .from('agend_regras_lembretes')
        .update({ ativo })
        .eq('id', id)
        .eq('empresa_id', empresa_id);
      if (error) return { success: false, error: error.message };
      revalidatePath(`/dashboard/${empresa_id}/automations`);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao alternar status da regra' };
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-8 lg:p-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Automações e Integrações</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Conecte sua agenda a sistemas externos, robôs de WhatsApp e muito mais.</p>
      </div>

      <AutomationsClient 
        apiKey={apiKey} 
        webhookUrl={webhookUrl} 
        updateWebhook={updateWebhook} 
        regenerateApiKey={regenerateApiKey}
        empresa_id={empresa_id}
        initialLembretes={initialLembretes}
        saveLembreteAction={saveLembreteAction}
        deleteLembreteAction={deleteLembreteAction}
        toggleLembreteAction={toggleLembreteAction}
      />
    </div>
  );
}
