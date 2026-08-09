'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

const TABS = [
  { id: 'calendar', label: 'Calendário' },
  { id: 'agendas', label: 'Gerenciar Agendas (Config)' },
  { id: 'automations', label: 'Automações' },
  { id: 'settings', label: 'Painel de Configurações' },
  { id: 'procedimentos', label: 'Procedimentos' },
  { id: 'unidades', label: 'Unidades (Filiais)' },
  { id: 'usuarios', label: 'Equipe e Acessos' },
  { id: 'bloqueios', label: 'Bloqueios e Exceções' }
];

export default function UserForm({ agendas, unidades, createUsuario }: { agendas: any[], unidades: any[], createUsuario: (data: FormData) => Promise<{ error?: string | null, warning?: string | null } | undefined> }) {
  const [role, setRole] = useState('profissional');
  const [isPending, setIsPending] = useState(false);
  const [selectedAbas, setSelectedAbas] = useState<string[]>([]);
  const [selectedAgendas, setSelectedAgendas] = useState<string[]>([]);
  const [unidadeId, setUnidadeId] = useState('');

  const isAdmin = role === 'admin';
  
  const agendasFiltradas = unidadeId ? agendas.filter(a => a.unidade_id === unidadeId) : agendas;

  return (
      <form action={async (formData) => {
        setIsPending(true);
        const res = await createUsuario(formData);
        if (res?.error) {
          alert('Erro ao criar usuário: ' + res.error);
        } else if (res?.warning) {
          alert('Sucesso com aviso: ' + res.warning);
        }
        setIsPending(false);
      }} className="space-y-6 mb-8">
      
      <div className="space-y-1.5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tipo de Acesso (Papel)</label>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="role" 
              value="profissional" 
              checked={!isAdmin}
              onChange={() => setRole('profissional')}
              className="text-blue-600 focus:ring-blue-500" 
            />
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Usuário Padrão</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="role" 
              value="admin" 
              checked={isAdmin}
              onChange={() => setRole('admin')}
              className="text-blue-600 focus:ring-blue-500" 
            />
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Administrador (Acesso Total)</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
           <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome Completo</label>
           <input required name="nome" className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" placeholder="Ex: Ana Souza" />
        </div>
        <div className="space-y-1.5">
           <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">WhatsApp</label>
           <input name="whatsapp" className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" placeholder="(00) 00000-0000" />
        </div>
        <div className="space-y-1.5">
           <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">E-mail (Login)</label>
           <input required type="email" name="email" className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" placeholder="ana@clinica.com" />
        </div>
        <div className="space-y-1.5">
           <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Senha Provisória</label>
           <input required type="text" name="senha" className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" placeholder="••••••••" />
        </div>
        {unidades && unidades.length > 0 && (
          <div className="space-y-1.5">
             <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Unidade (Opcional)</label>
             <select 
               name="unidade_id" 
               value={unidadeId}
               onChange={(e) => setUnidadeId(e.target.value)}
               className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
             >
               <option value="">Acesso Geral (Sem restrição)</option>
               {unidades.map(u => (
                 <option key={u.id} value={u.id}>{u.nome}</option>
               ))}
             </select>
          </div>
        )}
      </div>

      <div className={`space-y-5 transition-opacity ${isAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
        
        {/* Acesso às Abas */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block border-b border-zinc-100 dark:border-zinc-800 pb-2">
            Permissões de Telas (Abas)
            {isAdmin && <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Liberado p/ Admin</span>}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TABS.map(tab => (
              <label key={tab.id} className="flex items-center gap-2 cursor-pointer p-2 bg-zinc-50 dark:bg-zinc-950 rounded-md border border-zinc-200 dark:border-zinc-700 hover:border-blue-300">
                <input 
                  type="checkbox" 
                  name="abas" 
                  value={tab.id} 
                  checked={isAdmin || selectedAbas.includes(tab.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedAbas([...selectedAbas, tab.id]);
                    else setSelectedAbas(selectedAbas.filter(id => id !== tab.id));
                  }}
                  className="rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500" 
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">{tab.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Acesso às Agendas */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block border-b border-zinc-100 dark:border-zinc-800 pb-2">
            Permissões de Agendas (Profissionais)
            {isAdmin && <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Acesso Total</span>}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 rounded-lg border border-zinc-100 dark:border-zinc-800">
            {agendasFiltradas.length === 0 && (
               <div className="col-span-full text-sm text-zinc-500 dark:text-zinc-400 italic py-2">
                 Nenhuma agenda encontrada para esta unidade.
               </div>
            )}
            {agendasFiltradas.map(agenda => (
              <label key={agenda.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white dark:bg-zinc-900 rounded-md transition-colors border border-transparent hover:border-zinc-200 dark:border-zinc-700">
                <input 
                  type="checkbox" 
                  name="agendas" 
                  value={agenda.id} 
                  checked={isAdmin || selectedAgendas.includes(agenda.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedAgendas([...selectedAgendas, agenda.id]);
                    else setSelectedAgendas(selectedAgendas.filter(id => id !== agenda.id));
                  }}
                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500" 
                />
                <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: agenda.cor }}></div>
                  {agenda.nome}
                </div>
              </label>
            ))}
            {agendas.length === 0 && <div className="text-sm text-zinc-500 dark:text-zinc-400 col-span-2">Nenhuma agenda cadastrada na clínica.</div>}
          </div>
        </div>

      </div>

      <div className="flex justify-end pt-2">
        <button disabled={isPending} type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          <Plus className="w-4 h-4" />
          {isPending ? 'Criando...' : 'Criar Usuário'}
        </button>
      </div>
    </form>
  );
}
