import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { withApiLogger } from '@/lib/api-logger';

export const POST = withApiLogger(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  if (!existing) {
    return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
  }

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

  if (error || !data) {
    return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
  }

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
});
