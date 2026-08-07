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
    .select('*, agend_clientes_finais(*), agend_tipos_evento(*)')
    .eq('id', id)
    .eq('empresa_id', auth.empresa.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json();
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('agend_agendamentos')
    .update(body) // { inicio, fim, status, etc }
    .eq('id', id)
    .eq('empresa_id', auth.empresa.id)
    .select('*')
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

  const { data, error } = await supabase
    .from('agend_agendamentos')
    .update({ status: 'cancelado' })
    .eq('id', id)
    .eq('empresa_id', auth.empresa.id)
    .select('*')
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (auth.empresa.webhook_url && data) {
    fetch(auth.empresa.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'booking.cancelled', data })
    }).catch(console.error);
  }

  return NextResponse.json({ data });
}
