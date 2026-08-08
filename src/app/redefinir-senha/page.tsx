'use client';

import { supabase } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        <div className="flex justify-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight"><span className="text-blue-600">Voibi</span> <span className="text-white">Agenda</span></h1>
        </div>
        
        <h2 className="text-xl font-bold text-center text-white mb-2">Definir Nova Senha</h2>
        <p className="text-zinc-400 text-center mb-8 text-sm">Digite a sua nova senha de acesso</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-3 rounded-lg text-sm mb-6 text-center">
            {message}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300 ml-1">Nova Senha</label>
            <input 
              required 
              type="password" 
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-zinc-600" 
              placeholder="••••••••" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/20 mt-4 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
