import { getServiceSupabase } from '@/lib/supabase/client';
import CalendarWrapper from './CalendarWrapper';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({ params }: { params: Promise<{ empresa_id: string }> }) {
  const { empresa_id } = await params;
  
  let agendamentos: any[] = [];
  let profissionais: any[] = [];
  let procedimentos: any[] = [];
  let unidades: any[] = [];
  let currentUnidadeId = '';

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const savedUnidadeId = cookieStore.get('voibi_unidade_id')?.value;

  if (empresa_id === 'mock-clinic') {
    const customAgendasStr = cookieStore.get('voibi_mock_agendas')?.value;
    const customAgendas = customAgendasStr ? JSON.parse(customAgendasStr) : [];
    currentUnidadeId = savedUnidadeId || 'un-1';

    unidades = [
      { id: 'un-1', nome: 'Matriz (Centro)', empresa_id: 'mock-clinic' },
      { id: 'un-2', nome: 'Filial Zona Sul', empresa_id: 'mock-clinic' }
    ];

    // Dados Falsos para teste sem Banco de Dados
    const allProfissionais = [
      { id: 'prof-1', nome: 'Dr. João Silva', cor: '#4285f4', unidade_id: 'un-1' },
      { id: 'prof-2', nome: 'Dra. Maria Souza', cor: '#0f9d58', unidade_id: 'un-1' },
      { id: 'prof-3', nome: 'Dr. Pedro (Zona Sul)', cor: '#eab308', unidade_id: 'un-2' },
      ...customAgendas.map((a:any) => ({...a, unidade_id: a.unidade_id || 'un-1'}))
    ];

    profissionais = allProfissionais.filter(p => p.unidade_id === currentUnidadeId);
    
    // Gerar alguns eventos para a semana atual
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
        cliente: { nome: 'Carlos Andrade' },
        profissional: profissionais[0],
        evento: { id: 'proc-2', nome: 'Limpeza' }
      },
      {
        id: 'ag-2', inicio: isoDate(0, 14), fim: isoDate(0, 14, true), status: 'confirmado',
        cliente: { nome: 'Ana Julia' },
        profissional: profissionais[1],
        evento: { id: 'proc-1', nome: 'Consulta de Rotina' },
        is_encaixe: true
      },
      {
        id: 'ag-3', inicio: isoDate(1, 9), fim: isoDate(1, 9, true), status: 'pendente',
        cliente: { nome: 'Marcos Paulo' },
        profissional: profissionais[0],
        evento: { id: 'proc-3', nome: 'Avaliação' }
      },
      {
        id: 'mock-block-global',
        inicio: isoDate(1, 0),
        fim: isoDate(1, 23, true),
        status: 'bloqueio',
        observacao: 'Feriado Nacional (Global)'
      },
      {
        id: 'mock-block-spec',
        inicio: isoDate(2, 14),
        fim: isoDate(2, 18),
        status: 'bloqueio',
        observacao: 'Reunião/Treinamento',
        profissional: allProfissionais[0]
      }
    ].filter(e => !e.profissional || e.profissional.unidade_id === currentUnidadeId);
    // Mock procedimentos
    procedimentos = [
      { id: 'proc-1', nome: 'Consulta de Rotina', duracao_minutos: 30 },
      { id: 'proc-2', nome: 'Limpeza', duracao_minutos: 60 },
      { id: 'proc-3', nome: 'Avaliação', duracao_minutos: 45 }
    ];
    // Adicionar disponibilidade mockada
    profissionais = profissionais.map(p => ({
      ...p,
      disponibilidade: [
        { dia_semana: 1, hora_inicio: '09:00:00', hora_fim: '12:00:00' },
        { dia_semana: 1, hora_inicio: '13:00:00', hora_fim: '18:00:00' },
        { dia_semana: 2, hora_inicio: '08:00:00', hora_fim: '18:00:00' },
        { dia_semana: 3, hora_inicio: '08:00:00', hora_fim: '18:00:00' },
        { dia_semana: 4, hora_inicio: '08:00:00', hora_fim: '18:00:00' },
        { dia_semana: 5, hora_inicio: '08:00:00', hora_fim: '18:00:00' }
      ]
    }));
  } else {
    const supabase = getServiceSupabase();
    
    const { data: uns } = await supabase.from('agend_unidades').select('*').eq('empresa_id', empresa_id);
    unidades = uns || [];
    currentUnidadeId = savedUnidadeId && unidades.find(u => u.id === savedUnidadeId) ? savedUnidadeId : (unidades[0]?.id || '');

    const { data: agendamentosData } = await supabase.from('agend_agendamentos').select(`
      id, inicio, fim, status, is_encaixe,
      cliente:agend_clientes_finais(nome),
      profissional:agend_profissionais!inner(id, nome, cor, empresa_id),
      evento:agend_tipos_evento(nome)
    `).eq('profissional.empresa_id', empresa_id);
    agendamentos = agendamentosData || [];

    const { data: profData } = await supabase.from('agend_profissionais').select('id, nome, cor').eq('empresa_id', empresa_id);
    const { data: dispData } = await supabase.from('agend_disponibilidade').select('profissional_id, dia_semana, hora_inicio, hora_fim');
    
    profissionais = (profData || []).map(p => ({
      ...p,
      disponibilidade: (dispData || []).filter(d => d.profissional_id === p.id)
    }));

    const { data: bloqueiosData } = await supabase.from('agend_bloqueios').select('id, inicio, fim, motivo, profissional_id');
    const bloqueios = (bloqueiosData || []).filter(b => b.profissional_id === null || profissionais.some(p => p.id === b.profissional_id)).map(b => ({
      id: b.id,
      inicio: b.inicio,
      fim: b.fim,
      status: 'bloqueio',
      observacao: b.motivo,
      profissional: profissionais.find(p => p.id === b.profissional_id)
    }));
    agendamentos = [...agendamentos, ...bloqueios];

    if (currentUnidadeId) {
      profissionais = profissionais.filter(p => (p as any).unidade_id === currentUnidadeId || !(p as any).unidade_id);
      agendamentos = agendamentos.filter(a => !a.profissional || (a.profissional as any).unidade_id === currentUnidadeId || !(a.profissional as any).unidade_id);
    }

    const { data: procData } = await supabase.from('agend_tipos_evento').select('id, nome, duracao_minutos').eq('empresa_id', empresa_id);
    procedimentos = procData || [];
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <CalendarWrapper 
        rawEvents={agendamentos}
        profissionais={profissionais}
        procedimentos={procedimentos}
        unidades={unidades}
        currentUnidadeId={currentUnidadeId}
        baseUrl={`/dashboard/${empresa_id}`}
      />
    </div>
  );
}
