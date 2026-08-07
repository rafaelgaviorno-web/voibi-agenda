import { getServiceSupabase } from '@/lib/supabase/client';
import ReportsClient from './ReportsClient';

export const dynamic = 'force-dynamic';

export default async function ReportsPage({ params }: { params: Promise<{ empresa_id: string }> }) {
  const { empresa_id } = await params;
  
  let agendamentos: any[] = [];
  let profissionais: any[] = [];
  let procedimentos: any[] = [];
  let unidades: any[] = [];

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  if (empresa_id === 'mock-clinic') {
    const customAgendasStr = cookieStore.get('voibi_mock_agendas')?.value;
    const customAgendas = customAgendasStr ? JSON.parse(customAgendasStr) : [];

    unidades = [
      { id: 'un-1', nome: 'Matriz (Centro)', empresa_id: 'mock-clinic' },
      { id: 'un-2', nome: 'Filial Zona Sul', empresa_id: 'mock-clinic' }
    ];

    profissionais = [
      { id: 'prof-1', nome: 'Dr. João Silva', cor: '#4285f4', unidade_id: 'un-1' },
      { id: 'prof-2', nome: 'Dra. Maria Souza', cor: '#0f9d58', unidade_id: 'un-1' },
      { id: 'prof-3', nome: 'Dr. Pedro (Zona Sul)', cor: '#eab308', unidade_id: 'un-2' },
      ...customAgendas.map((a:any) => ({...a, unidade_id: a.unidade_id || 'un-1'}))
    ];
    
    const today = new Date();
    const isoDate = (offsetDays: number, hour: number, isHalfHour: boolean = false) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      d.setHours(hour, isHalfHour ? 30 : 0, 0, 0);
      return d.toISOString();
    };

    agendamentos = [
      {
        id: 'ag-1', inicio: isoDate(0, 10), fim: isoDate(0, 10, true), status: 'confirmado',
        cliente: { nome: 'Carlos Andrade', telefone: '11999999999' },
        profissional: profissionais[0],
        evento: { id: 'proc-2', nome: 'Limpeza' }
      },
      {
        id: 'ag-2', inicio: isoDate(0, 14), fim: isoDate(0, 14, true), status: 'confirmado',
        cliente: { nome: 'Ana Julia', telefone: '11988888888' },
        profissional: profissionais[1],
        evento: { id: 'proc-1', nome: 'Consulta de Rotina' },
        is_encaixe: true
      },
      {
        id: 'ag-3', inicio: isoDate(1, 9), fim: isoDate(1, 9, true), status: 'pendente',
        cliente: { nome: 'Marcos Paulo', telefone: '11977777777' },
        profissional: profissionais[0],
        evento: { id: 'proc-3', nome: 'Avaliação' }
      }
    ];

    procedimentos = [
      { id: 'proc-1', nome: 'Consulta de Rotina', duracao_minutos: 30 },
      { id: 'proc-2', nome: 'Limpeza', duracao_minutos: 60 },
      { id: 'proc-3', nome: 'Avaliação', duracao_minutos: 45 }
    ];
  } else {
    const supabase = getServiceSupabase();
    
    const { data: uns } = await supabase.from('agend_unidades').select('*').eq('empresa_id', empresa_id);
    unidades = uns || [];

    const { data: agendamentosData } = await supabase.from('agend_agendamentos').select(`
      id, inicio, fim, status, is_encaixe,
      cliente:agend_clientes_finais(nome, telefone),
      profissional:agend_profissionais!inner(id, nome, cor, empresa_id),
      evento:agend_tipos_evento(id, nome)
    `).eq('profissional.empresa_id', empresa_id);
    agendamentos = (agendamentosData || []).filter(a => a.status !== 'bloqueio');

    const { data: profData } = await supabase.from('agend_profissionais').select('id, nome, cor, unidade_id').eq('empresa_id', empresa_id);
    profissionais = profData || [];
    
    const { data: procData } = await supabase.from('agend_tipos_evento').select('id, nome, duracao_minutos').eq('empresa_id', empresa_id);
    procedimentos = procData || [];
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-white">
      <ReportsClient 
        rawEvents={agendamentos}
        profissionais={profissionais}
        procedimentos={procedimentos}
        unidades={unidades}
        empresaId={empresa_id}
      />
    </div>
  );
}
