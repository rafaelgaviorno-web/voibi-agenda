import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { withApiLogger } from '@/lib/api-logger';

export const GET = withApiLogger(async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const profissionalId = searchParams.get('profissional_id');

  const supabase = getServiceSupabase();
  let query = supabase.from('agend_tipos_evento').select(`
    id, nome, slug, duracao_minutos, buffer_antes_minutos, buffer_depois_minutos, antecedencia_min_horas, is_recorrente, profissional_id, unidade_id,
    agend_profissionais(id, nome, cor)
  `);

  query = query.eq('empresa_id', auth.empresa.id);

  if (profissionalId) {
    query = query.or(`profissional_id.eq.${profissionalId},profissional_id.is.null`);
  }

  const { data, error } = await query.order('nome', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data || [] });
});
