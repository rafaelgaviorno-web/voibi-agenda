import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { withApiLogger } from '@/lib/api-logger';

export const POST = withApiLogger(async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const supabase = getServiceSupabase();

  const { data: existing } = await supabase
    .from('agend_agendamentos')
    .select('id, status, observacao, profissional_id, agend_profissionais!inner(empresa_id)')
    .eq('id', id)
    .eq('agend_profissionais.empresa_id', auth.empresa.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  const observacaoAdicional = body?.observacao || 'Confirmado via WhatsApp/Chat';
  const obsFinal = existing.observacao && !existing.observacao.includes('Confirmado')
    ? `${existing.observacao} | ${observacaoAdicional}`
    : (existing.observacao || observacaoAdicional);

  const { data: updated, error } = await supabase
    .from('agend_agendamentos')
    .update({
      status: 'confirmado',
      observacao: obsFinal
    })
    .eq('id', id)
    .select('*, agend_clientes_finais(*), agend_tipos_evento(*), agend_profissionais(*)')
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: error?.message || 'Erro ao confirmar agendamento.' }, { status: 400 });
  }

  const formatted = {
    ...updated,
    status: 'confirmado',
    status_agendamento: 'confirmado',
    status_atendimento: updated.status_atendimento || 'agendado'
  };

  const { triggerBookingWebhook } = await import('@/lib/webhook');
  triggerBookingWebhook('booking.updated', formatted, auth.empresa.id).catch(console.error);

  const msg = 'Agendamento confirmado com sucesso!';
  return NextResponse.json({
    success: true,
    message: msg,
    text: msg,
    data: formatted
  });
});
