import { NextRequest } from 'next/server';
import { GET as getAgendas } from '@/app/api/v1/agendas/route';
import { GET as getEventTypes } from '@/app/api/v1/event-types/route';
import { GET as getAvailability } from '@/app/api/v1/availability/route';
import { GET as getBookings, POST as createBooking } from '@/app/api/v1/bookings/route';
import { GET as getBookingById, PATCH as updateBooking } from '@/app/api/v1/bookings/[id]/route';
import { POST as cancelBooking } from '@/app/api/v1/bookings/[id]/cancel/route';

export const VOIBI_MCP_TOOLS = [
  {
    name: 'voibi_list_agendas',
    description: 'Lista todos os profissionais e agendas disponíveis da clínica.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'voibi_list_event_types',
    description: 'Lista todos os tipos de procedimentos e consultas disponíveis na clínica, com suas durações e configurações.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'voibi_check_availability',
    description: 'Consulta os horários livres/disponíveis para agendamento em uma data específica.',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Data desejada no formato YYYY-MM-DD (ex: 2026-10-07) ou DD/MM/YYYY.',
        },
        agenda: {
          type: 'string',
          description: 'Nome ou ID do profissional/agenda (opcional, ex: "Robson" ou "Dr. Teste 1"). Se omitido, busca em todas as agendas.',
        },
        event_type_id: {
          type: 'string',
          description: 'Nome ou ID do procedimento/tipo de evento (opcional, ex: "Avaliação").',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'voibi_list_bookings',
    description: 'Consulta agendamentos realizados na clínica. Útil para verificar consultas marcadas, enviar confirmações de consulta e auditar horários.',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Filtrar por data específica no formato YYYY-MM-DD (ex: 2026-10-07).',
        },
        status: {
          type: 'string',
          description: 'Filtrar por status (ex: "confirmado", "pendente", "cancelado" ou "all"). Padrão: confirmados.',
        },
        status_atendimento: {
          type: 'string',
          description: 'Filtrar por status de atendimento (ex: "agendado", "aguardando", "atendido", "faltou", "reagendou" ou "all").',
        },
        agenda: {
          type: 'string',
          description: 'Filtrar por nome ou ID do profissional/agenda.',
        },
        telefone: {
          type: 'string',
          description: 'Filtrar por telefone/WhatsApp do paciente.',
        },
        email: {
          type: 'string',
          description: 'Filtrar por e-mail do paciente.',
        },
        limit: {
          type: 'number',
          description: 'Limite máximo de agendamentos a retornar (padrão 50).',
        },
      },
    },
  },
  {
    name: 'voibi_get_booking',
    description: 'Obtém os detalhes completos de um agendamento específico através do seu ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'UUID do agendamento.',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'voibi_create_booking',
    description: 'Cria um novo agendamento na agenda da clínica.',
    inputSchema: {
      type: 'object',
      properties: {
        nome: {
          type: 'string',
          description: 'Nome completo do paciente.',
        },
        telefone: {
          type: 'string',
          description: 'Telefone ou WhatsApp do paciente (ex: "11999998888").',
        },
        email: {
          type: 'string',
          description: 'E-mail do paciente (opcional).',
        },
        inicio: {
          type: 'string',
          description: 'Data e hora de início no formato ISO (ex: "2026-10-15T14:00:00").',
        },
        agenda: {
          type: 'string',
          description: 'Nome ou ID do profissional/agenda (ex: "Robson").',
        },
        procedimento: {
          type: 'string',
          description: 'Nome ou ID do procedimento/tipo de evento (ex: "Avaliação").',
        },
        observacao: {
          type: 'string',
          description: 'Observações do agendamento.',
        },
      },
      required: ['nome', 'inicio'],
    },
  },
  {
    name: 'voibi_update_booking',
    description: 'Atualiza um agendamento existente (por exemplo, registrar que o paciente confirmou a consulta ou alterar horários).',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'UUID do agendamento.',
        },
        status: {
          type: 'string',
          description: 'Novo status do agendamento (ex: "confirmado", "pendente", "cancelado").',
        },
        status_atendimento: {
          type: 'string',
          description: 'Novo status de atendimento (ex: "agendado", "aguardando", "atendido", "faltou", "reagendou").',
        },
        observacao: {
          type: 'string',
          description: 'Nova observação (ex: "Consulta confirmada pelo paciente via WhatsApp").',
        },
        inicio: {
          type: 'string',
          description: 'Novo horário de início (ISO-8601).',
        },
        fim: {
          type: 'string',
          description: 'Novo horário de fim (ISO-8601).',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'voibi_cancel_booking',
    description: 'Cancela um agendamento marcando-o como cancelado, registrando o motivo e disparando o webhook da clínica.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'UUID do agendamento.',
        },
        motivo: {
          type: 'string',
          description: 'Motivo do cancelamento informado pelo paciente ou atendente.',
        },
      },
      required: ['id'],
    },
  },
];

