import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente público (para componentes client-side)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente só para conferir e-mail e senha no servidor. Depois de um signIn, o supabase-js
// passa a enviar o token do usuário nas consultas desse cliente; por isso o login nunca
// deve usar o cliente de serviço para entrar (as tabelas têm RLS e o usuário comum não as lê).
export const getAuthSupabase = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  });

// Cliente com privilégios administrativos (apenas para rotas de API server-side)
export const getServiceSupabase = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is not defined");
  }
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || '', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  });
};
