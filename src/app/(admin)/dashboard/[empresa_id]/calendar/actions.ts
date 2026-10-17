'use server'

import { getServiceSupabase } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';

export async function saveAppointment(data: any, empresaId: string) {
  if (empresaId === 'mock-clinic') {
    // Para mock, não precisamos fazer nada no server, apenas retornar sucesso
    return { success: true };
  }

  const supabase = getServiceSupabase();
  
  try {
    let clienteId = data.clienteId;
    
    // 1. Lidar com o cliente (se não tiver ID, busca por whatsapp ou cria novo)
    if (!clienteId && data.whatsapp) {
      // Tentar buscar cliente pelo telefone na mesma empresa
      const { data: existingClient } = await supabase
        .from('agend_clientes_finais')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('telefone', data.whatsapp)
        .maybeSingle();
        
      if (existingClient) {
        clienteId = existingClient.id;
        // Atualiza o nome se necessário
        await supabase.from('agend_clientes_finais').update({ nome: data.nome }).eq('id', clienteId);
      } else {
        // Criar novo cliente
        const { data: newClient, error: insertErr } = await supabase
          .from('agend_clientes_finais')
          .insert({
            empresa_id: empresaId,
            nome: data.nome,
            telefone: data.whatsapp
          }).select('id').single();
          
        if (insertErr) throw insertErr;
        
        if (newClient) {
          clienteId = newClient.id;
        }
      }
    } else if (!clienteId) {
       // Se não tem whatsapp, cria um cliente genérico
       const { data: newClient, error: insertErr } = await supabase
          .from('agend_clientes_finais')
          .insert({
            empresa_id: empresaId,
            nome: data.nome
          }).select('id').single();
       if (insertErr) throw insertErr;
       if (newClient) clienteId = newClient.id;
    }

    // Preparar datas
    const inicioStr = `${data.data}T${data.horaInicio}:00`;
    const fimStr = `${data.data}T${data.horaFim}:00`;
    const inicioIso = new Date(inicioStr).toISOString();
    const fimIso = new Date(fimStr).toISOString();

    // 2. Criar ou Atualizar Agendamento
    let bookingResult: any = null;
    let eventType: 'booking.created' | 'booking.updated' = 'booking.created';

    if (data.id) {
      eventType = 'booking.updated';
      // Atualizar
      const { data: updatedBooking, error: updateErr } = await supabase
        .from('agend_agendamentos')
        .update({
          profissional_id: data.agendaId,
          tipo_evento_id: data.procedimentoId || null,
          cliente_id: clienteId,
          inicio: inicioIso,
          fim: fimIso,
          status: data.status || 'pendente',
          status_atendimento: data.status_atendimento || 'agendado',
          observacao: data.observacao,
          is_encaixe: data.is_encaixe
        })
        .eq('id', data.id)
        .select(`
          id,
          inicio,
          fim,
          status,
          status_atendimento,
          observacao,
          is_encaixe,
          created_at,
          agend_clientes_finais(id, nome, email, telefone),
          agend_tipos_evento(id, nome, duracao_minutos),
          agend_profissionais(id, nome, cor, webhook_url)
        `)
        .single();
      
      if (updateErr) throw updateErr;
      bookingResult = updatedBooking;
    } else {
      // Criar novo
      const { data: newBooking, error: insertErr2 } = await supabase
        .from('agend_agendamentos')
        .insert({
          profissional_id: data.agendaId,
          tipo_evento_id: data.procedimentoId || null,
          cliente_id: clienteId,
          inicio: inicioIso,
          fim: fimIso,
          status: data.status || 'pendente',
          status_atendimento: data.status_atendimento || 'agendado',
          observacao: data.observacao,
          is_encaixe: data.is_encaixe
        })
        .select(`
          id,
          inicio,
          fim,
          status,
          status_atendimento,
          observacao,
          is_encaixe,
          created_at,
          agend_clientes_finais(id, nome, email, telefone),
          agend_tipos_evento(id, nome, duracao_minutos),
          agend_profissionais(id, nome, cor, webhook_url)
        `)
        .single();
      
      if (insertErr2) throw insertErr2;
      bookingResult = newBooking;
    }

    // 3. Disparar Webhook (da agenda ou da clínica)
    if (bookingResult) {
      const { triggerBookingWebhook } = await import('@/lib/webhook');
      triggerBookingWebhook(eventType, bookingResult, empresaId).catch(console.error);
    }

    revalidatePath(`/dashboard/${empresaId}/calendar`);
    return { success: true };
    
  } catch (error) {
    console.error("Erro ao salvar agendamento:", error);
    return { success: false, error };
  }
}

export async function deleteAppointment(id: string, empresaId: string) {
  if (empresaId === 'mock-clinic') return { success: true };
  
  const supabase = getServiceSupabase();

  // Busca dados antes de deletar para enviar no webhook
  const { data: booking } = await supabase
    .from('agend_agendamentos')
    .select(`
      id,
      inicio,
      fim,
      status,
      agend_clientes_finais(id, nome, email, telefone),
      agend_profissionais(id, nome, cor, webhook_url)
    `)
    .eq('id', id)
    .single();

  await supabase.from('agend_agendamentos').delete().eq('id', id);

  if (booking) {
    const { triggerBookingWebhook } = await import('@/lib/webhook');
    triggerBookingWebhook('booking.cancelled', booking, empresaId).catch(console.error);
  }
  
  revalidatePath(`/dashboard/${empresaId}/calendar`);
  return { success: true };
}

export async function transferAppointments(sourceId: string, targetId: string, date: string, empresaId: string) {
  if (empresaId === 'mock-clinic') return { success: true };
  
  const supabase = getServiceSupabase();
  
  try {
    // Busca os agendamentos da origem naquela data
    const startOfDay = new Date(`${date}T00:00:00`).toISOString();
    const endOfDay = new Date(`${date}T23:59:59`).toISOString();
    
    await supabase.from('agend_agendamentos')
      .update({ profissional_id: targetId })
      .eq('profissional_id', sourceId)
      .gte('inicio', startOfDay)
      .lte('inicio', endOfDay);
      
    revalidatePath(`/dashboard/${empresaId}/calendar`);
    return { success: true };
  } catch (error) {
    console.error("Erro ao transferir agendamentos:", error);
    return { success: false, error };
  }
}
