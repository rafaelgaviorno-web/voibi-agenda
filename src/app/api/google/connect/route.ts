import { NextRequest, NextResponse } from 'next/server';
import { getSession, canAccessEmpresa } from '@/lib/session';
import { canUseAgendas } from '@/lib/permissions';
import { getServiceSupabase } from '@/lib/supabase/client';
import { buildAuthUrl, encodeState, googleConfigured } from '@/lib/google-calendar';
import { requestOrigin } from '../origin';

// GET /api/google/connect?empresa=<id>&agenda=<id>  ->  tela de consentimento do Google
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const empresaId = sp.get('empresa') || '';
  const agendaId = sp.get('agenda') || '';
  const origin = requestOrigin(request);
  const back = `${origin}/dashboard/${empresaId}/agendas/${agendaId}`;

  if (!googleConfigured()) {
    return NextResponse.redirect(`${back}?google=nao_configurado`);
  }

  const session = await getSession();
  if (!canAccessEmpresa(session, empresaId)) {
    return NextResponse.redirect(`${origin}/login`);
  }
  if (!(await canUseAgendas(getServiceSupabase(), session, empresaId, [agendaId]))) {
    return NextResponse.redirect(`${back}?google=sem_acesso`);
  }

  return NextResponse.redirect(buildAuthUrl(encodeState({ agendaId, empresaId }), origin));
}
