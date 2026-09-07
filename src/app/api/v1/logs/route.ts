import { NextRequest, NextResponse } from 'next/server';
import { getApiLogs, clearApiLogs } from '@/lib/api-logger';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get('empresa_id');
  const limitParam = parseInt(searchParams.get('limit') || '100', 10);

  if (!empresaId) {
    return NextResponse.json({ error: 'empresa_id é obrigatório' }, { status: 400 });
  }

  // Verifica se o usuário tem cookie de autenticação do painel ou Bearer token
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('voibi-auth');
  const authHeader = request.headers.get('authorization');

  if (!authCookie && !authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = await getApiLogs(empresaId, limitParam);
  return NextResponse.json({ data: logs });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get('empresa_id');

  if (!empresaId) {
    return NextResponse.json({ error: 'empresa_id é obrigatório' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const authCookie = cookieStore.get('voibi-auth');
  const authHeader = request.headers.get('authorization');

  if (!authCookie && !authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await clearApiLogs(empresaId);
  return NextResponse.json({ success: true, message: 'Logs limpos com sucesso' });
}
