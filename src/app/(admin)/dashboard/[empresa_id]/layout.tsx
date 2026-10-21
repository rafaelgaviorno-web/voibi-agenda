import Link from 'next/link';
import { LayoutDashboard, Blocks, BarChart2 } from 'lucide-react';
import VoibiLogo from '@/components/VoibiLogo';
import NavLink from './NavLink';
import { navIcon } from './navStyles';
import { getServiceSupabase } from '@/lib/supabase/client';
import { notFound } from 'next/navigation';
import AutomationsDropdown from './AutomationsDropdown';
import SidebarAgendas from './SidebarAgendas';
import SettingsDropdown from './SettingsDropdown';
import ProfileDropdown from './ProfileDropdown';
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
      <aside className="w-64 shrink-0 bg-white dark:bg-zinc-900/60 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div className="h-16 px-5 flex items-center border-b border-zinc-200/70 dark:border-zinc-800">
          <VoibiLogo subtitle={empresa.nome} />
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Menu</p>

          {hasCalendarAccess && (
            <NavLink href={`${baseUrl}/calendar`}>
              <LayoutDashboard className={navIcon} />
              Calendário
            </NavLink>
          )}

          {hasCalendarAccess && (
            <NavLink href={`${baseUrl}/reports`}>
              <BarChart2 className={navIcon} />
              Relatórios
            </NavLink>
          )}
          
          <SidebarAgendas agendas={agendasFiltradas} baseUrl={baseUrl} empresaId={empresa_id} />

          {(hasAutomationsAccess || hasSettingsAccess) && (
            <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Administração</p>
          )}

          {hasAutomationsAccess && <AutomationsDropdown baseUrl={baseUrl} />}

          {hasSettingsAccess && <SettingsDropdown baseUrl={baseUrl} />}
        </nav>
        
        {isSuperAdmin && (
          <div className="px-3 pb-3">
            <Link 
              href="/superadmin" 
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-500/20 text-sm font-medium transition-colors"
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
