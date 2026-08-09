import { getServiceSupabase } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import ThemeToggleLogin from './ThemeToggleLogin';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorMessage } = await searchParams;

  async function signIn(formData: FormData) {
    'use server';
    const email = formData.get('login_email_unique')?.toString() || '';
    const password = formData.get('login_password_unique')?.toString() || '';
    const supabase = getServiceSupabase();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      redirect('/login?error=' + encodeURIComponent('Credenciais inválidas'));
    }

    // Verificar se é superadmin (usando a metadata que criamos)
    const isSuperadmin = authData.user.user_metadata?.is_superadmin === true;
    if (isSuperadmin) {
      const cookieStore = await cookies();
      cookieStore.set('voibi-auth', JSON.stringify({
         id: authData.user.id,
         isSuperadmin: true,
         empresa_id: null
      }), { secure: true, httpOnly: true, path: '/' });
      redirect('/superadmin');
    }

    // Se não for superadmin, buscar qual a clínica dele
    const { data: userData, error: userError } = await supabase
      .from('agend_usuarios')
      .select('empresa_id')
      .eq('id', authData.user.id)
      .single();

    if (userData?.empresa_id) {
      const cookieStore = await cookies();
      cookieStore.set('voibi-auth', JSON.stringify({
         id: authData.user.id,
         isSuperadmin: false,
         empresa_id: userData.empresa_id
      }), { secure: true, httpOnly: true, path: '/' });
      redirect(`/dashboard/${userData.empresa_id}/calendar`);
    } else {
      // Falha ao achar a empresa
      redirect('/login?error=' + encodeURIComponent('Usuário sem clínica vinculada'));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black relative">
      <ThemeToggleLogin />
      <div className="max-w-md w-full p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl dark:shadow-2xl">
        <div className="flex justify-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight"><span className="text-blue-600">Voibi</span> <span className="text-zinc-900 dark:text-white">Agenda</span></h1>
        </div>
        
        <p className="text-zinc-500 dark:text-zinc-400 text-center mb-8 text-sm">Faça login para acessar sua agenda</p>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6 text-center">
            {errorMessage}
          </div>
        )}

        <form action={signIn} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">E-mail</label>
            <input 
              required 
              type="email" 
              name="login_email_unique" 
              autoComplete="new-email"
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
              placeholder="seu@email.com" 
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Senha</label>
              <a href="/esqueci-senha" className="text-xs font-medium text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors">Esqueci minha senha</a>
            </div>
            <input 
              required 
              type="password" 
              name="login_password_unique" 
              autoComplete="new-password"
              className="w-full bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
              placeholder="••••••••" 
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/20 mt-4"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
