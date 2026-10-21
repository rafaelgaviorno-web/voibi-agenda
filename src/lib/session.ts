import { createHmac, timingSafeEqual } from 'node:crypto';

// Sessão do painel guardada no cookie "voibi-auth", assinada com HMAC-SHA256.
// Formato: base64url(JSON do payload) + "." + base64url(assinatura)
export const SESSION_COOKIE = 'voibi-auth';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export type Session = {
  id: string;
  isSuperadmin: boolean;
  empresa_id: string | null;
  exp: number; // segundos desde 1970
};

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Defina AUTH_SECRET para assinar as sessões do painel.');
  return secret;
}

const sign = (data: string) => createHmac('sha256', getSecret()).update(data).digest('base64url');

export function encodeSession(data: Omit<Session, 'exp'>): string {
  const payload: Session = { ...data, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function decodeSession(value: string | undefined | null): Session | null {
  if (!value) return null;
  const [body, signature] = value.split('.');
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const session = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Session;
    if (!session.id || typeof session.exp !== 'number' || session.exp < Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE,
};

// Superadmin acessa qualquer empresa; os demais só a própria
export function canAccessEmpresa(session: Session | null, empresaId: string) {
  if (!session) return false;
  return session.isSuperadmin || session.empresa_id === empresaId;
}

export async function getSession(): Promise<Session | null> {
  const { cookies } = await import('next/headers');
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
}
