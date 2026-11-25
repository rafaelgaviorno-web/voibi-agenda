import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { getServiceSupabase } from './supabase/client';
import { clinicNow, DEFAULT_TIMEZONE, isValidTimeZone } from './timezone';

// Integração com o Google Agenda: cada agenda (profissional) conecta uma conta Google.
// Ao criar/alterar/cancelar um agendamento, o evento correspondente é criado/atualizado/apagado
// no Google, com link do Google Meet. Os compromissos do Google também bloqueiam horários.
//
// Variáveis de ambiente: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e APP_URL
// (ex.: https://agenda.voibi.com.br). Redirect URI no Google Cloud: <APP_URL>/api/google/callback

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

const ACTIVE_STATUSES = ['confirmado', 'pendente', 'remarcado'];

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function appUrl(fallbackOrigin?: string) {
  return (process.env.APP_URL || fallbackOrigin || 'https://agenda.voibi.com.br').replace(/\/$/, '');
}

export function redirectUri(fallbackOrigin?: string) {
  return `${appUrl(fallbackOrigin)}/api/google/callback`;
}

// ---------- state assinado do OAuth (evita que alguém conecte a conta na agenda de outro) ----------

function stateSecret() {
  const s = process.env.AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('Defina AUTH_SECRET.');
  return s;
}

export type OAuthState = { agendaId: string; empresaId: string; exp: number; nonce: string };

export function encodeState(data: { agendaId: string; empresaId: string }) {
  const payload: OAuthState = { ...data, exp: Math.floor(Date.now() / 1000) + 600, nonce: randomUUID() };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', stateSecret()).update(`google:${body}`).digest('base64url');
  return `${body}.${sig}`;
}

export function decodeState(value: string | null): OAuthState | null {
  if (!value) return null;
  const [body, sig] = value.split('.');
  if (!body || !sig) return null;
  const expected = Buffer.from(createHmac('sha256', stateSecret()).update(`google:${body}`).digest('base64url'));
  const received = Buffer.from(sig);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const st = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthState;
    if (!st.agendaId || !st.empresaId || st.exp < Date.now() / 1000) return null;
    return st;
  } catch {
    return null;
  }
}

