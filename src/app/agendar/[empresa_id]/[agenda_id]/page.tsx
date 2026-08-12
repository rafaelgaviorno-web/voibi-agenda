import { getServiceSupabase } from '@/lib/supabase/client';
import { notFound } from 'next/navigation';
import BookingWizard from './BookingWizard';

export const dynamic = 'force-dynamic';

export default async function AgendamentoPublicoPage({ 
  params 
}: { 
  params: Promise<{ empresa_id: string, agenda_id: string }> 
}) {
  const { empresa_id, agenda_id } = await params;
  
  let empresa = null;
  let profissional = null;
  let procedimentos: any[] = [];
  
  if (empresa_id === 'mock-clinic') {
    empresa = { nome: 'Clínica de Teste Voibi' };
    
    let baseNome = agenda_id === 'prof-1' ? 'Dr. João Silva' : 'Dra. Maria Souza';
    let baseCor = agenda_id === 'prof-1' ? '#4285f4' : '#0f9d58';

    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const customAgendasStr = cookieStore.get('voibi_mock_agendas')?.value;
    if (customAgendasStr) {
      const customAgendas = JSON.parse(customAgendasStr);
      const found = customAgendas.find((a:any) => a.id === agenda_id);
      if (found) {
        baseNome = found.nome;
        baseCor = found.cor;
      }
    }

    profissional = { 
      id: agenda_id, 
      nome: baseNome,
      cor: baseCor,
      webhook_url: null,
      permitir_sobreposicao: false,
      campos_personalizados: [],
      disponibilidade: [
        { dia_semana: 1, hora_inicio: '09:00:00', hora_fim: '18:00:00' }, // Segunda
        { dia_semana: 2, hora_inicio: '09:00:00', hora_fim: '18:00:00' }, // Terça
        { dia_semana: 3, hora_inicio: '09:00:00', hora_fim: '18:00:00' }, // Quarta
        { dia_semana: 4, hora_inicio: '09:00:00', hora_fim: '18:00:00' }, // Quinta
        { dia_semana: 5, hora_inicio: '09:00:00', hora_fim: '18:00:00' }  // Sexta
      ]
    };
    procedimentos = [
      { id: 'proc-1', nome: 'Consulta de Rotina', duracao_minutos: 30 },
      { id: 'proc-2', nome: 'Limpeza', duracao_minutos: 60 },
      { id: 'proc-3', nome: 'Avaliação Inicial', duracao_minutos: 45 }
    ];
  } else {
    const supabase = getServiceSupabase();
    
    // 1. Pegar empresa
    const { data: eData } = await supabase.from('agend_empresas').select('nome').eq('id', empresa_id).single();
    if (!eData) notFound();
    empresa = eData;
    
    // 2. Pegar profissional
    const { data: pData, error: pErr } = await supabase.from('agend_profissionais').select('id, nome, cor').eq('id', agenda_id).eq('empresa_id', empresa_id).single();
    if (pErr) console.error("Error fetching profissional:", pErr);
    if (!pData) notFound();
    
    // Pegar disponibilidade do profissional
    const { data: dispData } = await supabase.from('agend_disponibilidade').select('dia_semana, hora_inicio, hora_fim').eq('profissional_id', agenda_id);
    (pData as any).disponibilidade = dispData || [];
    
    profissional = pData;
    
    // 3. Pegar procedimentos
    const { data: procData } = await supabase.from('agend_tipos_evento').select('*').eq('empresa_id', empresa_id);
    procedimentos = procData || [];
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      <BookingWizard 
        empresa={empresa} 
        profissional={profissional} 
        procedimentos={procedimentos} 
      />
    </div>
  );
}
