import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('agend_agendamentos')
    .select('*, agend_clientes_finais(*), agend_tipos_evento(*), agend_profissionais!inner(id, nome, cor, empresa_id)')
    .eq('id', id)
    .eq('agend_profissionais.empresa_id', auth.empresa.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json();
  const supabase = getServiceSupabase();

  // Valida se o agendamento pertence à empresa
  const { data: existing } = await supabase
    .from('agend_agendamentos')
    .select('id, profissional_id, agend_profissionais!inner(empresa_id)')
    .eq('id', id)
    .eq('agend_profissionais.empresa_id', auth.empresa.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });

  const { data, error } = await supabase
    .from('agend_agendamentos')
    .update(body)
    .eq('id', id)
    .select('*, agend_clientes_finais(*), agend_tipos_evento(*), agend_profissionais(*)')
    .single();

  if (error) {
    if (error.message.includes('conflict') || error.message.includes('overlapping')) {
      return NextResponse.json({ error: 'Horário indisponível (conflito)' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (auth.empresa.webhook_url && data) {
    fetch(auth.empresa.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'booking.updated', data })
    }).catch(console.error);
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const supabase = getServiceSupabase();

  // Valida se o agendamento pertence à empresa
  const { data: existing } = await supabase
    .from('agend_agendamentos')
    .select('id, profissional_id, agend_profissionais!inner(empresa_id)')
    .eq('id', id)
    .eq('agend_profissionais.empresa_id', auth.empresa.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });

  // Tenta ler motivo caso enviado no body ou query param
  let motivo = '';
  try {
    const body = await request.json();
    if (body?.motivo) motivo = body.motivo;
  } catch {
    motivo = new URL(request.url).searchParams.get('motivo') || '';
  }

  const updatePayload: { status: string; observacao?: string } = { status: 'cancelado' };
  if (motivo) {
    updatePayload.observacao = `Cancelado: ${motivo}`;
  }

  const { data, error } = await supabase
    .from('agend_agendamentos')
    .update(updatePayload)
    .eq('id', id)
    .select('*, agend_clientes_finais(*), agend_tipos_evento(*), agend_profissionais(*)')
    .single();

  if (error || !data) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });

  if (auth.empresa.webhook_url && data) {
    fetch(auth.empresa.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'booking.cancelled', data, motivo: motivo || null })
    }).catch(console.error);
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Agendamento cancelado com sucesso', 
    data 
  });
}
