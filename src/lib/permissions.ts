import type { Session } from './session';

// Agendas (profissionais) que o usuário logado pode ver e alterar nesta empresa.
// null = sem restrição: superadmin ou administrador da clínica.
// Mesma regra do menu lateral (layout do painel): usuários comuns veem só as agendas vinculadas a eles.
export async function getAllowedAgendaIds(supabase: any, session: Session | null, empresaId: string): Promise<string[] | null> {
  if (!session || session.isSuperadmin) return null;
  const { data } = await supabase
    .from('agend_usuarios')
    .select('role, agend_usuario_agendas(agenda_id)')
    .eq('id', session.id)
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (!data || data.role === 'admin') return null;
  return (data.agend_usuario_agendas || []).map((a: any) => a.agenda_id);
}

// Confere se todas as agendas pertencem à empresa e estão liberadas para o usuário
export async function canUseAgendas(supabase: any, session: Session | null, empresaId: string, agendaIds: (string | null | undefined)[]) {
  const ids = [...new Set(agendaIds.filter(Boolean) as string[])];
  if (ids.length === 0) return false;
  const [{ data: owned }, allowed] = await Promise.all([
    supabase.from('agend_profissionais').select('id').eq('empresa_id', empresaId).in('id', ids),
    getAllowedAgendaIds(supabase, session, empresaId),
  ]);
  if ((owned || []).length !== ids.length) return false;
  return !allowed || ids.every((id) => allowed.includes(id));
}
