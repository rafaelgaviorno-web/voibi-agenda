import { addMinutes, addHours, isBefore, isAfter, isWithinInterval, parseISO } from 'date-fns';

export interface EventTypeParams {
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  minNoticeHours: number;
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

export interface DailyAvailability {
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "18:00"
}

export interface BookingOrBlock {
  start: Date;
  end: Date;
}

/**
 * Motor de cálculo de disponibilidade
 * @param date Data base para gerar os horários (no fuso horário local da busca)
 * @param availabilityRegras Lista de janelas de tempo disponíveis no dia (ex: 09:00-12:00, 13:00-18:00)
 * @param eventType Configurações do tipo de evento
 * @param existingBookings Agendamentos já confirmados/remarcados do profissional
 * @param blocks Bloqueios/exceções do profissional
 * @param now Data/hora atual para cálculo de antecedência mínima
 */
export function getAvailableSlots(
  date: Date,
  availabilityRegras: DailyAvailability[],
  eventType: EventTypeParams,
  existingBookings: BookingOrBlock[],
  blocks: BookingOrBlock[],
  now: Date = new Date()
): TimeSlot[] {
  const availableSlots: TimeSlot[] = [];
  const minNoticeTime = addHours(now, eventType.minNoticeHours);

  // Para cada janela de disponibilidade do dia
  for (const rule of availabilityRegras) {
    const [startHour, startMin] = rule.startTime.split(':').map(Number);
    const [endHour, endMin] = rule.endTime.split(':').map(Number);

    // Cria os objetos Date para o início e fim da janela no dia especificado
    let currentSlotStart = new Date(date);
    currentSlotStart.setHours(startHour, startMin, 0, 0);

    const ruleEnd = new Date(date);
    ruleEnd.setHours(endHour, endMin, 0, 0);

    // Percorre do início ao fim da janela
    while (isBefore(currentSlotStart, ruleEnd) || currentSlotStart.getTime() === ruleEnd.getTime()) {
      const currentSlotEnd = addMinutes(currentSlotStart, eventType.durationMinutes);

      // Se o fim do slot passar do fim da janela de trabalho, paramos
      if (isAfter(currentSlotEnd, ruleEnd)) {
        break;
      }

      // 1. Validar antecedência mínima
      if (isBefore(currentSlotStart, minNoticeTime)) {
        currentSlotStart = addMinutes(currentSlotStart, eventType.durationMinutes);
        continue;
      }

      // 2. Validar conflito com bloqueios
      const isBlocked = blocks.some(block => 
        isOverlapping(currentSlotStart, currentSlotEnd, block.start, block.end)
      );

      if (isBlocked) {
        currentSlotStart = addMinutes(currentSlotStart, eventType.durationMinutes);
        continue;
      }

      // 3. Validar conflito com agendamentos (considerando buffers)
      const slotWithBufferStart = addMinutes(currentSlotStart, -eventType.bufferBeforeMinutes);
      const slotWithBufferEnd = addMinutes(currentSlotEnd, eventType.bufferAfterMinutes);

      const isBooked = existingBookings.some(booking =>
        isOverlapping(slotWithBufferStart, slotWithBufferEnd, booking.start, booking.end)
      );

      if (!isBooked) {
        availableSlots.push({
          start: currentSlotStart,
          end: currentSlotEnd,
        });
      }

      // Avança para o próximo slot (por padrão, os slots podem começar a cada X minutos da duração, ou intervalos fixos. 
      // Para o MVP, avançaremos de acordo com a duração do evento)
      currentSlotStart = currentSlotEnd;
    }
  }

  return availableSlots;
}

function isOverlapping(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  // Retorna true se houver qualquer sobreposição entre (start1, end1) e (start2, end2)
  return start1 < end2 && end1 > start2;
}
