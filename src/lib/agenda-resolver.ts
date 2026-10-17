import { SupabaseClient } from '@supabase/supabase-js';

export interface ResolvedAgenda {
  id: string;
  nome: string;
  cor?: string;
  intervalo_minutos?: number;
  webhook_url?: string | null;
  permitir_sobreposicao?: boolean;
}

/**
 * Resolve o profissional/agenda de forma resiliente, aceitando:
 * - UUID da agenda
 * - Nome exato (ex: "Dr Ricardo")
 * - Nome com pontuação/abreviação (ex: "Dr. Ricardo", "Dr.Ricardo")
 * - Nome parcial/primeiro nome (ex: "Ricardo")
 */
export async function resolveProfissional(
  supabase: SupabaseClient,
  empresaId: string,
  rawParam?: string | null
): Promise<ResolvedAgenda | null> {
  if (!rawParam) return null;

  const cleanProf = String(rawParam).trim();
  if (!cleanProf) return null;

  const isProfUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanProf);
  if (isProfUuid) {
    const { data: p } = await supabase
      .from('agend_profissionais')
      .select('id, nome, cor, intervalo_minutos, webhook_url, permitir_sobreposicao')
      .eq('id', cleanProf)
      .eq('empresa_id', empresaId)
      .maybeSingle();

    if (p) return p;
  }

  // 1. Tentar busca exata ou ilike direto
  const { data: directMatch } = await supabase
    .from('agend_profissionais')
    .select('id, nome, cor, intervalo_minutos, webhook_url, permitir_sobreposicao')
    .eq('empresa_id', empresaId)
    .ilike('nome', `%${cleanProf}%`)
    .limit(1)
    .maybeSingle();

  if (directMatch) return directMatch;

  // 2. Normalizar removendo pontuação (ex: "Dr. Ricardo" -> "Dr Ricardo")
  const stripped = cleanProf.replace(/[.\-_,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (stripped && stripped !== cleanProf) {
    const { data: strippedMatch } = await supabase
      .from('agend_profissionais')
      .select('id, nome, cor, intervalo_minutos, webhook_url, permitir_sobreposicao')
      .eq('empresa_id', empresaId)
      .ilike('nome', `%${stripped}%`)
      .limit(1)
      .maybeSingle();

    if (strippedMatch) return strippedMatch;
  }

  // 3. Tentar pelas palavras principais (ignora "dr", "dra", "doutor", "doutora")
  const words = cleanProf
    .replace(/[.\-_,]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 3 && !/^(dr|dra|doutor|doutora)$/i.test(w));

  for (const word of words) {
    const { data: wordMatch } = await supabase
      .from('agend_profissionais')
      .select('id, nome, cor, intervalo_minutos, webhook_url, permitir_sobreposicao')
      .eq('empresa_id', empresaId)
      .ilike('nome', `%${word}%`)
      .limit(1)
      .maybeSingle();

    if (wordMatch) return wordMatch;
  }

  return null;
}
