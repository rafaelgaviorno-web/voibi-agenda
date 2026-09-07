'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Copy, 
  Check, 
  ChevronRight, 
  ExternalLink,
  Code2,
  Database,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  X
} from 'lucide-react';
import { ApiLogEntry } from '@/lib/api-logger';

export default function LogsViewer({ empresa_id }: { empresa_id: string }) {
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ApiLogEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'GET' | 'POST' | 'PATCH' | 'DELETE'>('all');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showSqlMigration, setShowSqlMigration] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/logs?empresa_id=${empresa_id}&limit=100`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
      }
    } catch (e) {
      console.error('Erro ao buscar logs:', e);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [empresa_id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Intervalo de Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleClearLogs = async () => {
    if (!confirm('Deseja realmente limpar todos os logs desta empresa?')) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/logs?empresa_id=${empresa_id}`, { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
        setSelectedLog(null);
      }
    } catch (e) {
      console.error('Erro ao limpar logs:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Filtragem dos logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Filtro de Status
      if (statusFilter === 'success' && (log.status_code < 200 || log.status_code >= 400)) return false;
      if (statusFilter === 'error' && (log.status_code < 400)) return false;

      // Filtro de Método
      if (methodFilter !== 'all' && log.metodo !== methodFilter) return false;

      // Busca por Texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const inEndpoint = log.endpoint.toLowerCase().includes(term);
        const inMethod = log.metodo.toLowerCase().includes(term);
        const inError = log.erro?.toLowerCase().includes(term) || false;
        const inBody = log.request_body ? JSON.stringify(log.request_body).toLowerCase().includes(term) : false;
        const inResponse = log.response_body ? JSON.stringify(log.response_body).toLowerCase().includes(term) : false;
        return inEndpoint || inMethod || inError || inBody || inResponse;
      }

      return true;
    });
  }, [logs, statusFilter, methodFilter, searchTerm]);

  // Métricas calculadas
  const metrics = useMemo(() => {
    const total = logs.length;
    if (total === 0) return { total: 0, successRate: 100, errors: 0, avgDuration: 0 };

    const errors = logs.filter(l => l.status_code >= 400).length;
    const successes = total - errors;
    const successRate = Math.round((successes / total) * 100);
    const avgDuration = Math.round(logs.reduce((acc, l) => acc + (l.duracao_ms || 0), 0) / total);

    return { total, successRate, errors, avgDuration };
  }, [logs]);

  const sqlMigrationCode = `-- Execute no Supabase SQL Editor para histórico permanente
CREATE TABLE IF NOT EXISTS agend_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES agend_empresas(id) ON DELETE CASCADE,
  metodo VARCHAR(10) NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INT NOT NULL,
  ip VARCHAR(45),
  user_agent TEXT,
  duracao_ms INT,
  request_headers JSONB,
  request_body JSONB,
  response_body JSONB,
  erro TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agend_api_logs_empresa_id ON agend_api_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agend_api_logs_created_at ON agend_api_logs(created_at DESC);`;

  return (
    <div className="space-y-6">
      {/* Top Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-pulse" />
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Monitor de Requisições HTTP (API)
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Tempo Real
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Veja com precisão cirúrgica cada requisição que a IA do WhatsApp ou integração externa envia para a sua agenda.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              autoRefresh 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' 
                : 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
            }`}
            title="Atualiza automaticamente a cada 4 segundos"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-zinc-400'}`} />
            Auto-refresh {autoRefresh ? 'Ativo' : 'Pausado'}
          </button>

          <button
            onClick={() => fetchLogs()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={() => setShowSqlMigration(!showSqlMigration)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-zinc-500" />
            Tabela no Supabase
          </button>

          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-transparent hover:border-red-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Caixa de Migration SQL se expandida */}
      {showSqlMigration && (
        <div className="bg-zinc-900 text-zinc-100 p-5 rounded-xl border border-zinc-800 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-zinc-200">Script SQL para persistência permanente no Supabase</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(sqlMigrationCode, 'sql')}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
              >
                {copiedSection === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedSection === 'sql' ? 'Copiado!' : 'Copiar SQL'}
              </button>
              <button
                onClick={() => setShowSqlMigration(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            O sistema já funciona imediatamente em tempo real pelo buffer do servidor. Caso queira manter os logs salvos para sempre no seu banco de dados Postgres do Supabase, copie o código abaixo e execute no <strong>SQL Editor</strong> do seu Supabase:
          </p>
          <pre className="text-xs bg-zinc-950 p-3 rounded-lg overflow-x-auto text-emerald-400 font-mono">
            {sqlMigrationCode}
          </pre>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total de Chamadas</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{metrics.total}</span>
            <span className="text-xs text-zinc-400">registradas</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Taxa de Sucesso (2xx)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${metrics.successRate >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {metrics.successRate}%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Erros (4xx / 5xx)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${metrics.errors > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {metrics.errors}
            </span>
            <span className="text-xs text-zinc-400">falhas</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Latência Média</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.avgDuration}</span>
            <span className="text-xs text-zinc-400">ms</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Filtrar por data, endpoint, erro ou conteúdo do JSON..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-zinc-50 dark:bg-zinc-800">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('success')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'success' ? 'bg-emerald-500 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Sucesso
            </button>
            <button
              onClick={() => setStatusFilter('error')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'error' ? 'bg-red-500 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Erros
            </button>
          </div>

          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs font-medium bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-none"
          >
            <option value="all">Todos Métodos</option>
            <option value="GET">GET (Consulta)</option>
            <option value="POST">POST (Agendamento)</option>
            <option value="PATCH">PATCH (Alteração)</option>
            <option value="DELETE">DELETE (Cancelamento)</option>
          </select>
        </div>
      </div>

      {/* Lista de Requisições */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Activity className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3 animate-pulse" />
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Nenhuma requisição encontrada
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
              Assim que a sua IA do WhatsApp ou sistema externo disparar comandos HTTP contra a API da Voibi, as chamadas com status, payloads e respostas aparecerão aqui em tempo real.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 overflow-x-auto">
            {filteredLogs.map(log => {
              const isSuccess = log.status_code >= 200 && log.status_code < 400;
              const isSelected = selectedLog?.id === log.id;
              const dateObj = new Date(log.created_at);
              const timeFormatted = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const dateFormatted = dateObj.toLocaleDateString('pt-BR');

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors ${
                    isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Badge do Status */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold shrink-0 ${
                      isSuccess 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' 
                        : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
                    }`}>
                      {isSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {log.status_code}
                    </span>

                    {/* Badge do Método */}
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono shrink-0 ${
                      log.metodo === 'GET' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' :
                      log.metodo === 'POST' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' :
                      log.metodo === 'DELETE' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300' :
                      'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                    }`}>
                      {log.metodo}
                    </span>

                    {/* Endpoint e detalhes */}
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {log.endpoint}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span>{dateFormatted} às {timeFormatted}</span>
                        <span>•</span>
                        <span>{log.duracao_ms}ms</span>
                        {log.erro && (
                          <>
                            <span>•</span>
                            <span className="text-red-600 dark:text-red-400 font-medium truncate max-w-xs">
                              {log.erro}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                      className="px-2.5 py-1 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-md transition-colors"
                    >
                      Inspecionar
                    </button>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal / Drawer de Detalhes da Requisição */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl max-h-[90vh] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header do Modal */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                  selectedLog.status_code < 400 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' 
                    : 'bg-red-50 text-red-700 border border-red-300 dark:bg-red-950 dark:text-red-300'
                }`}>
                  {selectedLog.status_code}
                </span>
                <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {selectedLog.metodo}
                </span>
                <span className="font-mono text-xs text-zinc-900 dark:text-zinc-100 truncate">
                  {selectedLog.endpoint}
                </span>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs font-sans">
              {/* Metadados rápidos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-zinc-400 text-[11px] block">Data e Hora</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {new Date(selectedLog.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 text-[11px] block">Duração</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {selectedLog.duracao_ms} ms
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 text-[11px] block">IP Origem</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate block">
                    {selectedLog.ip || 'Local / Interno'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 text-[11px] block">User-Agent</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate block" title={selectedLog.user_agent || ''}>
                    {selectedLog.user_agent || 'Não especificado'}
                  </span>
                </div>
              </div>

              {/* Se houver mensagem de erro */}
              {selectedLog.erro && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    Mensagem de Falha / Erro Retornado:
                  </div>
                  <div className="font-mono text-xs">{selectedLog.erro}</div>
                </div>
              )}

              {/* Corpo da Requisição (Request Payload) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-zinc-800 dark:text-zinc-200">
                    <ArrowDownRight className="w-4 h-4 text-blue-500" />
                    <span>Corpo Enviado pela IA (Request Body):</span>
                  </div>
                  {selectedLog.request_body && (
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog.request_body, null, 2), 'req_body')}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-[11px] text-zinc-600 dark:text-zinc-300 transition-colors"
                    >
                      {copiedSection === 'req_body' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      Copiar JSON
                    </button>
                  )}
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl text-zinc-100 font-mono text-xs overflow-x-auto max-h-56">
                  {selectedLog.request_body ? (
                    <pre className="text-blue-300 whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.request_body, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-zinc-500 italic">Nenhum corpo enviado (Requisição {selectedLog.metodo} via query params na URL).</span>
                  )}
                </div>
              </div>

              {/* Resposta Devolvida pela API (Response Body) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-zinc-800 dark:text-zinc-200">
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    <span>Resposta Devolvida ao Cliente (Response Body):</span>
                  </div>
                  {selectedLog.response_body && (
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog.response_body, null, 2), 'res_body')}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-[11px] text-zinc-600 dark:text-zinc-300 transition-colors"
                    >
                      {copiedSection === 'res_body' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      Copiar JSON
                    </button>
                  )}
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl text-zinc-100 font-mono text-xs overflow-x-auto max-h-72">
                  {selectedLog.response_body ? (
                    <pre className={`whitespace-pre-wrap ${selectedLog.status_code < 400 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {JSON.stringify(selectedLog.response_body, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-zinc-500 italic">Sem resposta JSON.</span>
                  )}
                </div>
              </div>

              {/* Headers Sanitizados */}
              <div className="space-y-2">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Headers Recebidos (Token Mascarado):
                </span>
                <div className="bg-zinc-900 p-3 rounded-xl text-zinc-300 font-mono text-[11px] overflow-x-auto max-h-36">
                  {Object.entries(selectedLog.request_headers || {}).map(([key, val]) => (
                    <div key={key} className="truncate">
                      <span className="text-zinc-400">{key}:</span> <span className="text-zinc-200">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
