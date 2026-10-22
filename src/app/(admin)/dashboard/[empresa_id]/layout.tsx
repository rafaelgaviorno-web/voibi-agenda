import Link from 'next/link';
import { LayoutDashboard, Blocks, BarChart2 } from 'lucide-react';
import VoibiLogo from '@/components/VoibiLogo';
import NavLink from './NavLink';
import { navIcon, sectionLabel } from './navStyles';
import { getServiceSupabase } from '@/lib/supabase/client';
import { notFound, redirect } from 'next/navigation';
import { SESSION_COOKIE, decodeSession } from '@/lib/session';
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
  
  const session = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) redirect('/login');
  isSuperAdmin = session.isSuperadmin;
  const loggedInUserId = session.id;

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
    <div className="flex h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Menu lateral em "tinta" nos dois temas: a classe dark faz os componentes internos usarem o visual escuro */}
      <aside className="dark w-[264px] shrink-0 bg-ink [html.dark_&]:bg-ink-deep text-zinc-300 border-r border-white/5 flex flex-col">
        <div className="h-[76px] px-5 flex items-center shrink-0">
          <VoibiLogo />
        </div>

        <div className="px-3.5 pb-3 shrink-0">
          <UnidadeSwitcher variant="sidebar" empresaNome={empresa.nome} unidades={unidades} currentUnidadeId={currentUnidadeId} baseUrl={baseUrl} />
        </div>
        
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <p className={sectionLabel}>Menu</p>

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
            <p className={`${sectionLabel} pt-5`}>Administração</p>
          )}

          {hasAutomationsAccess && <AutomationsDropdown baseUrl={baseUrl} />}

          {hasSettingsAccess && <SettingsDropdown baseUrl={baseUrl} />}
        </nav>
        
        {isSuperAdmin && (
          <div className="px-3 pb-3">
            <Link 
              href="/superadmin" 
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-brand-200 hover:bg-white/[0.08] text-sm font-semibold transition-colors"
            >
              <Blocks className="w-4 h-4" />
              Painel SuperAdmin
            </Link>
          </div>
        )}
        
        <ProfileDropdown />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-100 dark:bg-zinc-950 relative z-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
