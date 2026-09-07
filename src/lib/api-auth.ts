import { NextRequest } from 'next/server';
import { getServiceSupabase } from './supabase/client';

export type AuthResult = 
  | { error: string; status: number; empresa?: never }
  | { error?: never; status?: never; empresa: any };

export async function authenticateApiKey(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized: Missing or invalid token format', status: 401 };
  }

  const apiKey = authHeader.split(' ')[1];
  if (!apiKey) {
    return { error: 'Unauthorized: Invalid token', status: 401 };
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
