import { getServiceSupabase } from '@/lib/supabase/client';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import AgendaConfigClient from './AgendaConfigClient';

export const dynamic = 'force-dynamic';

export default async function AgendaConfigPage({ params }: { params: Promise<{ empresa_id: string, agenda_id: string }> }) {
  const { empresa_id, agenda_id } = await params;
  
  let agenda = null;
  let disponibilidade = [];

  if (empresa_id === 'mock-clinic') {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const customAgendasStr = cookieStore.get('voibi_mock_agendas')?.value;
    const customAgendas = customAgendasStr ? JSON.parse(customAgendasStr) : [];

    // Dados falsos
    const mockAgendas = [
      { id: 'prof-1', nome: 'Dr. João Silva', cor: '#4285f4' },
      { id: 'prof-2', nome: 'Dra. Maria Souza', cor: '#0f9d58' },
      ...customAgendas
    ];
    agenda = mockAgendas.find(a => a.id === agenda_id);
    if (!agenda) notFound();

    disponibilidade = [
      { dia_semana: 1, hora_inicio: '09:00:00', hora_fim: '12:00:00' },
      { dia_semana: 1, hora_inicio: '13:00:00', hora_fim: '18:00:00' },
      { dia_semana: 2, hora_inicio: '08:00:00', hora_fim: '18:00:00' }
    ];
  } else {
    const supabase = getServiceSupabase();
    
    const { data: agendaData } = await supabase
      .from('agend_profissionais')
      .select('*')
      .eq('id', agenda_id)
      .eq('empresa_id', empresa_id)
      .single();
      
    if (!agendaData) notFound();
    agenda = agendaData;

    const { data: dispData } = await supabase
      .from('agend_disponibilidade')
      .select('*')
      .eq('profissional_id', agenda_id)
      .order('dia_semana', { ascending: true })
      .order('hora_inicio', { ascending: true });
    
    disponibilidade = dispData || [];
  }

  // === Server Actions ===

  async function saveBasico(data: { 
    nome: string; 
    cor: string; 
    intervalo_minutos?: number;
    webhook_url?: string; 
    permitir_sobreposicao?: boolean; 
    campos_personalizados?: any[]; 
  }) {
    'use server'
    if (empresa_id !== 'mock-clinic') {
      const supabase = getServiceSupabase();
      const { error } = await supabase.from('agend_profissionais').update({ 
        nome: data.nome, 
        cor: data.cor,
        intervalo_minutos: data.intervalo_minutos || 30,
        webhook_url: data.webhook_url || null,
        permitir_sobreposicao: !!data.permitir_sobreposicao,
        campos_personalizados: data.campos_personalizados || []
      }).eq('id', agenda_id);

      if (error) {
        console.error("Erro ao atualizar agenda:", error);
        throw new Error(error.message || "Erro ao salvar agenda");
      }

      revalidatePath(`/dashboard/${empresa_id}/layout`);
      revalidatePath(`/dashboard/${empresa_id}/agendas`);
      revalidatePath(`/dashboard/${empresa_id}/agendas/${agenda_id}`);
    } else {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const customAgendasStr = cookieStore.get('voibi_mock_agendas')?.value;
      const customAgendas = customAgendasStr ? JSON.parse(customAgendasStr) : [];
      
      const idx = customAgendas.findIndex((a: any) => a.id === agenda_id);
      if (idx >= 0) {
        customAgendas[idx] = {
          ...customAgendas[idx],
          nome: data.nome,
          cor: data.cor,
          intervalo_minutos: data.intervalo_minutos || 30,
          webhook_url: data.webhook_url,
          permitir_sobreposicao: data.permitir_sobreposicao,
          campos_personalizados: data.campos_personalizados
        };
      } else {
        customAgendas.push({
          id: agenda_id,
          nome: data.nome,
          cor: data.cor,
          intervalo_minutos: data.intervalo_minutos || 30,
          webhook_url: data.webhook_url,
          permitir_sobreposicao: data.permitir_sobreposicao,
          campos_personalizados: data.campos_personalizados
        });
      }
      cookieStore.set('voibi_mock_agendas', JSON.stringify(customAgendas));
      revalidatePath(`/dashboard/${empresa_id}/agendas/${agenda_id}`);
    }
  }

  async function saveDisponibilidade(dias: any[]) {
    'use server'
    if (empresa_id !== 'mock-clinic') {
      const supabase = getServiceSupabase();
      
      // 1. Deletar tudo existente
      const { error: delErr } = await supabase.from('agend_disponibilidade').delete().eq('profissional_id', agenda_id);
      if (delErr) {
        console.error("Erro ao limpar disponibilidade:", delErr);
        throw new Error(delErr.message || "Erro ao salvar horários");
      }
      
      // 2. Inserir novos
      const insercoes = [];
      for (const dia of dias) {
        for (const intervalo of dia.intervalos) {
          if (intervalo.inicio && intervalo.fim) {
             insercoes.push({
               profissional_id: agenda_id,
               dia_semana: dia.dia_semana,
               hora_inicio: intervalo.inicio + ':00',
               hora_fim: intervalo.fim + ':00'
             });
          }
        }
      }
      
      if (insercoes.length > 0) {
        const { error: insErr } = await supabase.from('agend_disponibilidade').insert(insercoes);
        if (insErr) {
          console.error("Erro ao inserir disponibilidade:", insErr);
          throw new Error(insErr.message || "Erro ao salvar horários");
        }
      }
      revalidatePath(`/dashboard/${empresa_id}/agendas/${agenda_id}`);
    }
  }


  return (
    <AgendaConfigClient 
       agenda={agenda}
       disponibilidadeInicial={disponibilidade}
       empresaId={empresa_id}
       onSaveBasico={saveBasico}
       onSaveDisponibilidade={saveDisponibilidade}
    />
  );
}
