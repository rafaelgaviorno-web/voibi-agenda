import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { withApiLogger } from '@/lib/api-logger';

export const GET = withApiLogger(async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getServiceSupabase();

  const { data: regras, error } = await supabase
    .from('agend_regras_lembretes')
    .select('*')
    .eq('empresa_id', auth.empresa.id)
    .order('minutos_antes', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: regras || [] });
});

export const POST = withApiLogger(async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const { id, nome, minutos_antes, mensagem_template, ativo } = body;

  if (!nome || typeof minutos_antes !== 'number' || !mensagem_template) {
    return NextResponse.json({
      error: 'Campos obrigatórios: nome (string), minutos_antes (number), mensagem_template (string)'
    }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  if (id) {
    // Atualizar
    const { data: updated, error } = await supabase
      .from('agend_regras_lembretes')
      .update({
        nome,
        minutos_antes,
        mensagem_template,
        ativo: typeof ativo === 'boolean' ? ativo : true
      })
      .eq('id', id)
      .eq('empresa_id', auth.empresa.id)
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data: updated });
  } else {
    // Criar
    const { data: created, error } = await supabase
      .from('agend_regras_lembretes')
      .insert({
        empresa_id: auth.empresa.id,
        nome,
        minutos_antes,
        mensagem_template,
        ativo: typeof ativo === 'boolean' ? ativo : true
      })
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  }
});

export const DELETE = withApiLogger(async function DELETE(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Parâmetro ?id= é obrigatório' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { error } = await supabase
    .from('agend_regras_lembretes')
    .delete()
    .eq('id', id)
    .eq('empresa_id', auth.empresa.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Regra de lembrete removida com sucesso' });
});
