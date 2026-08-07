import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(request.url);
  const empresaSlug = searchParams.get('empresa_slug');
  const profissionalId = searchParams.get('profissional_id');

  const supabase = getServiceSupabase();
  let query = supabase.from('agend_tipos_evento').select(`
    id, nome, slug, duracao_minutos, buffer_antes_minutos, buffer_depois_minutos, antecedencia_min_horas,
    profissional_id,
    agend_profissionais!inner(id, nome, empresa_id, agend_empresas!inner(slug))
  `);

  if (empresaSlug) {
    query = query.eq('agend_profissionais.agend_empresas.slug', empresaSlug);
  } else {
    query = query.eq('agend_profissionais.empresa_id', auth.empresa.id);
  }

  if (profissionalId) {
    query = query.eq('profissional_id', profissionalId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
