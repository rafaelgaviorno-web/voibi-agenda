import { getServiceSupabase } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';

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
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        <div className="flex justify-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight"><span className="text-blue-600">Voibi</span> <span className="text-white">Agenda</span></h1>
        </div>
        
        <h2 className="text-xl font-bold text-center text-white mb-2">Recuperar Senha</h2>
        <p className="text-zinc-400 text-center mb-8 text-sm">Digite o e-mail cadastrado para receber o link de recuperação</p>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6 text-center">
            {errorMessage}
          </div>
        )}

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded-lg text-sm mb-6 text-center">
            {message}
          </div>
        )}

        <form action={handleReset} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 ml-1">E-mail</label>
            <input 
              required 
              type="email" 
              name="email" 
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-600" 
              placeholder="seu@email.com" 
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/20 mt-4"
          >
            Enviar link de recuperação
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Voltar para o Login</a>
        </div>
      </div>
    </div>
  );
}
