import type { NextRequest } from 'next/server';

// Endereço público do app. Atrás do proxy (Easypanel/Traefik) request.url pode vir como
// http://localhost:3000, então priorizamos APP_URL e depois os cabeçalhos x-forwarded-*.
export function requestOrigin(request: NextRequest) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  return host ? `${proto}://${host}` : request.nextUrl.origin;
}
