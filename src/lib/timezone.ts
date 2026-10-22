// Fuso horário de cada clínica (coluna agend_empresas.fuso_horario).
//
// Os horários da agenda são gravados como "hora de relógio" da clínica, sem fuso
// ("2026-10-22T08:00:00"), e o servidor os lê como hora local do processo, que roda em UTC
// (o Dockerfile fixa TZ=UTC). Por isso o "agora" usado para comparar com esses horários
// também precisa ser a hora de relógio da clínica, montada do mesmo jeito.

export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

export const TIMEZONES = [
  { value: 'America/Noronha', label: 'Fernando de Noronha (UTC−2)' },
  { value: 'America/Sao_Paulo', label: 'Brasília (UTC−3)' },
  { value: 'America/Campo_Grande', label: 'Mato Grosso do Sul (UTC−4)' },
  { value: 'America/Cuiaba', label: 'Mato Grosso (UTC−4)' },
  { value: 'America/Manaus', label: 'Amazonas (UTC−4)' },
  { value: 'America/Porto_Velho', label: 'Rondônia (UTC−4)' },
  { value: 'America/Boa_Vista', label: 'Roraima (UTC−4)' },
  { value: 'America/Rio_Branco', label: 'Acre (UTC−5)' },
  { value: 'Europe/Lisbon', label: 'Portugal (Lisboa)' },
];

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// "Agora" no relógio da clínica, no mesmo formato em que os horários da agenda são lidos
export function clinicNow(tz?: string | null, at: Date = new Date()): Date {
  const zone = isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );
  return new Date(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
}
