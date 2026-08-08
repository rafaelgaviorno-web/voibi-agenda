import { getServiceSupabase } from '@/lib/supabase/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { ShieldCheck, User as UserIcon, CalendarDays, Clock, ArrowRight, Plus, Link as LinkIcon, Copy, CalendarX, Trash2 } from 'lucide-react';
import UserForm from './UserForm';
import ProcedimentosManager from './ProcedimentosManager';
import BloqueiosManager from './BloqueiosManager';
import UnidadesManager from './UnidadesManager';
import CopyLinkButton from './CopyLinkButton';

export const dynamic = 'force-dynamic';

export default async function SettingsPage(props: { 
  params: Promise<{ empresa_id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { empresa_id } = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : {};
  const activeTab = searchParams.tab || 'procedimentos';
  
  let procedimentos: any[] = [];
  let agendas: any[] = [];
  let usuarios: any[] = [];
  let bloqueios: any[] = [];
  let unidades: any[] = [];
  
  if (empresa_id === 'mock-clinic') {
    unidades = [
      { id: 'un-1', nome: 'Matriz (Centro)', empresa_id: 'mock-clinic' },
      { id: 'un-2', nome: 'Filial Zona Sul', empresa_id: 'mock-clinic' }
    ];
    procedimentos = [
      { id: 'proc-1', nome: 'Consulta de Rotina', duracao_minutos: 30 },
      { id: 'proc-2', nome: 'Limpeza', duracao_minutos: 60 },
      { id: 'proc-3', nome: 'Avaliação', duracao_minutos: 45 }
    ];
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const customAgendasStr = cookieStore.get('voibi_mock_agendas')?.value;
    const customAgendas = customAgendasStr ? JSON.parse(customAgendasStr) : [];

    agendas = [
      { id: 'prof-1', nome: 'Dr. João Silva', cor: '#4285f4', unidade_id: 'un-1' },
      { id: 'prof-2', nome: 'Dra. Maria Souza', cor: '#0f9d58', unidade_id: 'un-1' },
      { id: 'prof-3', nome: 'Dr. Pedro (Zona Sul)', cor: '#eab308', unidade_id: 'un-2' },
      ...customAgendas
    ];
    usuarios = [
      { id: 'usr-1', nome: 'Recepção (Mock)', email: 'recepcao@voibi.com', whatsapp: '11999999999', agendas: ['prof-1', 'prof-2'], papel: 'profissional', abas_acesso: ['calendar', 'agendas'] }
    ];
    bloqueios = [
      { id: 'bq-1', inicio: new Date().toISOString(), fim: new Date(Date.now() + 86400000).toISOString(), motivo: 'Feriado', profissional_id: null }
    ];
  } else {
    const supabase = getServiceSupabase();
    
    const [pDataRes, unsRes, agDataRes, usDataRes, bDataRes] = await Promise.all([
      supabase.from('agend_tipos_evento').select('*').eq('empresa_id', empresa_id),
      supabase.from('agend_unidades').select('*').eq('empresa_id', empresa_id),
      supabase.from('agend_profissionais').select('id, nome, cor, unidade_id').eq('empresa_id', empresa_id),
      supabase.from('agend_usuarios').select('*, agend_usuario_agendas(agenda_id)').eq('empresa_id', empresa_id),
      supabase.from('agend_bloqueios').select('*')
    ]);

    procedimentos = pDataRes.data || [];
    unidades = unsRes.data || [];
    agendas = agDataRes.data || [];
    
    usuarios = (usDataRes.data || []).map(u => ({
       ...u,
       agendas: u.agend_usuario_agendas?.map((a: any) => a.agenda_id) || []
    }));

    bloqueios = (bDataRes.data || []).filter(b => b.profissional_id === null || agendas.some(a => a.id === b.profissional_id));
  }

  async function createUsuario(formData: FormData) {
    'use server'
    if (empresa_id === 'mock-clinic') return;
    
    const supabase = getServiceSupabase();
    
    const nome = formData.get('nome') as string;
    const email = formData.get('email') as string;
    const whatsapp = formData.get('whatsapp') as string;
    const senha = formData.get('senha') as string;
    const papel = (formData.get('papel') as string) || 'profissional';
    const unidade_id = formData.get('unidade_id') as string;
    
    let abasPermitidas = formData.getAll('abas') as string[];
    let agendasSalvar = formData.getAll('agendas') as string[];

    // Se for admin, forçamos o acesso total a tudo
    if (papel === 'admin') {
       abasPermitidas = ['calendar', 'agendas', 'automations', 'settings'];
       agendasSalvar = agendas.map(a => a.id); // Todas as agendas
    }

    try {
      // 1. Criar o usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: senha,
        email_confirm: true,
        user_metadata: {
          nome: nome
        }
      });

      if (authError || !authData.user) {
         console.error("Erro ao criar usuário auth:", authError);
         return { error: authError?.message || 'Erro ao criar conta no sistema.' };
      }

      // 2. Vincular o usuário recém-criado na tabela agend_usuarios
      const { data: newUser, error } = await supabase.from('agend_usuarios').insert({
         id: authData.user.id,
         empresa_id: empresa_id,
         nome: nome,
         email: email,
         whatsapp: whatsapp,
         papel: papel,
         abas_acesso: abasPermitidas
      }).select().single();

      if (error) {
         console.error("Erro ao inserir em agend_usuarios:", error);
         // Rollback do usuário no auth
         await supabase.auth.admin.deleteUser(authData.user.id);
         return { error: error.message };
      }
      
      if (newUser && agendasSalvar.length > 0) {
         const agns = agendasSalvar.map(agenda_id => ({
            usuario_id: newUser.id,
            agenda_id: agenda_id
         }));
         await supabase.from('agend_usuario_agendas').insert(agns);
      }
    } catch (e: any) {
      console.error(e);
      return { error: e.message };
    }
    
    revalidatePath(`/dashboard/${empresa_id}/settings`);
    return { error: null };
  }

  async function deleteUsuario(formData: FormData) {
    'use server'
    if (empresa_id === 'mock-clinic') return;
    const id = formData.get('id') as string;
    const supabase = getServiceSupabase();
    // Apaga do Supabase Auth (isso vai disparar cascade para agend_usuarios se houver FK, mas garantimos apagando)
    await supabase.auth.admin.deleteUser(id);
    await supabase.from('agend_usuarios').delete().eq('id', id);
    revalidatePath(`/dashboard/${empresa_id}/settings`);
  }

  async function saveBloqueio(data: any, action: 'add' | 'remove') {
    'use server'
    if (empresa_id === 'mock-clinic') {
      if (action === 'add') {
        return { id: 'mock-' + Date.now(), inicio: data.inicio, fim: data.fim, motivo: data.motivo, profissional_id: data.profissional_id };
      }
      return null;
    }

    const supabase = getServiceSupabase();
    
    if (action === 'remove') {
      await supabase.from('agend_bloqueios').delete().eq('id', data.id);
      revalidatePath(`/dashboard/${empresa_id}/settings`);
      revalidatePath(`/dashboard/${empresa_id}/calendar`);
      return null;
    }
    if (action === 'add') {
      const { data: newBlock } = await supabase.from('agend_bloqueios').insert({
        inicio: data.inicio,
        fim: data.fim,
        motivo: data.motivo,
        profissional_id: data.profissional_id,
        unidade_id: data.unidade_id || null
      }).select().single();
      
      revalidatePath(`/dashboard/${empresa_id}/settings`);
      revalidatePath(`/dashboard/${empresa_id}/calendar`);
      return newBlock;
    }
  }

  async function createProcedimento(formData: FormData) {
    'use server'
    if (empresa_id === 'mock-clinic') return;
    
    const supabase = getServiceSupabase();
    
    const nome = formData.get('nome') as string;
    const duracao = parseInt(formData.get('duracao') as string) || 30;
    const unidade_id = formData.get('unidade_id') as string;
    const isRecorrente = formData.get('is_recorrente') === 'true';

    await supabase.from('agend_tipos_evento').insert({ 
      empresa_id: empresa_id,
      nome: nome,
      slug: nome.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      duracao_minutos: duracao,
      is_recorrente: isRecorrente,
      unidade_id: unidade_id || null
    });
    
    revalidatePath(`/dashboard/${empresa_id}/settings`);
  }

  async function updateProcedimento(formData: FormData) {
    'use server'
    if (empresa_id === 'mock-clinic') return;
    
    const id = formData.get('id') as string;
    const nome = formData.get('nome') as string;
    const duracao = parseInt(formData.get('duracao') as string) || 30;
    const unidade_id = formData.get('unidade_id') as string;
    const isRecorrente = formData.get('is_recorrente') === 'true';
    
    const supabase = getServiceSupabase();
    await supabase.from('agend_tipos_evento').update({ 
      nome: nome,
      slug: nome.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      duracao_minutos: duracao,
      unidade_id: unidade_id || null,
      is_recorrente: isRecorrente
    }).eq('id', id);
    
    revalidatePath(`/dashboard/${empresa_id}/settings`);
  }

  async function deleteProcedimento(formData: FormData) {
    'use server'
    if (empresa_id === 'mock-clinic') return;
    
    const id = formData.get('id') as string;
    const supabase = getServiceSupabase();
    await supabase.from('agend_tipos_evento').delete().eq('id', id);
    
    revalidatePath(`/dashboard/${empresa_id}/settings`);
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-8 lg:p-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Configurações</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Gerencie os procedimentos e serviços oferecidos pela sua clínica.</p>
      </div>

      {activeTab === 'procedimentos' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Procedimentos (Serviços)</h3>
        </div>
        
        <ProcedimentosManager 
          initialProcedimentos={procedimentos} 
          empresa_id={empresa_id} 
          unidades={unidades}
          createProcedimento={createProcedimento}
          updateProcedimento={updateProcedimento}
          deleteProcedimento={deleteProcedimento}
        />
      </div>
      )}

      {activeTab === 'unidades' && (
        <UnidadesManager unidades={unidades} empresa_id={empresa_id} />
      )}

      {activeTab === 'agendas' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            Agendas (Profissionais)
          </h3>
          <Link href={`/dashboard/${empresa_id}/agendas`} className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova Agenda
          </Link>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agendas.map(agenda => (
              <div key={agenda.id} className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 flex flex-col justify-between hover:border-blue-200 transition-colors group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex-shrink-0 shadow-sm border border-zinc-100 dark:border-zinc-800" style={{ backgroundColor: agenda.cor }}></div>
                    <div>
                      <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">{agenda.nome}</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3.5 h-3.5" /> Horários configurados
                      </p>
                    </div>
                  </div>
                  {empresa_id && (
                    <CopyLinkButton link={`http://localhost:3000/agendar/${empresa_id}/${agenda.id}`} />
                  )}
                </div>
                <Link 
                  href={`/dashboard/${empresa_id}/agendas/${agenda.id}`}
                  className="w-full py-2 bg-zinc-50 dark:bg-zinc-950 group-hover:bg-blue-50 text-zinc-600 dark:text-zinc-400 group-hover:text-blue-600 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Gerenciar Horários
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -ml-2 group-hover:ml-0" />
                </Link>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Equipe e Acessos (Usuários)</h3>
        </div>
        
        <div className="p-5">
          <UserForm agendas={agendas} unidades={unidades} createUsuario={createUsuario} />

          <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-700 text-xs uppercase text-zinc-500 dark:text-zinc-400 font-semibold">
                <tr>
                  <th className="px-4 py-3">Nome / E-mail</th>
                  <th className="px-4 py-3">Acesso às Agendas</th>
                  <th className="px-4 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-50/50 dark:bg-zinc-900/50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{u.nome}</div>
                        {u.papel === 'admin' ? (
                           <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                             <ShieldCheck className="w-3 h-3" /> Admin
                           </span>
                        ) : (
                           <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                             <UserIcon className="w-3 h-3" /> Usuário
                           </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-3">
                        <span>{u.email}</span>
                        {u.whatsapp && <span>• {u.whatsapp}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 space-y-2">
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-zinc-400 mb-1 tracking-wider">Agendas</div>
                        <div className="flex flex-wrap gap-1">
                          {u.papel === 'admin' ? (
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">Acesso Total (Todas as agendas)</span>
                          ) : (
                            u.agendas && u.agendas.length > 0 ? (
                              u.agendas.map((agId: string) => {
                                const ag = agendas.find(a => a.id === agId);
                                return ag ? (
                                  <span key={agId} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                    <span className="w-2 h-2 rounded-full" style={{backgroundColor: ag.cor}}></span>
                                    {ag.nome}
                                  </span>
                                ) : null;
                              })
                            ) : (
                              <span className="text-xs text-zinc-400 italic">Nenhuma agenda</span>
                            )
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-zinc-400 mb-1 tracking-wider">Telas Liberadas</div>
                        <div className="flex flex-wrap gap-1">
                          {u.papel === 'admin' ? (
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">Todas as telas</span>
                          ) : (
                            u.abas_acesso && u.abas_acesso.length > 0 ? (
                              u.abas_acesso.map((aba: string) => (
                                <span key={aba} className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium border border-blue-100">
                                  {aba}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-zinc-400 italic">Nenhuma</span>
                            )
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {empresa_id !== 'mock-clinic' && (
                        <form action={deleteUsuario}>
                          <input type="hidden" name="id" value={u.id} />
                          <button type="submit" className="text-zinc-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                      Nenhum usuário cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'bloqueios' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <CalendarX className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              Bloqueios e Exceções
            </h3>
          </div>
          <BloqueiosManager initialBloqueios={bloqueios} agendas={agendas} unidades={unidades} saveBloqueio={saveBloqueio} />
        </div>
      )}
    </div>
  );
}
