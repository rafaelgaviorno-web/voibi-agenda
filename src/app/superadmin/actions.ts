'use server'

import { getServiceSupabase } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/session';

async function isSuperadmin() {
  return (await getSession())?.isSuperadmin === true;
}

export async function updateEmpresa(
  empresaId: string,
  data: { nome: string; slug: string; cnpj: string; plano_id: string }
) {
  if (!(await isSuperadmin())) return { success: false, error: 'Acesso negado.' };

  const nome = data.nome.trim();
  const slug = data.slug.trim().toLowerCase();
  if (!nome || !slug) return { success: false, error: 'Nome e slug são obrigatórios.' };
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { success: false, error: 'O slug só pode ter letras minúsculas, números e hífen.' };
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('agend_empresas')
    .update({
      nome,
      slug,
      cnpj: data.cnpj.trim() || null,
      plano_id: data.plano_id || null,
    })
    .eq('id', empresaId);

  if (error) {
    console.error('Erro ao atualizar empresa:', error);
    if (error.code === '23505') return { success: false, error: 'Já existe outra empresa com esse slug.' };
    if (error.code === '23503') {
      return { success: false, error: 'Não foi possível trocar o slug porque há registros ligados a ele (regras de lembrete).' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/superadmin');
  revalidatePath(`/dashboard/${empresaId}`, 'layout');
  return { success: true };
}

export async function deleteEmpresa(empresaId: string) {
  if (!(await isSuperadmin())) return { success: false, error: 'Acesso negado.' };

  const supabase = getServiceSupabase();

  try {
    const [{ data: agendas }, { data: usuarios }] = await Promise.all([
      supabase.from('agend_profissionais').select('id').eq('empresa_id', empresaId),
      supabase.from('agend_usuarios').select('id').eq('empresa_id', empresaId),
    ]);
    const agendaIds = (agendas || []).map((a) => a.id);
    const usuarioIds = (usuarios || []).map((u) => u.id);

    // 1. Dados ligados às agendas (profissionais)
    if (agendaIds.length > 0) {
      await supabase.from('agend_disponibilidade').delete().in('profissional_id', agendaIds);
      await supabase.from('agend_bloqueios').delete().in('profissional_id', agendaIds);
      await supabase.from('agend_usuario_agendas').delete().in('agenda_id', agendaIds);
    }

    // 2. Dados ligados diretamente à empresa (filhos antes dos pais)
    await supabase.from('agend_agendamentos').delete().eq('empresa_id', empresaId);
    await supabase.from('agend_clientes_finais').delete().eq('empresa_id', empresaId);
    await supabase.from('agend_tipos_evento').delete().eq('empresa_id', empresaId);
    await supabase.from('agend_regras_lembretes').delete().eq('empresa_id', empresaId);
    await supabase.from('agend_api_logs').delete().eq('empresa_id', empresaId);
    await supabase.from('agend_profissionais').delete().eq('empresa_id', empresaId);
    await supabase.from('agend_usuarios').delete().eq('empresa_id', empresaId);
    await supabase.from('agend_unidades').delete().eq('empresa_id', empresaId);

    // 3. A empresa
    const { error } = await supabase.from('agend_empresas').delete().eq('id', empresaId);
    if (error) {
      console.error('Erro ao excluir empresa:', error);
      return { success: false, error: error.message };
    }

    // 4. Logins da equipe no Supabase Auth (só depois que a empresa saiu)
    for (const id of usuarioIds) {
      const { error: authError } = await supabase.auth.admin.deleteUser(id);
      if (authError) console.error('Erro ao excluir login do usuário', id, authError);
    }

    revalidatePath('/superadmin');
    return { success: true };
  } catch (err: any) {
    console.error('Erro inesperado ao excluir empresa:', err);
    return { success: false, error: err?.message || 'Erro ao excluir empresa' };
  }
}
