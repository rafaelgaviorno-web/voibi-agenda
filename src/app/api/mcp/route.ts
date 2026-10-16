import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import { createVoibiMcpServer } from '@/lib/mcp/server';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-api-key, apikey, mcp-session-id, last-event-id',
    'Access-Control-Expose-Headers': 'mcp-session-id',
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(),
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) {
    return NextResponse.json(
      {
        error: auth.error,
        message:
          'Para conectar este MCP Server no Claude ou assistentes de IA, forneça sua chave de API via header Authorization (Bearer <token>) ou via URL: https://seu-dominio/api/mcp?apiKey=SUA_CHAVE_API',
      },
      {
        status: auth.status,
        headers: getCorsHeaders(),
      }
    );
  }

  const accept = request.headers.get('accept') || '';
  const isSseStream = accept.includes('text/event-stream') || request.nextUrl.searchParams.get('sse') === 'true';

  // Se não for SSE explícito (por exemplo, acessou via navegador ou curl simples), retorna status informativo JSON
  if (!isSseStream) {
    return NextResponse.json(
      {
        status: 'online',
        server: 'voibi_agenda',
        protocol: 'Model Context Protocol (MCP)',
        version: '1.0.0',
        empresa: auth.empresa.slug || auth.empresa.id,
        tools_count: 8,
        description: 'Servidor MCP Oficial do Voibi Agenda para Claude, ChatGPT e assistentes de IA.',
        connect_url: `${request.nextUrl.origin}/api/mcp?apiKey=${auth.apiKey}`,
        transports: ['streamable-http', 'sse'],
      },
      {
        status: 200,
        headers: getCorsHeaders(),
      }
    );
  }

  // Se for conexão SSE
  try {
    const baseUrl = request.nextUrl.origin;
    const server = createVoibiMcpServer(auth.empresa, auth.apiKey || '', baseUrl);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    const response = await transport.handleRequest(request);

    // Adiciona headers CORS
    const headers = new Headers(response.headers);
    Object.entries(getCorsHeaders()).forEach(([k, v]) => headers.set(k, v));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Erro no servidor MCP SSE: ${err?.message || String(err)}` },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: { code: -32000, message: auth.error },
        id: null,
      },
      {
        status: auth.status,
        headers: getCorsHeaders(),
      }
    );
  }

  try {
    // Normaliza os cabeçalhos para total compatibilidade com a especificação MCP
    const headers = new Headers(request.headers);
    const accept = headers.get('accept') || '';
    if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
      headers.set('accept', 'application/json, text/event-stream');
    }
    if (!headers.get('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const bodyText = await request.text();
    const normalizedReq = new Request(request.url, {
      method: 'POST',
      headers,
      body: bodyText,
      // @ts-ignore
      duplex: 'half',
    });

    const baseUrl = request.nextUrl.origin;
    const server = createVoibiMcpServer(auth.empresa, auth.apiKey || '', baseUrl);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    const response = await transport.handleRequest(normalizedReq);

    // Mescla os headers CORS
    const resHeaders = new Headers(response.headers);
    Object.entries(getCorsHeaders()).forEach(([k, v]) => resHeaders.set(k, v));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: `Erro interno no MCP Server: ${err?.message || String(err)}`,
        },
        id: null,
      },
      {
        status: 500,
        headers: getCorsHeaders(),
      }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: getCorsHeaders() });
  }

  try {
    const baseUrl = request.nextUrl.origin;
    const server = createVoibiMcpServer(auth.empresa, auth.apiKey || '', baseUrl);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    const response = await transport.handleRequest(request);

    const headers = new Headers(response.headers);
    Object.entries(getCorsHeaders()).forEach(([k, v]) => headers.set(k, v));

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    return new Response(null, { status: 204, headers: getCorsHeaders() });
  }
}
