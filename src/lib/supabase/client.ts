import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente público (para componentes client-side)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
