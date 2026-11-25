import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { GET as availabilityGET } from '@/app/api/v1/availability/route';
import { POST as bookingsPOST } from '@/app/api/v1/bookings/route';

// Endpoints da página pública de agendamento (/agendar/<empresa>/<agenda>).
// A página não tem chave de API: aqui o servidor busca a chave da empresa e repassa a chamada para a
// API v1, para valer exatamente a mesma regra de horários, bloqueios e conflitos usada pela IA.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveEmpresaAgenda(empresaId: unknown, agendaId: unknown) {
  if (typeof empresaId !== 'string' || typeof agendaId !== 'string' || !UUID.test(empresaId) || !UUID.test(agendaId)) {
    return null;
  }
  const supabase = getServiceSupabase();
  const { data: prof } = await supabase
    .from('agend_profissionais')
    .select('id, empresa_id')
    .eq('id', agendaId)
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (!prof) return null;
  const { data: emp } = await supabase
    .from('agend_empresas')
    .select('api_key')
    .eq('id', empresaId)
    .maybeSingle();
  if (!emp?.api_key) return null;
  return { apiKey: emp.api_key as string, agendaId };
}

function internalRequest(request: NextRequest, path: string, apiKey: string, init?: { method: string; body: unknown }) {
  const url = new URL(path, request.url);
  return new NextRequest(url, {
    method: init?.method || 'GET',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'user-agent': 'voibi-agenda-pagina-publica',
    },
    body: init ? JSON.stringify(init.body) : undefined,
  });
}

// GET /api/public/agendar?empresa=<id>&agenda=<id>&date=YYYY-MM-DD -> { times: ["09:00", ...] }
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const ctx = await resolveEmpresaAgenda(sp.get('empresa'), sp.get('agenda'));
  if (!ctx) return NextResponse.json({ error: 'Agenda não encontrada' }, { status: 404 });

  const date = sp.get('date') || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
  }

  const qs = new URLSearchParams({ date, agenda: ctx.agendaId, limit: '100' });
  const res = await availabilityGET(internalRequest(request, `/api/v1/availability?${qs}`, ctx.apiKey));
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: json.error || 'Erro ao buscar horários' }, { status: res.status });

  const times: string[] = Array.isArray(json.available_times)
    ? json.available_times
    : (Array.isArray(json.data) ? json.data.map((s: any) => s.time).filter(Boolean) : []);
  return NextResponse.json({ times });
}

// POST /api/public/agendar  { empresa, agenda, date, time, nome, telefone, observacao? }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({} as any));
  const ctx = await resolveEmpresaAgenda(body.empresa, body.agenda);
  if (!ctx) return NextResponse.json({ error: 'Agenda não encontrada' }, { status: 404 });

  const date = String(body.date || '');
  const time = String(body.time || '');
  const nome = String(body.nome || '').trim().slice(0, 120);
  const telefone = String(body.telefone || '').replace(/[^\d+]/g, '').slice(0, 20);
  const observacao = String(body.observacao || '').trim().slice(0, 1000);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: 'Escolha um dia e um horário.' }, { status: 400 });
  }
  if (nome.length < 2 || telefone.replace(/\D/g, '').length < 10) {
    return NextResponse.json({ error: 'Informe nome e WhatsApp com DDD.' }, { status: 400 });
  }

  // Só campos permitidos: a página pública não pode marcar encaixe, mudar status nem remarcar consultas.
  const res = await bookingsPOST(internalRequest(request, '/api/v1/bookings', ctx.apiKey, {
    method: 'POST',
    body: {
      agenda: ctx.agendaId,
      inicio: `${date}T${time}:00`,
      nome,
      telefone: telefone.replace(/\D/g, ''),
      observacao: observacao ? `Agendado pela página pública | ${observacao}` : 'Agendado pela página pública',
    },
  }));
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return NextResponse.json({ error: json.error || 'Não foi possível agendar' }, { status: res.status });
  return NextResponse.json({ id: json.data?.id, inicio: json.data?.inicio, meet_link: json.meet_link || null }, { status: 201 });
}
