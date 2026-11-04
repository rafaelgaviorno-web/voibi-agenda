// Bloqueios que afetam um profissional num intervalo:
// os dele próprio + os gerais da empresa (feriados/exceções), respeitando a unidade quando definida.
export async function getBlocksForProfessional(
  supabase: any,
  profId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<{ start: Date; end: Date }[]> {
  const { data: prof } = await supabase
    .from('agend_profissionais')
    .select('empresa_id, unidade_id')
    .eq('id', profId)
    .maybeSingle();

  const scope = prof?.empresa_id
    ? `profissional_id.eq.${profId},and(profissional_id.is.null,empresa_id.eq.${prof.empresa_id})`
    : `profissional_id.eq.${profId}`;

  const { data: blocks } = await supabase
    .from('agend_bloqueios')
    .select('*')
    .or(scope);

  const applicableBlocks = (blocks || []).filter(
    (b: any) => b.profissional_id || !b.unidade_id || !prof?.unidade_id || b.unidade_id === prof.unidade_id
  );

  const rStart = new Date(rangeStart);
  const rEnd = new Date(rangeEnd);
  const result: { start: Date; end: Date }[] = [];

  for (const b of applicableBlocks) {
    if (b.tipo === 'recorrente') {
      if (!Array.isArray(b.dias_semana) || b.dias_semana.length === 0) continue;

      // Percorre os dias do intervalo especificado
      const curr = new Date(rStart);
      curr.setHours(0, 0, 0, 0);

      const loopEnd = new Date(rEnd);
      loopEnd.setHours(23, 59, 59, 999);

      while (curr <= loopEnd) {
        const dayOfWeek = curr.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

        if (b.dias_semana.includes(dayOfWeek)) {
          // Validação de vigência do bloqueio recorrente
          let inVigencia = true;

          const currDateStr = curr.toISOString().split('T')[0];

          if (b.inicio) {
            const startDateStr = new Date(b.inicio).toISOString().split('T')[0];
            if (currDateStr < startDateStr) inVigencia = false;
          }

          const fimLimite = b.data_fim_recorrencia || b.fim;
          if (inVigencia && fimLimite) {
            const endDateStr = new Date(fimLimite).toISOString().split('T')[0];
            if (currDateStr > endDateStr) inVigencia = false;
          }

          if (inVigencia) {
            let blockStart = new Date(curr);
            let blockEnd = new Date(curr);

            if (b.hora_inicio && b.hora_fim) {
              const [sH, sM] = b.hora_inicio.split(':').map(Number);
              const [eH, eM] = b.hora_fim.split(':').map(Number);
              blockStart.setHours(sH, sM, 0, 0);
              blockEnd.setHours(eH, eM, 0, 0);
            } else {
              // Dia todo
              blockStart.setHours(0, 0, 0, 0);
              blockEnd.setHours(23, 59, 59, 999);
            }

            // Apenas adiciona se sobrepõe com a janela solicitada
            if (blockStart < rEnd && blockEnd > rStart) {
              result.push({ start: blockStart, end: blockEnd });
            }
          }
        }

        // Avança 1 dia
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      // Bloqueio pontual por data
      if (!b.inicio || !b.fim) continue;
      const bStart = new Date(b.inicio);
      const bEnd = new Date(b.fim);

      if (bStart < rEnd && bEnd > rStart) {
        result.push({ start: bStart, end: bEnd });
      }
    }
  }

  return result;
}

// Verifica se um período específico entra em conflito com qualquer bloqueio (pontual ou recorrente)
export async function checkBlockConflict(
  supabase: any,
  empresaId: string,
  profId: string | null,
  unidadeId: string | null,
  inicioIso: string,
  fimIso: string
): Promise<{ blocked: boolean; motivo?: string }> {
  const scope = profId
    ? `profissional_id.eq.${profId},and(profissional_id.is.null,empresa_id.eq.${empresaId})`
    : `empresa_id.eq.${empresaId}`;

  const { data: blocks } = await supabase
    .from('agend_bloqueios')
    .select('*')
    .or(scope);

  const reqStart = new Date(inicioIso);
  const reqEnd = new Date(fimIso);

  const applicable = (blocks || []).filter(
    (b: any) => b.profissional_id || !b.unidade_id || !unidadeId || b.unidade_id === unidadeId
  );

  for (const b of applicable) {
    if (b.tipo === 'recorrente') {
      if (!Array.isArray(b.dias_semana) || b.dias_semana.length === 0) continue;

      const dayOfWeek = reqStart.getDay();
      if (!b.dias_semana.includes(dayOfWeek)) continue;

      const targetDateStr = reqStart.toISOString().split('T')[0];

      if (b.inicio) {
        const startDateStr = new Date(b.inicio).toISOString().split('T')[0];
        if (targetDateStr < startDateStr) continue;
      }

      const fimLimite = b.data_fim_recorrencia || b.fim;
      if (fimLimite) {
        const endDateStr = new Date(fimLimite).toISOString().split('T')[0];
        if (targetDateStr > endDateStr) continue;
      }

      let bStart = new Date(reqStart);
      let bEnd = new Date(reqStart);

      if (b.hora_inicio && b.hora_fim) {
        const [sH, sM] = b.hora_inicio.split(':').map(Number);
        const [eH, eM] = b.hora_fim.split(':').map(Number);
        bStart.setHours(sH, sM, 0, 0);
        bEnd.setHours(eH, eM, 0, 0);
      } else {
        bStart.setHours(0, 0, 0, 0);
        bEnd.setHours(23, 59, 59, 999);
      }

      if (reqStart < bEnd && reqEnd > bStart) {
        return { blocked: true, motivo: b.motivo || 'Agenda com bloqueio recorrente neste horário' };
      }
    } else {
      if (!b.inicio || !b.fim) continue;
      const bStart = new Date(b.inicio);
      const bEnd = new Date(b.fim);

      if (reqStart < bEnd && reqEnd > bStart) {
        return { blocked: true, motivo: b.motivo || 'Agenda bloqueada' };
      }
    }
  }

  return { blocked: false };
}
