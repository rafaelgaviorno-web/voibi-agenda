import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { getSession, canAccessEmpresa } from '@/lib/session';
import { decodeState, exchangeCode } from '@/lib/google-calendar';
import { requestOrigin } from '../origin';

// Retorno do Google depois que o profissional autoriza o acesso ao calendário
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const origin = requestOrigin(request);
  const state = decodeState(sp.get('state'));
  if (!state) return NextResponse.redirect(`${origin}/dashboard`);

  const back = `${origin}/dashboard/${state.empresaId}/agendas/${state.agendaId}`;
  const session = await getSession();
  if (!canAccessEmpresa(session, state.empresaId)) return NextResponse.redirect(`${origin}/login`);

  const code = sp.get('code');
  if (!code) return NextResponse.redirect(`${back}?google=cancelado`);

  try {
    const { refreshToken, email } = await exchangeCode(code, origin);
    if (!refreshToken) return NextResponse.redirect(`${back}?google=sem_token`);

    const supabase = getServiceSupabase();
    const { data: prof } = await supabase
      .from('agend_profissionais')
      .select('id')
      .eq('id', state.agendaId)
      .eq('empresa_id', state.empresaId)
      .maybeSingle();
    if (!prof) return NextResponse.redirect(`${back}?google=sem_acesso`);

    const { error } = await supabase.from('agend_google_contas').upsert({
      profissional_id: state.agendaId,
      email,
      refresh_token: refreshToken,
      calendar_id: 'primary',
      conectado_em: new Date().toISOString(),
      ultimo_erro: null,
      ultimo_erro_em: null,
    });
    if (error) throw error;

    return NextResponse.redirect(`${back}?google=conectado`);
  } catch (err: any) {
    console.error('[Google Agenda] erro no callback:', err?.message || err);
    return NextResponse.redirect(`${back}?google=erro`);
  }
}
