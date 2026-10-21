import { getServiceSupabase } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';
import AuthShell, { AuthAlert, authButton, authInput, authLabel } from '@/components/AuthShell';

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const { message, error: errorMessage } = await searchParams;

  async function handleReset(formData: FormData) {
    'use server';
    const email = formData.get('email')?.toString() || '';
    const supabase = getServiceSupabase();

    // Em produção real, o baseUrl viria das variáveis de ambiente.
    // NEXT_PUBLIC_SITE_URL = https://agenda.voibi.com.br
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/redefinir-senha`,
    });

    if (error) {
      redirect('/esqueci-senha?error=Não+foi+possível+enviar+o+e-mail');
    }

    redirect('/esqueci-senha?message=Um+link+seguro+foi+enviado+para+o+seu+e-mail');
  }

  return (
    <AuthShell title="Recuperar senha" description="Digite o e-mail cadastrado para receber o link de recuperação.">
      {errorMessage && <AuthAlert type="error">{errorMessage}</AuthAlert>}
      {message && <AuthAlert type="success">{message}</AuthAlert>}

      <form action={handleReset} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className={authLabel}>E-mail</label>
          <input 
            required 
            id="email"
            type="email" 
            name="email" 
            className={authInput}
            placeholder="seu@email.com" 
          />
        </div>

        <button type="submit" className={`${authButton} mt-2`}>
          Enviar link de recuperação
        </button>
      </form>

      <a href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
        ← Voltar para o login
      </a>
    </AuthShell>
  );
}
