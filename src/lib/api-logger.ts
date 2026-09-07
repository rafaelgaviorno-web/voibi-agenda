import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from './supabase/client';

export interface ApiLogEntry {
  id: string;
  empresa_id: string | null;
  metodo: string;
  endpoint: string;
  status_code: number;
  ip: string | null;
  user_agent: string | null;
  duracao_ms: number;
  request_headers: Record<string, string>;
  request_body: any;
  response_body: any;
  erro: string | null;
  created_at: string;
}

// Buffer circular em memória para acesso imediato e resiliência (máx 300 logs)
declare global {
  var __VOIBI_API_LOGS__: ApiLogEntry[] | undefined;
  var __VOIBI_API_KEY_CACHE__: Map<string, string> | undefined;
}

if (!globalThis.__VOIBI_API_LOGS__) {
  globalThis.__VOIBI_API_LOGS__ = [];
}

if (!globalThis.__VOIBI_API_KEY_CACHE__) {
  globalThis.__VOIBI_API_KEY_CACHE__ = new Map<string, string>();
}

export function cacheApiKeyEmpresa(apiKey: string, empresaId: string) {
  if (globalThis.__VOIBI_API_KEY_CACHE__) {
    globalThis.__VOIBI_API_KEY_CACHE__.set(apiKey, empresaId);
  }
}

export function getCachedEmpresaId(apiKey: string): string | undefined {
  return globalThis.__VOIBI_API_KEY_CACHE__?.get(apiKey);
}

// Mascara tokens de autorização para não expor a chave inteira nos logs
function maskHeaderValue(key: string, value: string): string {
  if (key.toLowerCase() === 'authorization' && value.startsWith('Bearer ')) {
    const token = value.slice(7);
    if (token.length > 8) {
      return `Bearer ${token.slice(0, 4)}...${token.slice(-4)}`;
    }
    return 'Bearer ***';
  }
  return value;
}

export async function recordApiLog(logData: {
  empresa_id?: string | null;
  metodo: string;
  endpoint: string;
  status_code: number;
  ip?: string | null;
  user_agent?: string | null;
  duracao_ms: number;
  request_headers?: Record<string, string>;
  request_body?: any;
  response_body?: any;
  erro?: string | null;
}) {
  const entry: ApiLogEntry = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    empresa_id: logData.empresa_id || null,
    metodo: logData.metodo,
    endpoint: logData.endpoint,
    status_code: logData.status_code,
    ip: logData.ip || null,
    user_agent: logData.user_agent || null,
    duracao_ms: logData.duracao_ms,
    request_headers: logData.request_headers || {},
    request_body: logData.request_body ?? null,
    response_body: logData.response_body ?? null,
    erro: logData.erro || null,
    created_at: new Date().toISOString()
  };

  // 1. Grava no buffer de memória
  const memoryLogs = globalThis.__VOIBI_API_LOGS__ || [];
  memoryLogs.unshift(entry);
  if (memoryLogs.length > 300) {
    memoryLogs.pop();
  }
  globalThis.__VOIBI_API_LOGS__ = memoryLogs;

  // 2. Grava no Supabase de forma assíncrona (não-bloqueante)
  try {
    const supabase = getServiceSupabase();
    await supabase.from('agend_api_logs').insert({
      id: entry.id,
      empresa_id: entry.empresa_id,
      metodo: entry.metodo,
      endpoint: entry.endpoint,
      status_code: entry.status_code,
      ip: entry.ip,
      user_agent: entry.user_agent,
      duracao_ms: entry.duracao_ms,
      request_headers: entry.request_headers,
      request_body: entry.request_body,
      response_body: entry.response_body,
      erro: entry.erro,
      created_at: entry.created_at
    });
  } catch (err) {
    // Falha silenciosa caso a tabela ainda não tenha sido criada no Supabase
    // Os logs continuarão visíveis através do buffer de memória!
  }

  return entry;
}

