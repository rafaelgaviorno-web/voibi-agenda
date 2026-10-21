import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, decodeSession } from '@/lib/session';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Rotas que não precisam de proteção (exceções)
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname === '/login' || pathname === '/') {
    return NextResponse.next();
  }

  // Sessão assinada; cookie alterado ou inventado é tratado como deslogado
  const authData = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);

  // Se não estiver logado e tentar acessar área protegida, joga pro login
  if (!authData) {
    if (pathname.startsWith('/superadmin') || pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Regras de acesso para logados:
  
  // 1. Acesso ao Superadmin
  if (pathname.startsWith('/superadmin')) {
    if (!authData.isSuperadmin) {
      if (authData.empresa_id) {
        return NextResponse.redirect(new URL(`/dashboard/${authData.empresa_id}/calendar`, request.url));
      }
      return NextResponse.redirect(new URL('/login?error=Acesso+Negado', request.url));
    }
  }

  // 2. Acesso ao Dashboard da Clínica
  if (pathname.startsWith('/dashboard')) {
    if (!authData.isSuperadmin) {
      const urlEmpresaId = pathname.split('/')[2];
      if (urlEmpresaId && urlEmpresaId !== authData.empresa_id) {
         return NextResponse.redirect(new URL(`/dashboard/${authData.empresa_id}/calendar`, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/superadmin/:path*',
    '/dashboard/:path*'
  ],
};
