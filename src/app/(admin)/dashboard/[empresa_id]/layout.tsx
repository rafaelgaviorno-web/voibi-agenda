import Link from 'next/link';
import { Calendar, Clock, Settings, LayoutDashboard, Blocks, FileText, BarChart2 } from 'lucide-react';
import { getServiceSupabase } from '@/lib/supabase/client';
import { notFound } from 'next/navigation';
import AutomationsDropdown from './AutomationsDropdown';
import SidebarAgendas from './SidebarAgendas';
import SettingsDropdown from './SettingsDropdown';
import ProfileDropdown from './ProfileDropdown';
import UnidadeSwitcher from './UnidadeSwitcher';
import { cookies } from 'next/headers';

export default async function DashboardLayout({ 
  children, 
  params 
}: { 
  children: React.ReactNode;
  params: Promise<{ empresa_id: string }>;
}) {
  const { empresa_id } = await params;
  
  let empresa = null;
  let unidades: any[] = [];
  let currentUnidadeId = '';
  let agendas: any[] = [];
  let isSuperAdmin = false;
  let hasCalendarAccess = true;
  let hasAutomationsAccess = true;
  let hasSettingsAccess = true;

  const cookieStore = await cookies();
  const savedUnidadeId = cookieStore.get('voibi_unidade_id')?.value;
  
  const authCookie = cookieStore.get('voibi-auth')?.value;
  let loggedInUserId = null;
  if (authCookie) {
    try {
      const parsedAuth = JSON.parse(authCookie);
      if (parsedAuth.isSuperadmin || parsedAuth.is_superadmin) {
        isSuperAdmin = true;
      }
      loggedInUserId = parsedAuth.user?.id;
    } catch (e) {
      // Ignora erro de parse
    }
  }

  if (empresa_id === 'mock-clinic') {
    empresa = { id: 'mock-clinic', nome: 'Clínica de Teste Voibi' };
    unidades = [
      { id: 'un-1', nome: 'Matriz (Centro)', empresa_id: 'mock-clinic' },
      { id: 'un-2', nome: 'Filial Zona Sul', empresa_id: 'mock-clinic' }
    ];
    
    currentUnidadeId = savedUnidadeId && unidades.find(u => u.id === savedUnidadeId) ? savedUnidadeId : unidades[0].id;

    agendas = [
      { id: 'prof-1', nome: 'Dr. João Silva', cor: '#4285f4', unidade_id: 'un-1' },
      { id: 'prof-2', nome: 'Dra. Maria Souza', cor: '#0f9d58', unidade_id: 'un-1' },
      { id: 'prof-3', nome: 'Dr. Pedro (Zona Sul)', cor: '#eab308', unidade_id: 'un-2' }
    ];
  } else {
    const supabase = getServiceSupabase();
    
    // Executa as queries em paralelo para carregar mais rápido
    const [empresaRes, unidadesRes, profissionaisRes, currentUserRes] = await Promise.all([
      supabase.from('agend_empresas').select('*').eq('id', empresa_id).single(),
      supabase.from('agend_unidades').select('*').eq('empresa_id', empresa_id),
      supabase.from('agend_profissionais').select('id, nome, cor, unidade_id').eq('empresa_id', empresa_id),
      loggedInUserId ? supabase.from('agend_usuarios').select('*, agend_usuario_agendas(agenda_id)').eq('id', loggedInUserId).eq('empresa_id', empresa_id).single() : Promise.resolve({ data: null })
    ]);

    empresa = empresaRes.data;
    unidades = unidadesRes.data || [];
    agendas = profissionaisRes.data || [];
    
    currentUnidadeId = savedUnidadeId && unidades.find(u => u.id === savedUnidadeId) ? savedUnidadeId : (unidades[0]?.id || '');
    
    // Filtro de permissões de usuário
    if (currentUserRes.data && currentUserRes.data.role !== 'admin' && !isSuperAdmin) {
       const abas = currentUserRes.data.abas_acesso || [];
       hasCalendarAccess = abas.includes('calendar');
       hasAutomationsAccess = abas.includes('automations');
       hasSettingsAccess = abas.includes('settings');
       
       const userAgendas = (currentUserRes.data.agend_usuario_agendas || []).map((a: any) => a.agenda_id);
       agendas = agendas.filter(a => userAgendas.includes(a.id));
    }
  }

  // Filtrar agendas pela unidade selecionada
  const agendasFiltradas = agendas.filter(a => a.unidade_id === currentUnidadeId);

  if (!empresa) {
    notFound();
  }

  const baseUrl = `/dashboard/${empresa_id}`;

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-blue-600 dark:text-blue-500">Voibi</span> <span className="text-zinc-900 dark:text-white">Agenda</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">{empresa.nome}</p>
        </div>
        
        <nav className="flex-1 p-4 pt-0 space-y-1 overflow-y-auto mt-4">
          {hasCalendarAccess && (
            <Link href={`${baseUrl}/calendar`} className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium transition-colors">
              <LayoutDashboard className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              Calendário
            </Link>
          )}

          {hasCalendarAccess && (
            <Link href={`${baseUrl}/reports`} className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium transition-colors">
              <FileText className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              Relatórios
            </Link>
          )}
          
          <SidebarAgendas agendas={agendasFiltradas} baseUrl={baseUrl} empresaId={empresa_id} />

          {hasAutomationsAccess && <AutomationsDropdown baseUrl={baseUrl} />}

          {hasSettingsAccess && <SettingsDropdown baseUrl={baseUrl} />}
        </nav>
        
        {isSuperAdmin && (
          <div className="px-4 mb-2">
            <Link 
              href="/superadmin" 
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm"
            >
              <Blocks className="w-4 h-4" />
              Painel SuperAdmin
            </Link>
          </div>
        )}
        
        <ProfileDropdown />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 relative z-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