export async function getApiLogs(empresaId: string, limit = 50): Promise<ApiLogEntry[]> {
  const supabase = getServiceSupabase();

  try {
    const { data, error } = await supabase
      .from('agend_api_logs')
      .select('*')
      .or(`empresa_id.eq.${empresaId},empresa_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data as ApiLogEntry[];
    }
  } catch {
    // Tabela agend_api_logs pode não existir ainda
  }

  // Fallback: Retorna do buffer de memória filtrado pela empresa (ou sem empresa_id para requisições com auth falha)
  const memoryLogs = globalThis.__VOIBI_API_LOGS__ || [];
  return memoryLogs
    .filter(log => !log.empresa_id || log.empresa_id === empresaId)
    .slice(0, limit);
}

export async function clearApiLogs(empresaId: string): Promise<boolean> {
  // Limpa da memória
  if (globalThis.__VOIBI_API_LOGS__) {
    globalThis.__VOIBI_API_LOGS__ = globalThis.__VOIBI_API_LOGS__.filter(
      log => log.empresa_id && log.empresa_id !== empresaId
    );
  }

  // Tenta limpar do Supabase
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from('agend_api_logs')
      .delete()
      .eq('empresa_id', empresaId);
  } catch {
    // Ignora se tabela não existir
  }

  return true;
}

// Wrapper de alto nível para interceptar qualquer rota de API v1
export function withApiLogger<T extends (...args: any[]) => Promise<NextResponse>>(handler: T) {
  return async function loggedHandler(request: NextRequest, ...rest: any[]): Promise<NextResponse> {
    const startTime = performance.now();
    const url = new URL(request.url);
    const endpoint = `${url.pathname}${url.search}`;
    const metodo = request.method;

    // Headers sanitizados
    const headersObj: Record<string, string> = {};
    request.headers.forEach((val, key) => {
      headersObj[key] = maskHeaderValue(key, val);
    });

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               null;
    const userAgent = request.headers.get('user-agent') || null;

    // Captura o corpo da requisição sem consumir o stream original
    let requestBody: any = null;
    if (['POST', 'PATCH', 'PUT'].includes(metodo)) {
      try {
        const cloned = request.clone();
        requestBody = await cloned.json();
      } catch {
        // Pode ser vazio ou multipart
      }
    }

    // Tenta identificar empresa_id pela API Key informada no Authorization
    let empresaId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const cached = getCachedEmpresaId(token);
      if (cached) {
        empresaId = cached;
      } else {
        try {
          const supabase = getServiceSupabase();
          const { data: emp } = await supabase
            .from('agend_empresas')
            .select('id')
            .eq('api_key', token)
            .maybeSingle();
          if (emp) {
            empresaId = emp.id;
            cacheApiKeyEmpresa(token, emp.id);
          }
        } catch {
          // Ignora
        }
      }
    }

    let response: NextResponse;
    let responseBody: any = null;
    let erro: string | null = null;

    try {
      response = await handler(request, ...rest);
      
      // Tenta ler o corpo da resposta clonando-a
      try {
        const resClone = response.clone();
        const contentType = resClone.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          responseBody = await resClone.json();
          if (responseBody?.error) {
            erro = typeof responseBody.error === 'string' ? responseBody.error : JSON.stringify(responseBody.error);
          }
        } else {
          const text = await resClone.text();
          responseBody = text.slice(0, 1000); // Limita tamanho
        }
      } catch {
        // Não foi possível clonar ou parsear
      }
    } catch (err: any) {
      erro = err?.message || 'Internal Server Error';
      response = NextResponse.json({ error: erro }, { status: 500 });
      responseBody = { error: erro };
    }

    const duracaoMs = Math.round(performance.now() - startTime);

    // Registra o log de forma não-bloqueante
    recordApiLog({
      empresa_id: empresaId,
      metodo,
      endpoint,
      status_code: response.status,
      ip,
      user_agent: userAgent,
      duracao_ms: duracaoMs,
      request_headers: headersObj,
      request_body: requestBody,
      response_body: responseBody,
      erro
    }).catch(console.error);

    return response;
  } as T;
}
