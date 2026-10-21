import { NextRequest, NextResponse } from 'next/server';
import { getApiLogs, clearApiLogs } from '@/lib/api-logger';
import { authenticateApiKey } from '@/lib/api-auth';
import { canAccessEmpresa, getSession } from '@/lib/session';

// Acesso: sessão do painel com permissão na empresa, ou chave de API da própria empresa
async function isAuthorized(request: NextRequest, empresaId: string) {
  if (canAccessEmpresa(await getSession(), empresaId)) return true;

  const hasApiKey =
    request.headers.get('authorization') || request.headers.get('x-api-key') || request.headers.get('apikey');
  if (!hasApiKey) return false;
  const auth = await authenticateApiKey(request);
  return !auth.error && auth.empresa?.id === empresaId;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get('empresa_id');
  const limitParam = parseInt(searchParams.get('limit') || '100', 10);

  if (!empresaId) {
    return NextResponse.json({ error: 'empresa_id é obrigatório' }, { status: 400 });
  }

  if (!(await isAuthorized(request, empresaId))) {
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

  if (!(await isAuthorized(request, empresaId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await clearApiLogs(empresaId);
  return NextResponse.json({ success: true, message: 'Logs limpos com sucesso' });
}
