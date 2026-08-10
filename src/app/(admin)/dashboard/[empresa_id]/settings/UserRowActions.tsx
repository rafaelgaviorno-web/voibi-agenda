'use client';

import { useState } from 'react';
import { Trash2, Edit2, X } from 'lucide-react';

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

export default function UserRowActions({ 
  usuario, 
  agendas, 
  updateUsuario, 
  deleteUsuario 
}: { 
  usuario: any, 
  agendas: any[], 
  updateUsuario: (data: FormData) => Promise<{ error?: string | null } | undefined>,
  deleteUsuario: (data: FormData) => void
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  
  const [nome, setNome] = useState(usuario.nome || '');
  const [whatsapp, setWhatsapp] = useState(usuario.whatsapp || '');
  const [role, setRole] = useState(usuario.role || 'profissional');
  const [selectedAbas, setSelectedAbas] = useState<string[]>(usuario.abas_acesso || []);
  const [selectedAgendas, setSelectedAgendas] = useState<string[]>(usuario.agendas || []);

  const isAdmin = role === 'admin';

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    
    const fd = new FormData();
    fd.append('id', usuario.id);
    fd.append('nome', nome);
    fd.append('whatsapp', whatsapp);
    fd.append('role', role);
    fd.append('abas_acesso', JSON.stringify(selectedAbas));
    fd.append('agendas', JSON.stringify(selectedAgendas));
    
    const res = await updateUsuario(fd);
    if (res?.error) {
      alert('Erro ao atualizar: ' + res.error);
    } else {
      setIsEditing(false);
    }
    setIsPending(false);
  };

  return (
    <>
      <div className="flex justify-end gap-2">
        <button 
          onClick={() => setIsEditing(true)} 
          className="text-zinc-400 hover:text-blue-500 p-1.5 rounded-md hover:bg-blue-50 transition-colors" 
          title="Editar"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <form action={deleteUsuario}>
          <input type="hidden" name="id" value={usuario.id} />
          <button type="submit" className="text-zinc-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Excluir" onClick={(e) => {
            if(!confirm('Tem certeza que deseja excluir?')) e.preventDefault();
          }}>
            <Trash2 className="w-4 h-4" />
          </button>
        </form>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 text-left">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Editar Usuário</h2>
              <button onClick={() => setIsEditing(false)} className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 p-1 rounded-full hover:bg-zinc-100 dark:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome</label>
                  <input 
                    type="text" 
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    required 
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-2 text-zinc-900 dark:text-white focus:ring-1 focus:ring-blue-500" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">WhatsApp</label>
                  <input 
                    type="text" 
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-2 text-zinc-900 dark:text-white focus:ring-1 focus:ring-blue-500" 
                  />
                </div>
              </div>

              <div className="space-y-1.5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tipo de Acesso</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="role_edit" 
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
                      name="role_edit" 
                      value="admin" 
                      checked={isAdmin}
                      onChange={() => setRole('admin')}
                      className="text-blue-600 focus:ring-blue-500" 
                    />
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Administrador</span>
                  </label>
                </div>
              </div>

              {!isAdmin && (
                <>
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Telas Liberadas</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TABS.map(tab => (
                        <label key={tab.id} className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            checked={selectedAbas.includes(tab.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedAbas([...selectedAbas, tab.id]);
                              else setSelectedAbas(selectedAbas.filter(a => a !== tab.id));
                            }}
                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{tab.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Acesso às Agendas (Profissionais)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                      {agendas.map(ag => (
                        <label key={ag.id} className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            checked={selectedAgendas.includes(ag.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedAgendas([...selectedAgendas, ag.id]);
                              else setSelectedAgendas(selectedAgendas.filter(id => id !== ag.id));
                            }}
                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ag.cor }}></span>
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{ag.nome}</span>
                          </div>
                        </label>
                      ))}
                      {agendas.length === 0 && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 col-span-2">Nenhuma agenda cadastrada.</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
