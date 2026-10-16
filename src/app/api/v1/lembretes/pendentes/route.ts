import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/client';
import { authenticateApiKey } from '@/lib/api-auth';
import { withApiLogger } from '@/lib/api-logger';
import { format, parseISO, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const GET = withApiLogger(async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const marcarEnviado = searchParams.get('marcar_enviado') === 'true' || searchParams.get('auto_confirm') === 'true';
  const regraFiltroId = searchParams.get('regra_id');
  const horasFuturas = parseInt(searchParams.get('horas_futuras') || '72', 10);

  const supabase = getServiceSupabase();
  const now = new Date();

  // 1. Buscar regras de lembretes ativas da empresa
  let regrasQuery = supabase
    .from('agend_regras_lembretes')
    .select('id, nome, minutos_antes, mensagem_template, ativo')
    .eq('empresa_id', auth.empresa.id)
    .eq('ativo', true)
    .order('minutos_antes', { ascending: false });

  if (regraFiltroId) {
    regrasQuery = regrasQuery.eq('id', regraFiltroId);
  }

  const { data: regrasData, error: regrasError } = await regrasQuery;
  if (regrasError) {
    return NextResponse.json({ error: regrasError.message }, { status: 500 });
  }

  // Se não houver regra cadastrada, usamos uma regra padrão de 24h (1440 min)
  const regras = (regrasData && regrasData.length > 0) ? regrasData : [
    {
      id: 'padrao_1440',
      nome: 'Lembrete Padrão (24h antes)',
      minutos_antes: 1440,
      mensagem_template: 'Olá {{cliente_nome}}, confirmando seu agendamento para o dia {{data_hora}} com {{profissional_nome}}.',
      ativo: true
    }
  ];

  // 2. Buscar agendamentos futuros confirmados ou remarcados
  const maxMinutos = Math.max(...regras.map(r => r.minutos_antes), 1440);
  const limiteFimBusca = addMinutes(now, Math.max(maxMinutos + 120, horasFuturas * 60));

  const { data: bookings, error: bookingsError } = await supabase
    .from('agend_agendamentos')
    .select(`
      id,
      inicio,
      fim,
      status,
      observacao,
      lembretes_enviados,
      agend_clientes_finais!inner(id, nome, email, telefone),
      agend_tipos_evento(id, nome, duracao_minutos),
      agend_profissionais!inner(id, nome, cor, empresa_id)
    `)
    .eq('agend_profissionais.empresa_id', auth.empresa.id)
    .in('status', ['confirmado', 'remarcado'])
    .gt('inicio', now.toISOString())
    .lte('inicio', limiteFimBusca.toISOString())
    .order('inicio', { ascending: true });

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 500 });
  }

  const pendentes: any[] = [];
  const bookingsParaAtualizar: { id: string; lembretes_enviados: any[] }[] = [];

  for (const b of (bookings || [])) {
    const inicioDate = new Date(b.inicio);
    const diffMinutes = (inicioDate.getTime() - now.getTime()) / (1000 * 60);

    // Array de lembretes já enviados para este agendamento
    const enviados: any[] = Array.isArray(b.lembretes_enviados) ? [...b.lembretes_enviados] : [];
    let houveNovoEnvio = false;

    for (const r of regras) {
      // Verifica se esta regra já foi enviada
      const jaEnviado = enviados.some(e => 
        (e.regra_id && e.regra_id === r.id) || 
        (e.minutos_antes && Math.abs(e.minutos_antes - r.minutos_antes) < 5)
      );

      if (jaEnviado) continue;

      // Se a consulta está dentro da janela do lembrete (tempo restante <= minutos_antes)
      if (diffMinutes <= r.minutos_antes && diffMinutes > 0) {
        // Formatar datas
        let dataFmt = '';
        let horaFmt = '';
        try {
          dataFmt = format(inicioDate, 'dd/MM/yyyy');
          horaFmt = format(inicioDate, 'HH:mm');
        } catch {
          dataFmt = b.inicio.split('T')[0] || '';
          horaFmt = (b.inicio.split('T')[1] || '').substring(0, 5);
        }
        const dataHoraFmt = `${dataFmt} às ${horaFmt}`;

        const cliente = (b as any).agend_clientes_finais || {};
        const profissional = (b as any).agend_profissionais || {};
        const procedimento = (b as any).agend_tipos_evento || {};

        const clienteNome = cliente.nome || 'Cliente';
        const primeiroNome = clienteNome.split(' ')[0] || clienteNome;
        const profNome = profissional.nome || 'Profissional';
        const procNome = procedimento.nome || 'Consulta';

        // Substituição das variáveis no template da mensagem
        let mensagem = r.mensagem_template || 'Olá {{cliente_nome}}, seu agendamento é em {{data_hora}}.';
        mensagem = mensagem
          .replace(/\{\{\s*cliente_nome\s*\}\}/gi, clienteNome)
          .replace(/\{\{\s*primeiro_nome\s*\}\}/gi, primeiroNome)
          .replace(/\{\{\s*data_hora\s*\}\}/gi, dataHoraFmt)
          .replace(/\{\{\s*data\s*\}\}/gi, dataFmt)
          .replace(/\{\{\s*hora\s*\}\}/gi, horaFmt)
          .replace(/\{\{\s*profissional_nome\s*\}\}/gi, profNome)
          .replace(/\{\{\s*profissional\s*\}\}/gi, profNome)
          .replace(/\{\{\s*procedimento\s*\}\}/gi, procNome)
          .replace(/\{\{\s*servico\s*\}\}/gi, procNome);

        const telefoneRaw = cliente.telefone || '';
        const telefoneLimpo = telefoneRaw.replace(/\D/g, '');

        const item = {
          id: `lembrete_${b.id}_${r.id}`,
          booking_id: b.id,
          regra_id: r.id,
          regra_nome: r.nome,
          minutos_antes: r.minutos_antes,
          minutos_restantes: Math.round(diffMinutes),
          inicio: b.inicio,
          fim: b.fim,
          data: dataFmt,
          hora: horaFmt,
          data_hora: dataHoraFmt,
          observacao: b.observacao || '',
          cliente: {
            id: cliente.id,
            nome: clienteNome,
            primeiro_nome: primeiroNome,
            telefone: telefoneRaw,
            telefone_limpo: telefoneLimpo,
            email: cliente.email || ''
          },
          profissional: {
            id: profissional.id,
            nome: profNome
          },
          procedimento: {
            id: procedimento.id,
            nome: procNome,
            duracao_minutos: procedimento.duracao_minutos || 30
          },
          procedimento_nome: procNome,
          mensagem: mensagem
        };

        pendentes.push(item);

        if (marcarEnviado) {
          enviados.push({
            regra_id: r.id,
            regra_nome: r.nome,
            minutos_antes: r.minutos_antes,
            enviado_em: now.toISOString()
          });
          houveNovoEnvio = true;
        }
      }
    }

    if (houveNovoEnvio) {
      bookingsParaAtualizar.push({ id: b.id, lembretes_enviados: enviados });
    }
  }

  // Atualizar agendamentos se marcar_enviado foi solicitado
  if (marcarEnviado && bookingsParaAtualizar.length > 0) {
    for (const item of bookingsParaAtualizar) {
      await supabase
        .from('agend_agendamentos')
        .update({ lembretes_enviados: item.lembretes_enviados })
        .eq('id', item.id);
    }
  }

  // Se o N8N solicitar em formato de array direto para desmembrar em múltiplos itens automaticamente
  const querArray = searchParams.get('formato') === 'array' || 
                    searchParams.get('array') === 'true' || 
                    searchParams.get('n8n') === 'true';

  if (querArray) {
    return NextResponse.json(pendentes);
  }

  return NextResponse.json({
    success: true,
    count: pendentes.length,
    marcar_enviado: marcarEnviado,
    data: pendentes
  });
});
