import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from './supabase/client';

export interface ApiLogEntry {
  id: string;
  empresa_id: string | null;
  empresa_nome?: string | null;
  empresa_slug?: string | null;
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

export interface EmpresaInfo {
  id: string;
  nome: string;
  slug: string;
}

// Buffer circular em memória para acesso imediato e resiliência (máx 300 logs)
declare global {
  var __VOIBI_API_LOGS__: ApiLogEntry[] | undefined;
  var __VOIBI_API_KEY_CACHE__: Map<string, string> | undefined;
  var __VOIBI_EMPRESA_INFO_CACHE__: Map<string, EmpresaInfo> | undefined;
}

if (!globalThis.__VOIBI_API_LOGS__) {
  globalThis.__VOIBI_API_LOGS__ = [];
}

if (!globalThis.__VOIBI_API_KEY_CACHE__) {
  globalThis.__VOIBI_API_KEY_CACHE__ = new Map<string, string>();
}

if (!globalThis.__VOIBI_EMPRESA_INFO_CACHE__) {
  globalThis.__VOIBI_EMPRESA_INFO_CACHE__ = new Map<string, EmpresaInfo>();
}

export function cacheApiKeyEmpresa(apiKey: string, empresaId: string, nome?: string, slug?: string) {
  if (globalThis.__VOIBI_API_KEY_CACHE__) {
    globalThis.__VOIBI_API_KEY_CACHE__.set(apiKey, empresaId);
  }
  if (nome && globalThis.__VOIBI_EMPRESA_INFO_CACHE__) {
    globalThis.__VOIBI_EMPRESA_INFO_CACHE__.set(empresaId, { id: empresaId, nome, slug: slug || '' });
  }
}

export function cacheEmpresaInfo(empresa: EmpresaInfo) {
  if (globalThis.__VOIBI_EMPRESA_INFO_CACHE__) {
    globalThis.__VOIBI_EMPRESA_INFO_CACHE__.set(empresa.id, empresa);
  }
}

export function getCachedEmpresaId(apiKey: string): string | undefined {
  return globalThis.__VOIBI_API_KEY_CACHE__?.get(apiKey);
}

export function getCachedEmpresaInfo(empresaId: string): EmpresaInfo | undefined {
  return globalThis.__VOIBI_EMPRESA_INFO_CACHE__?.get(empresaId);
}

export function invalidateApiKeyCache(oldApiKey?: string) {
  if (globalThis.__VOIBI_API_KEY_CACHE__) {
    if (oldApiKey) {
      globalThis.__VOIBI_API_KEY_CACHE__.delete(oldApiKey);
    } else {
      globalThis.__VOIBI_API_KEY_CACHE__.clear();
    }
  }
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
  empresa_nome?: string | null;
  empresa_slug?: string | null;
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
  const empresaId = logData.empresa_id || null;
  let empresaNome = logData.empresa_nome || null;
  let empresaSlug = logData.empresa_slug || null;

  if (empresaId && (!empresaNome || !empresaSlug)) {
    const cached = getCachedEmpresaInfo(empresaId);
    if (cached) {
      if (!empresaNome) empresaNome = cached.nome;
      if (!empresaSlug) empresaSlug = cached.slug;
    }
  }

  const entry: ApiLogEntry = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    empresa_id: empresaId,
    empresa_nome: empresaNome,
    empresa_slug: empresaSlug,
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
  if (memoryLogs.length > 500) {
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

  // Informações de cache da empresa para enriquecer os logs
  let empInfo = getCachedEmpresaInfo(empresaId);

  try {
    // Busca dados no Supabase com join em agend_empresas para obter o nome e slug da empresa
    let { data, error } = await supabase
      .from('agend_api_logs')
      .select('*, agend_empresas(id, nome, slug)')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Fallback sem join caso a foreign key na tabela não esteja com o relacionamento mapeado no PostgREST
    if (error) {
      const fallbackRes = await supabase
        .from('agend_api_logs')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(limit);
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (!error && data && data.length > 0) {
      if (!empInfo) {
        const { data: empData } = await supabase
          .from('agend_empresas')
          .select('nome, slug')
          .eq('id', empresaId)
          .maybeSingle();
        if (empData) {
          empInfo = { id: empresaId, nome: empData.nome, slug: empData.slug };
          cacheEmpresaInfo(empInfo);
        }
      }

      return data.map((item: any) => ({
        id: item.id,
        empresa_id: item.empresa_id,
        empresa_nome: item.agend_empresas?.nome || empInfo?.nome || null,
        empresa_slug: item.agend_empresas?.slug || empInfo?.slug || null,
        metodo: item.metodo,
        endpoint: item.endpoint,
        status_code: item.status_code,
        ip: item.ip,
        user_agent: item.user_agent,
        duracao_ms: item.duracao_ms,
        request_headers: item.request_headers,
        request_body: item.request_body,
        response_body: item.response_body,
        erro: item.erro,
        created_at: item.created_at,
      })) as ApiLogEntry[];
    }
  } catch {
    // Tabela agend_api_logs pode não existir ainda
  }

  // Fallback: Retorna do buffer de memória filtrado ESTRITAMENTE pela empresa solicitada
  if (!empInfo) {
    try {
      const { data: empData } = await supabase
        .from('agend_empresas')
        .select('nome, slug')
        .eq('id', empresaId)
        .maybeSingle();
      if (empData) {
        empInfo = { id: empresaId, nome: empData.nome, slug: empData.slug };
        cacheEmpresaInfo(empInfo);
      }
    } catch {
      // Ignora erro
    }
  }

  const memoryLogs = globalThis.__VOIBI_API_LOGS__ || [];
  return memoryLogs
    .filter(log => log.empresa_id === empresaId)
    .slice(0, limit)
    .map(log => ({
      ...log,
      empresa_nome: log.empresa_nome || empInfo?.nome || null,
      empresa_slug: log.empresa_slug || empInfo?.slug || null,
    }));
}

export async function clearApiLogs(empresaId: string): Promise<boolean> {
  // Limpa da memória estritamente os logs desta empresa
  if (globalThis.__VOIBI_API_LOGS__) {
    globalThis.__VOIBI_API_LOGS__ = globalThis.__VOIBI_API_LOGS__.filter(
      log => log.empresa_id !== empresaId
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

    // Tenta identificar empresa_id pela API Key informada no Authorization ou headers/params alternativos
    let empresaId: string | null = null;
    let empresaNome: string | null = null;
    let empresaSlug: string | null = null;
    let token: string | null = null;

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const trimmed = authHeader.trim();
      token = /^bearer\s+/i.test(trimmed) ? trimmed.replace(/^bearer\s+/i, '').trim() : trimmed;
    }
    if (!token) {
      token = request.headers.get('x-api-key') || 
              request.headers.get('apikey') || 
              request.headers.get('x-empresa-api-key') ||
              url.searchParams.get('api_key') || 
              url.searchParams.get('apiKey') ||
              url.searchParams.get('token') ||
              url.searchParams.get('key');
    }

    if (token) {
      const cachedId = getCachedEmpresaId(token);
      if (cachedId) {
        empresaId = cachedId;
        const info = getCachedEmpresaInfo(cachedId);
        if (info) {
          empresaNome = info.nome;
          empresaSlug = info.slug;
        }
      } else {
        try {
          const supabase = getServiceSupabase();
          if (process.env.NODE_ENV !== 'production' && token === 'sk_test_voibi_1234567890abcdef') {
            const { data: firstEmp } = await supabase
              .from('agend_empresas')
              .select('id, nome, slug')
              .limit(1)
              .maybeSingle();
            if (firstEmp) {
              empresaId = firstEmp.id;
              empresaNome = firstEmp.nome;
              empresaSlug = firstEmp.slug;
              cacheApiKeyEmpresa(token, firstEmp.id, firstEmp.nome, firstEmp.slug);
            }
          } else {
            const { data: emp } = await supabase
              .from('agend_empresas')
              .select('id, nome, slug')
              .eq('api_key', token)
              .maybeSingle();
            if (emp) {
              empresaId = emp.id;
              empresaNome = emp.nome;
              empresaSlug = emp.slug;
              cacheApiKeyEmpresa(token, emp.id, emp.nome, emp.slug);
            }
          }
        } catch {
          // Ignora
        }
      }
    }

    // Tenta identificar via header direto ou parâmetros de URL ou body se ainda não identificado
    if (!empresaId) {
      const headerEmpresaId = request.headers.get('x-empresa-id') || request.headers.get('x-company-id');
      const paramEmpresaId = url.searchParams.get('empresa_id') || url.searchParams.get('empresaId');
      const bodyEmpresaId = requestBody?.empresa_id || requestBody?.empresaId;
      const candidateId = headerEmpresaId || paramEmpresaId || bodyEmpresaId;
      if (candidateId && typeof candidateId === 'string' && candidateId.length > 5) {
        empresaId = candidateId;
      }
    }

    let response: NextResponse;
    let responseBody: any = null;
    let erro: string | null = null;

    try {
      response = await handler(request, ...rest);

      // Se o handler autenticou a empresa e a guardou no request
      const reqAny = request as any;
      if (!empresaId && reqAny.__empresaId) {
        empresaId = reqAny.__empresaId;
      }
      if (!empresaNome && reqAny.__empresaNome) {
        empresaNome = reqAny.__empresaNome;
      }
      if (!empresaSlug && reqAny.__empresaSlug) {
        empresaSlug = reqAny.__empresaSlug;
      }
      if (!empresaId && response.headers.get('x-empresa-id')) {
        empresaId = response.headers.get('x-empresa-id');
      }
      
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

    // Se identificamos o ID mas ainda não temos os dados da empresa, busca no cache
    if (empresaId && (!empresaNome || !empresaSlug)) {
      const cached = getCachedEmpresaInfo(empresaId);
      if (cached) {
        if (!empresaNome) empresaNome = cached.nome;
        if (!empresaSlug) empresaSlug = cached.slug;
      }
    }

    // Registra o log de forma não-bloqueante
    recordApiLog({
      empresa_id: empresaId,
      empresa_nome: empresaNome,
      empresa_slug: empresaSlug,
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
