import { NextRequest } from 'next/server';
import { getServiceSupabase } from './supabase/client';

export type AuthResult = 
  | { error: string; status: number; empresa?: never }
  | { error?: never; status?: never; empresa: any };

export async function authenticateApiKey(request: NextRequest): Promise<AuthResult> {
  let apiKey: string | null = null;

  // 1. Header Authorization (Bearer <token> ou <token> direto)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const trimmed = authHeader.trim();
    if (/^bearer\s+/i.test(trimmed)) {
      apiKey = trimmed.replace(/^bearer\s+/i, '').trim();
    } else {
      apiKey = trimmed;
    }
  }

  // 2. Header x-api-key ou apikey
  if (!apiKey) {
    apiKey = request.headers.get('x-api-key') || request.headers.get('apikey');
  }

  // 3. Query params ?api_key=... ou ?apiKey=...
  if (!apiKey) {
    const { searchParams } = new URL(request.url);
    apiKey = searchParams.get('api_key') || searchParams.get('apiKey');
  }

  if (!apiKey) {
    return { error: 'Unauthorized: Missing or invalid API Key. Forneça via header Authorization (Bearer <token>) ou x-api-key.', status: 401 };
  }

  const supabase = getServiceSupabase();

  // Suporte à chave de teste do ambiente de demonstração
  if (apiKey === 'sk_test_voibi_1234567890abcdef') {
    const { data: firstEmp } = await supabase
      .from('agend_empresas')
      .select('id, slug, fuso_horario, webhook_url')
      .limit(1)
      .maybeSingle();

    if (firstEmp) {
      return { empresa: firstEmp };
    }
  }

  try {
    const { data: empresa, error } = await supabase
      .from('agend_empresas')
      .select('id, slug, fuso_horario, webhook_url')
      .eq('api_key', apiKey)
      .maybeSingle();

    if (error || !empresa) {
      return { error: 'Unauthorized: Invalid API Key', status: 401 };
    }

    const { cacheApiKeyEmpresa } = await import('./api-logger');
    cacheApiKeyEmpresa(apiKey, empresa.id);

    return { empresa };
  } catch {
    return { error: 'Unauthorized: Invalid API Key format', status: 401 };
  }
}
