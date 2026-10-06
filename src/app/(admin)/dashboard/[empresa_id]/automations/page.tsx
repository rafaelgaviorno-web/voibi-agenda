import { getServiceSupabase } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';
import AutomationsClient from './AutomationsClient';

export default async function AutomationsPage({ params }: { params: Promise<{ empresa_id: string }> }) {
  const { empresa_id } = await params;
  
  let apiKey = '';
  let webhookUrl = '';

  if (empresa_id === 'mock-clinic') {
    apiKey = 'sk_test_voibi_1234567890abcdef';
    webhookUrl = 'https://n8n.minhaclinica.com/webhook/agendamento';
  } else {
    const supabase = getServiceSupabase();
    const { data } = await supabase.from('agend_empresas').select('api_key, webhook_url').eq('id', empresa_id).single();
    if (data) {
      apiKey = data.api_key;
      webhookUrl = data.webhook_url || '';
    }
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
      />
    </div>
  );
}
