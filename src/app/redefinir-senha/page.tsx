'use client';

import { supabase } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell, { AuthAlert, authButton, authInput, authLabel } from '@/components/AuthShell';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase redirects to /redefinir-senha#access_token=...&type=recovery
    // supabase-js automatically picks up this hash and establishes a session.
    // If there is no hash or session, we probably shouldn't be here.
    const checkSession = async () => {
       const { data } = await supabase.auth.getSession();
       if (!data.session && !window.location.hash) {
          setError('Link inválido ou expirado.');
       }
    };
    checkSession();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError('Erro ao atualizar a senha: ' + error.message);
      setLoading(false);
    } else {
      setMessage('Senha atualizada com sucesso! Redirecionando...');
      // A senha foi atualizada, fazemos logout e mandamos pro login pra gerar os cookies novos
      await supabase.auth.signOut();
      setTimeout(() => {
         router.push('/login');
      }, 2000);
    }
  };

  return (
    <AuthShell title="Definir nova senha" description="Digite a sua nova senha de acesso.">
      {error && <AuthAlert type="error">{error}</AuthAlert>}
      {message && <AuthAlert type="success">{message}</AuthAlert>}

      <form onSubmit={handleUpdate} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="password" className={authLabel}>Nova senha</label>
          <input 
            required 
            id="password"
            type="password" 
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInput}
            placeholder="Mínimo de 6 caracteres" 
          />
        </div>

        <button type="submit" disabled={loading} className={`${authButton} mt-2`}>
          {loading ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </form>
    </AuthShell>
  );
}