export async function handleCallTool(
  name: string,
  args: Record<string, any> = {},
  empresa: any,
  apiKey: string,
  baseUrl: string
) {
  const safeBase = baseUrl || 'http://localhost:3000';
  const authHeader = `Bearer ${apiKey || empresa?.api_key || ''}`;

  try {
    switch (name) {
      case 'voibi_list_agendas': {
        const req = new NextRequest(`${safeBase}/api/v1/agendas`, {
          method: 'GET',
          headers: { 'Authorization': authHeader },
        });
        const res = await getAgendas(req);
        const data = await res.json();
        if (res.status >= 400) {
          throw new Error(data.error || `Erro ${res.status}`);
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data.data || data, null, 2),
            },
          ],
        };
      }

      case 'voibi_list_event_types': {
        const req = new NextRequest(`${safeBase}/api/v1/event-types`, {
          method: 'GET',
          headers: { 'Authorization': authHeader },
        });
        const res = await getEventTypes(req);
        const data = await res.json();
        if (res.status >= 400) {
          throw new Error(data.error || `Erro ${res.status}`);
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data.data || data, null, 2),
            },
          ],
        };
      }

      case 'voibi_check_availability': {
        const url = new URL(`${safeBase}/api/v1/availability`);
        if (args.date) url.searchParams.set('date', args.date);
        if (args.agenda) url.searchParams.set('agenda', args.agenda);
        if (args.event_type_id) url.searchParams.set('event_type_id', args.event_type_id);

        const req = new NextRequest(url.toString(), {
          method: 'GET',
          headers: { 'Authorization': authHeader },
        });
        const res = await getAvailability(req);
        const data = await res.json();
        if (res.status >= 400) {
          throw new Error(data.error || `Erro ${res.status}`);
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  available_times: data.available_times || [],
                  slots: data.data || [],
                  count: (data.available_times || []).length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'voibi_list_bookings': {
        const url = new URL(`${safeBase}/api/v1/bookings`);
        if (args.date) url.searchParams.set('data', args.date);
        if (args.status) url.searchParams.set('status', args.status);
        if (args.status_atendimento) url.searchParams.set('status_atendimento', args.status_atendimento);
        if (args.agenda) url.searchParams.set('agenda', args.agenda);
        if (args.telefone) url.searchParams.set('telefone', args.telefone);
        if (args.email) url.searchParams.set('email', args.email);
        if (args.limit) url.searchParams.set('limit', String(args.limit));

        const req = new NextRequest(url.toString(), {
          method: 'GET',
          headers: { 'Authorization': authHeader },
        });
        const res = await getBookings(req);
        const data = await res.json();
        if (res.status >= 400) {
          throw new Error(data.error || `Erro ${res.status}`);
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data.data || data, null, 2),
            },
          ],
        };
      }

      case 'voibi_get_booking': {
        if (!args.id) throw new Error('O ID do agendamento é obrigatório.');
        const req = new NextRequest(`${safeBase}/api/v1/bookings/${args.id}`, {
          method: 'GET',
          headers: { 'Authorization': authHeader },
        });
        const res = await getBookingById(req, { params: Promise.resolve({ id: args.id }) });
        const data = await res.json();
        if (res.status >= 400) {
          throw new Error(data.error || `Erro ${res.status}`);
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data.data || data, null, 2),
            },
          ],
        };
      }

      case 'voibi_create_booking': {
        const payload = {
          nome: args.nome,
          telefone: args.telefone,
          email: args.email,
          inicio: args.inicio,
          agenda: args.agenda,
          procedimento: args.procedimento,
          observacao: args.observacao,
        };
        const req = new NextRequest(`${safeBase}/api/v1/bookings`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const res = await createBooking(req);
        const data = await res.json();
        if (res.status >= 400) {
          throw new Error(data.error || `Erro ${res.status}`);
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data.data || data, null, 2),
            },
          ],
        };
      }

      case 'voibi_update_booking': {
        if (!args.id) throw new Error('O ID do agendamento é obrigatório.');
        const payload: Record<string, any> = {};
        if (args.status !== undefined) payload.status = args.status;
        if (args.status_atendimento !== undefined) payload.status_atendimento = args.status_atendimento;
        if (args.observacao !== undefined) payload.observacao = args.observacao;
        if (args.inicio !== undefined) payload.inicio = args.inicio;
        if (args.fim !== undefined) payload.fim = args.fim;

        const req = new NextRequest(`${safeBase}/api/v1/bookings/${args.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const res = await updateBooking(req, { params: Promise.resolve({ id: args.id }) });
        const data = await res.json();
        if (res.status >= 400) {
          throw new Error(data.error || `Erro ${res.status}`);
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data.data || data, null, 2),
            },
          ],
        };
      }

      case 'voibi_cancel_booking': {
        if (!args.id) throw new Error('O ID do agendamento é obrigatório.');
        const payload = {
          motivo: args.motivo || '',
        };
        const req = new NextRequest(`${safeBase}/api/v1/bookings/${args.id}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const res = await cancelBooking(req, { params: Promise.resolve({ id: args.id }) });
        const data = await res.json();
        if (res.status >= 400) {
          throw new Error(data.error || `Erro ${res.status}`);
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Ferramenta desconhecida: ${name}`);
    }
  } catch (err: any) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Erro ao executar ${name}: ${err?.message || String(err)}`,
        },
      ],
    };
  }
}