export function buildAuthUrl(state: string, fallbackOrigin?: string) {
  const qs = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri(fallbackOrigin),
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${qs}`;
}

export async function exchangeCode(code: string, fallbackOrigin?: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri(fallbackOrigin),
      grant_type: 'authorization_code',
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error_description || json.error || `Google respondeu ${res.status}`);
  let email: string | null = null;
  if (json.id_token) {
    try {
      email = JSON.parse(Buffer.from(String(json.id_token).split('.')[1], 'base64url').toString('utf8')).email || null;
    } catch { /* sem e-mail */ }
  }
  return { refreshToken: json.refresh_token as string | undefined, accessToken: json.access_token as string, email };
}

// ---------- tokens ----------

declare global {
  var __VOIBI_GOOGLE_TOKENS__: Map<string, { token: string; exp: number }> | undefined;
}
const tokenCache = (globalThis.__VOIBI_GOOGLE_TOKENS__ ||= new Map());

type Conta = {
  profissional_id: string;
  email: string | null;
  refresh_token: string;
  calendar_id: string;
  bloquear_ocupados: boolean;
  criar_meet: boolean;
};

// Liberado pelo superadmin para a empresa (agend_empresas.google_agenda_habilitado)
export async function empresaGoogleHabilitado(empresaId: string | null | undefined): Promise<boolean> {
  if (!empresaId) return false;
  const { data, error } = await getServiceSupabase()
    .from('agend_empresas')
    .select('google_agenda_habilitado')
    .eq('id', empresaId)
    .maybeSingle();
  return !error && data?.google_agenda_habilitado === true;
}

export async function getConta(profissionalId: string): Promise<Conta | null> {
  if (!googleConfigured() || !profissionalId) return null;
  const supabase = getServiceSupabase();
  const { data: prof } = await supabase.from('agend_profissionais').select('empresa_id').eq('id', profissionalId).maybeSingle();
  if (!(await empresaGoogleHabilitado(prof?.empresa_id))) return null;
  const { data } = await supabase
    .from('agend_google_contas')
    .select('profissional_id, email, refresh_token, calendar_id, bloquear_ocupados, criar_meet')
    .eq('profissional_id', profissionalId)
    .maybeSingle();
  return (data as Conta) || null;
}

async function accessToken(conta: Conta): Promise<string> {
  const cached = tokenCache.get(conta.profissional_id);
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: conta.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`token: ${json.error_description || json.error || res.status}`);
  tokenCache.set(conta.profissional_id, { token: json.access_token, exp: Date.now() + (json.expires_in || 3600) * 1000 });
  return json.access_token;
}

async function gapi(conta: Conta, path: string, init: { method?: string; body?: unknown; query?: Record<string, string> } = {}) {
  const token = await accessToken(conta);
  const qs = init.query ? `?${new URLSearchParams(init.query)}` : '';
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}${qs}`, {
    method: init.method || 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 204) return { ok: true, status: 204, json: {} as any };
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function registrarErro(profissionalId: string, erro: string | null) {
  await getServiceSupabase()
    .from('agend_google_contas')
    .update({ ultimo_erro: erro, ultimo_erro_em: erro ? new Date().toISOString() : null })
    .eq('profissional_id', profissionalId);
}

// ---------- sincronização de agendamentos ----------

const BOOKING_SELECT = `
  id, inicio, fim, status, observacao, google_event_id, meet_link, profissional_id,
  agend_clientes_finais(nome, email, telefone),
  agend_tipos_evento(nome),
  agend_profissionais(id, nome, empresa_id, agend_empresas(nome, fuso_horario))
`;

function localIso(v: string) {
  return String(v).replace(' ', 'T').slice(0, 19);
}

function buildEvent(b: any, conta: Conta, withMeet: boolean) {
  const prof = b.agend_profissionais || {};
  const empresa = prof.agend_empresas || {};
  const tz = isValidTimeZone(empresa.fuso_horario) ? empresa.fuso_horario : DEFAULT_TIMEZONE;
  const cliente = b.agend_clientes_finais || {};
  const tipo = b.agend_tipos_evento?.nome || 'Agendamento';
  const summary = cliente.nome ? `${tipo} - ${cliente.nome}` : tipo;
  const description = [
    cliente.nome && `Cliente: ${cliente.nome}`,
    cliente.telefone && `WhatsApp: ${cliente.telefone}`,
    cliente.email && `E-mail: ${cliente.email}`,
    b.observacao && `\n${b.observacao}`,
    `\nCriado pelo Voibi Agenda (${empresa.nome || ''})`,
  ].filter(Boolean).join('\n');

  const event: any = {
    summary,
    description,
    start: { dateTime: localIso(b.inicio), timeZone: tz },
    end: { dateTime: localIso(b.fim), timeZone: tz },
    extendedProperties: { private: { voibi_agendamento_id: b.id } },
    reminders: { useDefault: true },
  };
  if (withMeet) {
    event.conferenceData = { createRequest: { requestId: `voibi-${b.id}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } };
  }
  return event;
}

function meetFrom(ev: any): string | null {
  return ev?.hangoutLink || ev?.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri || null;
}

export type GoogleSyncResult = { google_event_id: string | null; meet_link: string | null } | null;

/**
 * Cria, atualiza ou apaga o evento do Google para um agendamento.
 * `fallback` = dados do agendamento já em memória (usado quando a linha foi apagada do banco).
 * Nunca lança erro: falha do Google não pode impedir o agendamento.
 */
export async function syncBookingToGoogle(
  event: 'booking.created' | 'booking.updated' | 'booking.cancelled',
  bookingId: string,
  fallback?: any
): Promise<GoogleSyncResult> {
  if (!googleConfigured() || !bookingId) return null;
  const supabase = getServiceSupabase();
  let profId: string | null = null;
  try {
    const { data: row } = await supabase.from('agend_agendamentos').select(BOOKING_SELECT).eq('id', bookingId).maybeSingle();
    const b: any = row || fallback;
    if (!b) return null;
    profId = b.profissional_id || b.agend_profissionais?.id || null;
    if (!profId) return null;

    const conta = await getConta(profId);
    const cal = encodeURIComponent(conta?.calendar_id || 'primary');
    const cancelado = event === 'booking.cancelled' || !row || !ACTIVE_STATUSES.includes(b.status || 'pendente');

    // Agenda sem Google: se o agendamento mudou de agenda, o evento antigo fica órfão; só limpamos se ainda houver conta.
    if (!conta) return { google_event_id: b.google_event_id || null, meet_link: b.meet_link || null };

    if (cancelado) {
      if (b.google_event_id) {
        const r = await gapi(conta, `/calendars/${cal}/events/${encodeURIComponent(b.google_event_id)}`, {
          method: 'DELETE', query: { sendUpdates: 'all' },
        });
        if (!r.ok && r.status !== 404 && r.status !== 410) throw new Error(`delete ${r.status}: ${r.json?.error?.message || ''}`);
        if (row) await supabase.from('agend_agendamentos').update({ google_event_id: null }).eq('id', b.id);
      }
      await registrarErro(profId, null);
      return { google_event_id: null, meet_link: b.meet_link || null };
    }

    // Já sincronizado na criação (ex.: a API de bookings sincroniza antes de responder)
    if (event === 'booking.created' && b.google_event_id) {
      return { google_event_id: b.google_event_id, meet_link: b.meet_link || null };
    }

    const body = buildEvent(b, conta, conta.criar_meet && !b.meet_link);
    const query: Record<string, string> = { conferenceDataVersion: '1', sendUpdates: 'none' };
    let r;
    if (b.google_event_id) {
      r = await gapi(conta, `/calendars/${cal}/events/${encodeURIComponent(b.google_event_id)}`, { method: 'PATCH', body, query });
      if (r.status === 404 || r.status === 410) r = null; // apagado no Google: recria
    }
    if (!r) {
      r = await gapi(conta, `/calendars/${cal}/events`, { method: 'POST', body: buildEvent(b, conta, conta.criar_meet), query });
    }
    if (!r.ok) throw new Error(`${r.status}: ${r.json?.error?.message || 'erro no Google'}`);

    const result = { google_event_id: r.json.id as string, meet_link: meetFrom(r.json) || b.meet_link || null };
    await supabase.from('agend_agendamentos').update(result).eq('id', b.id);
    await registrarErro(profId, null);
    return result;
  } catch (err: any) {
    console.error(`[Google Agenda] falha ao sincronizar ${event} ${bookingId}:`, err?.message || err);
    if (profId) await registrarErro(profId, String(err?.message || err).slice(0, 500)).catch(() => {});
    return null;
  }
}

// ---------- horários ocupados no Google (bloqueiam a agenda) ----------

/**
 * Períodos ocupados no Google Agenda do profissional, no mesmo "relógio da clínica"
 * usado pelo motor de disponibilidade. Eventos criados pelo próprio Voibi Agenda também
 * aparecem aqui, o que não tem problema: o horário já está ocupado de qualquer forma.
 */
export async function getGoogleBusy(profissionalId: string, dateStr: string, tz?: string | null): Promise<{ start: Date; end: Date }[]> {
  try {
    const conta = await getConta(profissionalId);
    if (!conta || !conta.bloquear_ocupados) return [];
    const day = new Date(`${dateStr}T12:00:00Z`);
    const timeMin = new Date(day.getTime() - 36 * 3600_000).toISOString();
    const timeMax = new Date(day.getTime() + 36 * 3600_000).toISOString();
    const r = await gapi(conta, '/freeBusy', {
      method: 'POST',
      body: { timeMin, timeMax, items: [{ id: conta.calendar_id || 'primary' }] },
    });
    if (!r.ok) throw new Error(`freeBusy ${r.status}: ${r.json?.error?.message || ''}`);
    const cal = r.json.calendars?.[conta.calendar_id || 'primary'] || Object.values(r.json.calendars || {})[0] as any;
    return (cal?.busy || []).map((p: any) => ({
      start: clinicNow(tz, new Date(p.start)),
      end: clinicNow(tz, new Date(p.end)),
    }));
  } catch (err: any) {
    console.error('[Google Agenda] falha ao ler horários ocupados:', err?.message || err);
    return [];
  }
}
