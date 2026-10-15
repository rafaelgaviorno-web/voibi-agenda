'use server'

import { getServiceSupabase } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';

export async function deleteAgenda(agendaId: string, empresaId: string) {
  if (empresaId === 'mock-clinic') {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const customAgendasStr = cookieStore.get('voibi_mock_agendas')?.value;
    const customAgendas = customAgendasStr ? JSON.parse(customAgendasStr) : [];
    const filtered = customAgendas.filter((a: any) => a.id !== agendaId);
    cookieStore.set('voibi_mock_agendas', JSON.stringify(filtered));
    revalidatePath(`/dashboard/${empresaId}/layout`);
    revalidatePath(`/dashboard/${empresaId}/agendas`);
    return { success: true };
  }

  const supabase = getServiceSupabase();

  try {
    // 1. Deletar disponibilidades da agenda
    await supabase.from('agend_disponibilidade').delete().eq('profissional_id', agendaId);

    // 2. Deletar bloqueios da agenda
    await supabase.from('agend_bloqueios').delete().eq('profissional_id', agendaId);

    // 3. Deletar vínculos com usuários
    await supabase.from('agend_usuario_agendas').delete().eq('agenda_id', agendaId);

    // 4. Deletar agendamentos vinculados a esta agenda
    await supabase.from('agend_agendamentos').delete().eq('profissional_id', agendaId);

    // 5. Deletar tipos de evento vinculados especificamente a este profissional (se houver)
    await supabase.from('agend_tipos_evento').delete().eq('profissional_id', agendaId);

    // 6. Deletar a agenda (profissional)
    const { error } = await supabase
      .from('agend_profissionais')
      .delete()
      .eq('id', agendaId)
      .eq('empresa_id', empresaId);

    if (error) {
      console.error('Erro ao excluir agenda:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/${empresaId}/layout`);
    revalidatePath(`/dashboard/${empresaId}/agendas`);
    revalidatePath(`/dashboard/${empresaId}/calendar`);
    return { success: true };
  } catch (err: any) {
    console.error('Erro inesperado ao excluir agenda:', err);
    return { success: false, error: err?.message || 'Erro ao excluir agenda' };
  }
}
