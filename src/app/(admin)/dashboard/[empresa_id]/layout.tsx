import Link from 'next/link';
import { Calendar, Clock, Settings, LayoutDashboard, Blocks, FileText, BarChart2 } from 'lucide-react';
import { getServiceSupabase } from '@/lib/supabase/client';
import { notFound } from 'next/navigation';
import AutomationsDropdown from './AutomationsDropdown';
import SidebarAgendas from './SidebarAgendas';
import SettingsDropdown from './SettingsDropdown';
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

  const cookieStore = await cookies();
  const savedUnidadeId = cookieStore.get('voibi_unidade_id')?.value;

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
    const { data } = await supabase
      .from('agend_empresas')
      .select('*')
      .eq('id', empresa_id)
      .single();
    empresa = data;
    
    const { data: uns } = await supabase.from('agend_unidades').select('*').eq('empresa_id', empresa_id);
    unidades = uns || [];
    
    currentUnidadeId = savedUnidadeId && unidades.find(u => u.id === savedUnidadeId) ? savedUnidadeId : (unidades[0]?.id || '');

    if (empresa) {
      const { data: profs } = await supabase.from('agend_profissionais').select('id, nome, cor, unidade_id').eq('empresa_id', empresa_id);
      agendas = profs || [];
    }
  }

  // Filtrar agendas pela unidade selecionada
  const agendasFiltradas = agendas.filter(a => a.unidade_id === currentUnidadeId);

  if (!empresa) {
    notFound();
  }

  const baseUrl = `/dashboard/${empresa_id}`;

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-6 border-b border-zinc-100">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-blue-600">Voibi</span> <span className="text-zinc-900">Agenda</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1 truncate">{empresa.nome}</p>
        </div>
        
        <nav className="flex-1 p-4 pt-0 space-y-1 overflow-y-auto mt-4">
          <Link href={`${baseUrl}/calendar`} className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-zinc-100 text-sm font-medium transition-colors">
            <LayoutDashboard className="w-4 h-4 text-zinc-500" />
            Calendário
          </Link>

          <Link href={`${baseUrl}/reports`} className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-zinc-100 text-sm font-medium transition-colors">
            <FileText className="w-4 h-4 text-zinc-500" />
            Relatórios
          </Link>
          
          <SidebarAgendas agendas={agendasFiltradas} baseUrl={baseUrl} empresaId={empresa_id} />

          <AutomationsDropdown baseUrl={baseUrl} />

          <SettingsDropdown baseUrl={baseUrl} />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative z-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
