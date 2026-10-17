import { getServiceSupabase } from './supabase/client';

export interface WebhookPayload {
  event: 'booking.created' | 'booking.updated' | 'booking.cancelled';
  data: any;
  timestamp?: string;
}

/**
 * Dispara webhook para a URL da agenda (se configurada) ou da empresa (fallback).
 * Regra do sistema: O webhook da agenda substitui o webhook global da clínica.
 */
export async function triggerBookingWebhook(
  event: 'booking.created' | 'booking.updated' | 'booking.cancelled',
  booking: any,
  empresaId?: string
) {
  try {
    const supabase = getServiceSupabase();
    let agendaWebhookUrl: string | null = null;
    let empresaWebhookUrl: string | null = null;

    // 1. Obter webhook da agenda se booking tem profissional_id ou agend_profissionais
    const profissionalId = booking.profissional_id || booking.agend_profissionais?.id;
    if (booking.agend_profissionais?.webhook_url) {
      agendaWebhookUrl = booking.agend_profissionais.webhook_url;
    } else if (profissionalId) {
      const { data: prof } = await supabase
        .from('agend_profissionais')
        .select('webhook_url, empresa_id')
        .eq('id', profissionalId)
        .maybeSingle();

      if (prof?.webhook_url) {
        agendaWebhookUrl = prof.webhook_url;
      }
      if (!empresaId && prof?.empresa_id) {
        empresaId = prof.empresa_id;
      }
    }

    // 2. Se a agenda não tiver webhook próprio, obter o webhook da empresa
    if (!agendaWebhookUrl) {
      const targetEmpresaId = empresaId || booking.empresa_id;
      if (targetEmpresaId) {
        const { data: emp } = await supabase
          .from('agend_empresas')
          .select('webhook_url')
          .eq('id', targetEmpresaId)
          .maybeSingle();

        if (emp?.webhook_url) {
          empresaWebhookUrl = emp.webhook_url;
        }
      }
    }

    const targetUrl = agendaWebhookUrl || empresaWebhookUrl;
    if (!targetUrl) {
      return { sent: false, reason: 'Nenhum webhook configurado para a agenda nem para a empresa' };
    }

    const payload: WebhookPayload = {
      event,
      data: {
        ...booking,
        status: booking.status || 'pendente',
        status_agendamento: booking.status || 'pendente',
        status_atendimento: booking.status_atendimento || 'agendado',
      },
      timestamp: new Date().toISOString()
    };

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'Voibi-Agenda-Webhook/1.0'
      },
      body: JSON.stringify(payload)
    });

    return { sent: true, status: res.status, url: targetUrl };
  } catch (err: any) {
    console.error(`[Webhook Error] Falha ao disparar ${event}:`, err?.message || err);
    return { sent: false, error: err?.message || err };
  }
}
