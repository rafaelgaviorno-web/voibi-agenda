import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const BASE_URL = process.env.VOIBI_API_URL || 'http://localhost:3000';
const API_KEY = process.env.VOIBI_API_KEY || 'd5ab153d-3ea8-4a6e-a18e-5ad315b64ccf';

async function requestVoibi(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok) {
      const errMsg = typeof data === 'object' && data.error ? data.error : text;
      throw new Error(`Erro na API (${res.status}): ${errMsg}`);
    }

    return data;
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED' || err.message.includes('fetch failed')) {
      throw new Error(
        `Não foi possível conectar ao servidor Voibi Agenda em ${BASE_URL}. Verifique se a aplicação está rodando (ex: 'npm run dev').`
      );
    }
    throw err;
  }
}

const server = new Server(
  {
    name: 'voibi_agenda',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Lista de ferramentas disponíveis
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
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
              description: 'Data desejada no formato YYYY-MM-DD (ex: 2026-10-07).',
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
              description: 'Filtrar por status (ex: "confirmado", "remarcado", "cancelado", "atendido" ou "all"). Padrão: confirmados e remarcados.',
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
              description: 'Novo status do agendamento (ex: "confirmado", "remarcado", "atendido").',
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
    ],
  };
});

// Execução das ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'voibi_list_agendas': {
        const res = await requestVoibi('/api/v1/agendas');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res.data, null, 2),
            },
          ],
        };
      }

      case 'voibi_list_event_types': {
        const res = await requestVoibi('/api/v1/event-types');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res.data, null, 2),
            },
          ],
        };
      }

      case 'voibi_check_availability': {
        const params = new URLSearchParams();
        if (args.date) params.set('date', args.date);
        if (args.agenda) params.set('agenda', args.agenda);
        if (args.event_type_id) params.set('event_type_id', args.event_type_id);

        const res = await requestVoibi(`/api/v1/availability?${params.toString()}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  available_times: res.available_times || [],
                  slots: res.data || [],
                  count: (res.available_times || []).length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'voibi_list_bookings': {
        const params = new URLSearchParams();
        if (args.date) params.set('data', args.date);
        if (args.status) params.set('status', args.status);
        if (args.agenda) params.set('agenda', args.agenda);
        if (args.telefone) params.set('telefone', args.telefone);
        if (args.email) params.set('email', args.email);
        if (args.limit) params.set('limit', String(args.limit));

        const res = await requestVoibi(`/api/v1/bookings?${params.toString()}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res.data, null, 2),
            },
          ],
        };
      }

      case 'voibi_get_booking': {
        if (!args.id) throw new Error('O ID do agendamento é obrigatório.');
        const res = await requestVoibi(`/api/v1/bookings/${args.id}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res.data, null, 2),
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
        const res = await requestVoibi('/api/v1/bookings', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res.data, null, 2),
            },
          ],
        };
      }

      case 'voibi_update_booking': {
        if (!args.id) throw new Error('O ID do agendamento é obrigatório.');
        const payload = {};
        if (args.status !== undefined) payload.status = args.status;
        if (args.observacao !== undefined) payload.observacao = args.observacao;
        if (args.inicio !== undefined) payload.inicio = args.inicio;
        if (args.fim !== undefined) payload.fim = args.fim;

        const res = await requestVoibi(`/api/v1/bookings/${args.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res.data, null, 2),
            },
          ],
        };
      }

      case 'voibi_cancel_booking': {
        if (!args.id) throw new Error('O ID do agendamento é obrigatório.');
        const payload = {
          motivo: args.motivo || '',
        };
        const res = await requestVoibi(`/api/v1/bookings/${args.id}/cancel`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(res, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Ferramenta desconhecida: ${name}`);
    }
  } catch (err) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Erro ao executar ${name}: ${err.message}`,
        },
      ],
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Voibi Agenda MCP Server rodando via STDIO.');
}

run().catch((err) => {
  console.error('Erro fatal no Voibi Agenda MCP Server:', err);
  process.exit(1);
});
