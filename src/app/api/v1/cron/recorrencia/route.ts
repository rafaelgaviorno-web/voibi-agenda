import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  // Autenticação para proteger a rota (pode usar a mesma API Key das integrações)
  const auth = await authenticateApiKey(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = getServiceSupabase();
  const empresaId = auth.empresa.id;
  const webhookUrl = auth.empresa.webhook_url;

  if (!webhookUrl) {
    return NextResponse.json({ error: 'Nenhum webhook configurado para esta empresa.' }, { status: 400 });
  }

  // 1. Obter todos os procedimentos recorrentes desta empresa
  const { data: procedimentos } = await supabase
    .from('agend_tipos_evento')
    .select('id, nome, is_recorrente')
    .eq('is_recorrente', true);

  if (!procedimentos || procedimentos.length === 0) {
    return NextResponse.json({ message: 'Nenhum procedimento recorrente configurado.' });
  }

  const procIds = procedimentos.map((p: any) => p.id);

  // Define a janela de tempo: 30 dias atrás (com tolerância de 25 a 35 dias)
  const hoje = new Date();
  const dataFim = subDays(hoje, 25).toISOString(); // Até 25 dias atrás
  const dataInicio = subDays(hoje, 35).toISOString(); // Desde 35 dias atrás

  // 2. Buscar agendamentos passados nesse intervalo com procedimentos recorrentes (status atendido ou confirmado)
  const { data: agendamentosAntigos, error: errAntigos } = await supabase
    .from('agend_agendamentos')
    .select('cliente_id, inicio, agend_clientes_finais(id, nome, telefone, email), agend_tipos_evento(nome)')
    .eq('empresa_id', empresaId)
    .in('tipo_evento_id', procIds)
    .in('status', ['confirmado', 'atendido'])
    .gte('inicio', dataInicio)
    .lte('inicio', dataFim);

  if (errAntigos || !agendamentosAntigos) {
    return NextResponse.json({ error: 'Erro ao buscar agendamentos passados', detalhes: errAntigos }, { status: 500 });
  }

  const clientesEncontrados = new Map<string, any>();
  for (const ag of agendamentosAntigos) {
    if (ag.cliente_id && ag.agend_clientes_finais) {
      clientesEncontrados.set(ag.cliente_id, {
        cliente: ag.agend_clientes_finais,
        ultimoProcedimento: ag.agend_tipos_evento?.nome,
        ultimaData: ag.inicio
      });
    }
  }

  const faltososParaLembrete = [];

  // 3. Verificar se cada cliente possui algum agendamento no FUTURO
  for (const [clienteId, dados] of Array.from(clientesEncontrados.entries())) {
    const { data: agendamentosFuturos } = await supabase
      .from('agend_agendamentos')
      .select('id')
      .eq('cliente_id', clienteId)
      .eq('empresa_id', empresaId)
      .in('status', ['confirmado', 'reagendou'])
      .gte('inicio', hoje.toISOString())
      .limit(1);

    if (!agendamentosFuturos || agendamentosFuturos.length === 0) {
      // Cliente NÃO tem agendamento futuro! É um alvo para a automação.
      faltososParaLembrete.push(dados);
    }
  }

  // 4. Disparar Webhook para cada cliente faltoso
  let disparados = 0;
  for (const alvo of faltososParaLembrete) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'lembrete.recorrencia',
          data: alvo
        })
      });
      disparados++;
    } catch (e) {
      console.error('Erro ao disparar webhook de recorrência:', e);
    }
  }

  return NextResponse.json({ 
    message: 'Processamento de recorrência concluído.', 
    clientesEncontrados: clientesEncontrados.size,
    lembretesEnviados: disparados,
    detalhes: faltososParaLembrete
  });
}
