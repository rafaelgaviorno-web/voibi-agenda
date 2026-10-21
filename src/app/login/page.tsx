import { getServiceSupabase } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AuthShell, { AuthAlert, authButton, authInput, authLabel } from '@/components/AuthShell';

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
      }), { secure: process.env.NODE_ENV === 'production', httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
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
      }), { secure: process.env.NODE_ENV === 'production', httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
      redirect(`/dashboard/${userData.empresa_id}/calendar`);
    } else {
      // Falha ao achar a empresa
      redirect('/login?error=' + encodeURIComponent('Usuário sem clínica vinculada'));
    }
  }

  return (
    <AuthShell title="Bem-vindo de volta" description="Entre com seu e-mail e senha para acessar sua agenda.">
      {errorMessage && <AuthAlert type="error">{errorMessage}</AuthAlert>}

      <form action={signIn} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="login_email_unique" className={authLabel}>E-mail</label>
          <input 
            required 
            id="login_email_unique"
            type="email" 
            name="login_email_unique" 
            autoComplete="new-email"
            className={authInput}
            placeholder="seu@email.com" 
          />
        </div>
        
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label htmlFor="login_password_unique" className={authLabel}>Senha</label>
            <a href="/esqueci-senha" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors">Esqueci minha senha</a>
          </div>
          <input 
            required 
            id="login_password_unique"
            type="password" 
            name="login_password_unique" 
            autoComplete="new-password"
            className={authInput}
            placeholder="••••••••" 
          />
        </div>

        <button type="submit" className={`${authButton} mt-2`}>
          Entrar
        </button>
      </form>
    </AuthShell>
  );
}
