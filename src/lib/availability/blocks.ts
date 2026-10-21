// Bloqueios que afetam um profissional num intervalo:
// os dele próprio + os gerais da empresa (feriados), respeitando a unidade quando definida.
export async function getBlocksForProfessional(
  supabase: any,
  profId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<{ start: Date; end: Date }[]> {
  const { data: prof } = await supabase
    .from('agend_profissionais')
    .select('empresa_id, unidade_id')
    .eq('id', profId)
    .maybeSingle();

  const scope = prof?.empresa_id
    ? `profissional_id.eq.${profId},and(profissional_id.is.null,empresa_id.eq.${prof.empresa_id})`
    : `profissional_id.eq.${profId}`;

  // Sobreposição com o intervalo (inclui bloqueios de vários dias)
  const { data: blocks } = await supabase
    .from('agend_bloqueios')
    .select('inicio, fim, profissional_id, unidade_id')
    .or(scope)
    .lt('inicio', rangeEnd)
    .gt('fim', rangeStart);

  return (blocks || [])
    .filter((b: any) => b.profissional_id || !b.unidade_id || !prof?.unidade_id || b.unidade_id === prof.unidade_id)
    .map((b: any) => ({ start: new Date(b.inicio), end: new Date(b.fim) }));
}
