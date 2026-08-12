import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Rotas que não precisam de proteção (exceções)
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname === '/login' || pathname === '/') {
    return NextResponse.next();
  }

  // Tenta ler o cookie de autenticação
  const authCookie = request.cookies.get('voibi-auth');
  let authData = null;
  
  try {
    if (authCookie?.value) {
      authData = JSON.parse(authCookie.value);
    }
  } catch (e) {
    // Cookie inválido
  }

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
