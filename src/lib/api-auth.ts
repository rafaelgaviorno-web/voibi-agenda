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
  const supabase = getServiceSupabase();

  const { data: empresa, error } = await supabase
    .from('agend_empresas')
    .select('id, slug, fuso_horario, webhook_url')
    .eq('api_key', apiKey)
    .single();

  if (error || !empresa) {
    return { error: 'Unauthorized: Invalid API Key', status: 401 };
  }

  return { empresa };
}
