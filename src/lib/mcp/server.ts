import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  PingRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { VOIBI_MCP_TOOLS, handleCallTool } from './dispatcher';

export function createVoibiMcpServer(empresa: any, apiKey: string, baseUrl: string) {
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

  // Manipulador de listagem de ferramentas
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: VOIBI_MCP_TOOLS,
    };
  });

  // Manipulador de execução de ferramentas
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    return await handleCallTool(name, args, empresa, apiKey, baseUrl);
  });

  // Manipulador de Ping para validação de liveness
  server.setRequestHandler(PingRequestSchema, async () => {
    return {};
  });

  return server;
}
