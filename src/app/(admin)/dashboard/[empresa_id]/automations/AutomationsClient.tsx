'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Key, Copy, Check, Link2, Code, Zap, Bell, Plus, Trash2, Edit2, 
  MessageSquare, Clock, ArrowRight, Activity, Bot, Cpu, Layers, 
  ExternalLink, Globe, Terminal, FileCode, Sparkles, Play, Send, 
  Calendar, UserCheck, XCircle, CheckCircle2, AlertCircle, Filter, 
  Search, CheckCircle, RefreshCw
} from 'lucide-react';
import LogsViewer from './LogsViewer';
import ApiKeyManager from './ApiKeyManager';

interface LembreteRegra {
  id: string;
  nome: string;
  minutos_antes: number;
  mensagem_template: string;
  ativo: boolean;
  empresa_id?: string;
}

export default function AutomationsClient({ 
  apiKey: initialApiKey, 
  webhookUrl: initialWebhookUrl, 
  updateWebhook,
  regenerateApiKey,
  empresa_id,
  initialLembretes = [],
  saveLembreteAction,
  deleteLembreteAction,
  toggleLembreteAction
}: { 
  apiKey: string, 
  webhookUrl: string, 
  updateWebhook: (data: FormData) => Promise<void>,
  regenerateApiKey?: () => Promise<{ success: boolean; newApiKey?: string; error?: string }>,
  empresa_id: string,
  initialLembretes?: LembreteRegra[],
  saveLembreteAction?: (regra: any) => Promise<{ success: boolean; data?: any; error?: string }>,
  deleteLembreteAction?: (id: string) => Promise<{ success: boolean; error?: string }>,
  toggleLembreteAction?: (id: string, ativo: boolean) => Promise<{ success: boolean; error?: string }>
}) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'n8n';
  const initialSubTab = (searchParams.get('sub') as any) || 'mcp';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [currentApiKey, setCurrentApiKey] = useState(initialApiKey);
  const [apiSubTab, setApiSubTab] = useState<'mcp' | 'endpoints' | 'tools' | 'prompt'>(initialSubTab);

  useEffect(() => {
    setCurrentApiKey(initialApiKey);
  }, [initialApiKey]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
    const sub = searchParams.get('sub');
    if (sub && ['mcp', 'endpoints', 'tools', 'prompt'].includes(sub)) {
      setApiSubTab(sub as any);
    }
  }, [searchParams]);

  // Sistema universal de cópia com feedback individual
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedMap(prev => ({ ...prev, [key]: false }));
    }, 2500);
  };

  const [copied, setCopied] = useState(false);
  const [copiedN8n, setCopiedN8n] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl);

  useEffect(() => {
    if (empresa_id === 'mock-clinic') {
      const savedUrl = localStorage.getItem('voibi_mock_webhook');
      if (savedUrl) setWebhookUrl(savedUrl);
    }
  }, [empresa_id]);

  // Estados dos lembretes com persistência real
  const [lembretes, setLembretes] = useState<LembreteRegra[]>(initialLembretes);
  const [isEditingLembrete, setIsEditingLembrete] = useState<string | null>(null);
  const [formLembrete, setFormLembrete] = useState({ nome: '', tempoValor: 1, tempoUnidade: 'dias', mensagem: '' });
  const [showLembreteForm, setShowLembreteForm] = useState(false);
  const [reminderMode, setReminderMode] = useState<'mode1' | 'mode2'>('mode1');
  const [isSavingRule, setIsSavingRule] = useState(false);

  // Teste ao vivo da API de Lembretes
  const [testReminderLoading, setTestReminderLoading] = useState(false);
  const [testReminderResult, setTestReminderResult] = useState<any | null>(null);

  useEffect(() => {
    if (initialLembretes && initialLembretes.length > 0) {
      setLembretes(initialLembretes);
    }
  }, [initialLembretes]);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveWebhook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    const newUrl = fd.get('webhook_url') as string;

    if (empresa_id === 'mock-clinic') {
      localStorage.setItem('voibi_mock_webhook', newUrl);
      alert('Webhook salvo no ambiente de testes!');
      setWebhookUrl(newUrl);
    } else {
      await updateWebhook(fd);
    }
    
    setIsPending(false);
  };

  const calcularMinutos = (valor: number, unidade: string) => unidade === 'dias' ? valor * 1440 : valor * 60;
  
  const handleSaveLembrete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRule(true);
    const minutos = calcularMinutos(formLembrete.tempoValor, formLembrete.tempoUnidade);
    
    if (saveLembreteAction) {
      const payload: any = {
        nome: formLembrete.nome,
        minutos_antes: minutos,
        mensagem_template: formLembrete.mensagem,
        ativo: true
      };
      if (isEditingLembrete) {
        payload.id = isEditingLembrete;
      }
      const res = await saveLembreteAction(payload);
      if (res.success && res.data) {
        if (isEditingLembrete) {
          setLembretes(prev => prev.map(l => l.id === isEditingLembrete ? res.data : l));
        } else {
          setLembretes(prev => [...prev, res.data]);
        }
      }
    } else {
      if (isEditingLembrete) {
        setLembretes(lembretes.map(l => l.id === isEditingLembrete ? {
          ...l, nome: formLembrete.nome, minutos_antes: minutos, mensagem_template: formLembrete.mensagem
        } : l));
      } else {
        setLembretes([...lembretes, {
          id: Date.now().toString(), nome: formLembrete.nome, minutos_antes: minutos, mensagem_template: formLembrete.mensagem, ativo: true
        }]);
      }
    }
    
    setIsSavingRule(false);
    setShowLembreteForm(false);
    setIsEditingLembrete(null);
    setFormLembrete({ nome: '', tempoValor: 1, tempoUnidade: 'dias', mensagem: '' });
  };

  const startEditLembrete = (l: LembreteRegra) => {
    const isDias = l.minutos_antes >= 1440 && l.minutos_antes % 1440 === 0;
    setFormLembrete({
      nome: l.nome,
      tempoValor: isDias ? l.minutos_antes / 1440 : Math.floor(l.minutos_antes / 60),
      tempoUnidade: isDias ? 'dias' : 'horas',
      mensagem: l.mensagem_template
    });
    setIsEditingLembrete(l.id);
    setShowLembreteForm(true);
  };

  const deleteLembrete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta regra de lembrete?')) {
      if (deleteLembreteAction) {
        await deleteLembreteAction(id);
      }
      setLembretes(prev => prev.filter(l => l.id !== id));
    }
  };

  const toggleLembrete = async (id: string) => {
    const item = lembretes.find(l => l.id === id);
    if (!item) return;
    const novoStatus = !item.ativo;
    setLembretes(prev => prev.map(l => l.id === id ? { ...l, ativo: novoStatus } : l));
    if (toggleLembreteAction) {
      await toggleLembreteAction(id, novoStatus);
    }
  };

  const [originUrl, setOriginUrl] = useState('https://agenda.voibi.com.br');
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      setOriginUrl(window.location.origin);
    }
  }, []);

  // Testar busca de lembretes ao vivo
  const runTestReminder = async () => {
    setTestReminderLoading(true);
    setTestReminderResult(null);
    try {
      const res = await fetch(`${originUrl}/api/v1/lembretes/pendentes?marcar_enviado=false&horas_futuras=72`, {
        headers: {
          'Authorization': `Bearer ${currentApiKey}`
        }
      });
      const data = await res.json();
      setTestReminderResult({ ok: res.ok, status: res.status, data });
    } catch (err: any) {
      setTestReminderResult({ ok: false, error: err.message || 'Falha na conexão' });
    } finally {
      setTestReminderLoading(false);
    }
  };

  // MCP Connectors
  const [mcpConnectMode, setMcpConnectMode] = useState<'claude_url' | 'claude_json' | 'claude_cli' | 'chatgpt'>('claude_url');
  const mcpUrlWithKey = `${originUrl}/api/mcp?apiKey=${currentApiKey}`;
  const mcpUrlClean = `${originUrl}/api/mcp`;
  const claudeCodeCliCommand = `claude mcp add --transport http voibi_agenda ${originUrl}/api/mcp --header "Authorization: Bearer ${currentApiKey}"`;

  const mcpConfigSnippet = JSON.stringify({
    mcpServers: {
      voibi_agenda: {
        type: "http",
        url: `${originUrl}/api/mcp`,
        headers: {
          Authorization: `Bearer ${currentApiKey}`
        }
      }
    }
  }, null, 2);

  // Tools JSON para IAs
  const aiToolsJson = JSON.stringify([
    {
      "name": "consultar_servicos",
      "description": "Retorna os procedimentos e serviços oferecidos pela clínica, duração e regras.",
      "parameters": {
        "type": "object",
        "properties": {
          "profissional_id": {
            "type": "string",
            "description": "UUID opcional do profissional para filtrar apenas seus serviços."
          }
        }
      }
    },
    {
      "name": "consultar_profissionais",
      "description": "Retorna a lista de médicos, especialistas ou agendas da clínica.",
      "parameters": {
        "type": "object",
        "properties": {}
      }
    },
    {
      "name": "consultar_horarios_disponiveis",
      "description": "Consulta os horários livres disponíveis para atendimento em uma data específica.",
      "parameters": {
        "type": "object",
        "properties": {
          "date": {
            "type": "string",
            "description": "Data no formato AAAA-MM-DD (ex: 2026-10-17)"
          },
          "event_type_id": {
            "type": "string",
            "description": "UUID do procedimento/serviço desejado"
          },
          "profissional_id": {
            "type": "string",
            "description": "UUID opcional do profissional preferido"
          }
        },
        "required": ["date"]
      }
    },
    {
      "name": "criar_agendamento",
      "description": "Cria e confirma uma nova consulta/agendamento na agenda da clínica.",
      "parameters": {
        "type": "object",
        "properties": {
          "inicio": {
            "type": "string",
            "description": "Data e hora ISO 8601 de início (ex: 2026-10-17T09:00:00Z)"
          },
          "nome": {
            "type": "string",
            "description": "Nome completo do paciente"
          },
          "telefone": {
            "type": "string",
            "description": "WhatsApp ou telefone com DDD do paciente (ex: 11999998888)"
          },
          "email": {
            "type": "string",
            "description": "E-mail do paciente (opcional)"
          },
          "event_type_id": {
            "type": "string",
            "description": "UUID do procedimento selecionado"
          },
          "profissional_id": {
            "type": "string",
            "description": "UUID do profissional (opcional)"
          },
          "observacao": {
            "type": "string",
            "description": "Observações do agendamento ou sintomas relatados"
          }
        },
        "required": ["inicio", "nome", "telefone"]
      }
    },
    {
      "name": "consultar_agendamentos_cliente",
      "description": "Busca consultas ativas do paciente pelo número de telefone ou e-mail.",
      "parameters": {
        "type": "object",
        "properties": {
          "telefone": {
            "type": "string",
            "description": "Telefone ou WhatsApp do paciente (ex: 11999998888)"
          },
          "email": {
            "type": "string",
            "description": "E-mail do paciente (opcional)"
          },
          "status": {
            "type": "string",
            "description": "Status dos agendamentos (padrão: 'confirmado')",
            "enum": ["confirmado", "cancelado", "all"]
          }
        },
        "required": ["telefone"]
      }
    },
    {
      "name": "cancelar_agendamento",
      "description": "Cancela um agendamento existente pelo seu ID.",
      "parameters": {
        "type": "object",
        "properties": {
          "booking_id": {
            "type": "string",
            "description": "UUID do agendamento a ser cancelado"
          },
          "motivo": {
            "type": "string",
            "description": "Motivo informado pelo paciente para o cancelamento"
          }
        },
        "required": ["booking_id"]
      }
    }
  ], null, 2);

  // cURLs Dinâmicos Prontos para o N8N
  const curlLembretesAuto = `curl -X GET "${originUrl}/api/v1/lembretes/pendentes?marcar_enviado=true&formato=array" \\
  -H "Authorization: Bearer ${currentApiKey}"`;

  const curlLembretesManualGet = `curl -X GET "${originUrl}/api/v1/lembretes/pendentes?formato=array" \\
  -H "Authorization: Bearer ${currentApiKey}"`;

  const curlLembretesManualConfirm = `curl -X POST "${originUrl}/api/v1/lembretes/confirmar" \\
  -H "Authorization: Bearer ${currentApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "booking_id": "{{ $json.booking_id }}",
    "regra_id": "{{ $json.regra_id }}"
  }'`;

  // Catálogo completo de Rotas REST com cURLs prontos
  const restEndpoints = [
    {
      id: 'lembretes_pendentes',
      method: 'GET',
      path: '/api/v1/lembretes/pendentes',
      title: 'Buscar Lembretes Pendentes (WhatsApp)',
      category: 'lembretes',
      badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800',
      description: 'Retorna todas as mensagens de lembrete que devem ser enviadas neste momento com base nas regras ativas. Com ?marcar_enviado=true, já registra o envio para não duplicar.',
      params: '?marcar_enviado=true (recomendado no n8n) &formato=array (divide em itens no N8N)',
      curl: `curl -X GET "${originUrl}/api/v1/lembretes/pendentes?marcar_enviado=true&formato=array" \\
  -H "Authorization: Bearer ${currentApiKey}"`,
      n8nTip: 'Com &formato=array, o N8N desmembra cada paciente automaticamente em um item separado, executando o nó seguinte para cada um!'
    },
    {
      id: 'lembretes_confirmar',
      method: 'POST',
      path: '/api/v1/lembretes/confirmar',
      title: 'Confirmar Envio Manual de Lembrete',
      category: 'lembretes',
      badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800',
      description: 'Marca um agendamento como notificado para uma regra específica. Ideal para quem usa confirmação em 2 passos após o WhatsApp responder status 200.',
      params: 'Body JSON com booking_id e regra_id',
      curl: `curl -X POST "${originUrl}/api/v1/lembretes/confirmar" \\
  -H "Authorization: Bearer ${currentApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "booking_id": "UUID_DO_AGENDAMENTO",
    "regra_id": "UUID_DA_REGRA"
  }'`,
      n8nTip: 'Coloque após o nó de envio do WhatsApp, usando {{ $json.booking_id }} e {{ $json.regra_id }}.'
    },
    {
      id: 'availability',
      method: 'GET',
      path: '/api/v1/availability',
      title: 'Consultar Horários Livres (Disponibilidade)',
      category: 'agendamento',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
      description: 'Retorna a lista de horários livres disponíveis em uma data para a IA ou cliente escolher.',
      params: '?date=2026-10-17 (obrigatório), &event_type_id=... (opcional), &profissional_id=... (opcional)',
      curl: `curl -X GET "${originUrl}/api/v1/availability?date=2026-10-17" \\
  -H "Authorization: Bearer ${currentApiKey}"`,
      n8nTip: 'Retorna array available_times: ["08:00", "09:00", "14:30"] para ofertar no chat.'
    },
    {
      id: 'bookings_post',
      method: 'POST',
      path: '/api/v1/bookings',
      title: 'Criar Novo Agendamento',
      category: 'agendamento',
      badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-800',
      description: 'Cria uma nova consulta confirmada na agenda, criando ou associando o paciente automaticamente pelo telefone.',
      params: 'Body JSON com inicio (ISO 8601), nome, telefone, event_type_id e observacao',
      curl: `curl -X POST "${originUrl}/api/v1/bookings" \\
  -H "Authorization: Bearer ${currentApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "inicio": "2026-10-17T09:00:00Z",
    "nome": "João da Silva",
    "telefone": "11999998888",
    "observacao": "Agendado via N8N"
  }'`,
      n8nTip: 'Dispara automaticamente o webhook de notificação configurado na Voibi.'
    },
    {
      id: 'bookings_get',
      method: 'GET',
      path: '/api/v1/bookings',
      title: 'Buscar Consultas do Paciente (por Telefone)',
      category: 'consulta',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-800',
      description: 'Localiza as consultas ativas de um paciente usando o telefone ou WhatsApp. Essencial antes de remarcar ou cancelar.',
      params: '?telefone=11999998888&status=confirmado',
      curl: `curl -X GET "${originUrl}/api/v1/bookings?telefone=11999998888&status=confirmado" \\
  -H "Authorization: Bearer ${currentApiKey}"`,
      n8nTip: 'Retorna a lista de consultas com os respectivos IDs para cancelamento ou remarcação.'
    },
    {
      id: 'bookings_cancel',
      method: 'POST',
      path: '/api/v1/bookings/{id}/cancel',
      title: 'Cancelar Agendamento',
      category: 'consulta',
      badgeColor: 'text-red-400 bg-red-950/60 border-red-800',
      description: 'Cancela a consulta existente pelo seu ID e libera o horário novamente na agenda.',
      params: 'POST com body {"motivo": "..."} ou DELETE /api/v1/bookings/{id}',
      curl: `curl -X POST "${originUrl}/api/v1/bookings/UUID_DO_AGENDAMENTO/cancel" \\
  -H "Authorization: Bearer ${currentApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "motivo": "Cancelamento a pedido do cliente via WhatsApp"
  }'`,
      n8nTip: 'Dispara o webhook booking.cancelled informando sistemas externos.'
    },
    {
      id: 'event_types',
      method: 'GET',
      path: '/api/v1/event-types',
      title: 'Listar Procedimentos / Serviços',
      category: 'catalogo',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800',
      description: 'Retorna todos os serviços e procedimentos oferecidos pela clínica com seus IDs e durações.',
      params: 'Nenhum',
      curl: `curl -X GET "${originUrl}/api/v1/event-types" \\
  -H "Authorization: Bearer ${currentApiKey}"`,
      n8nTip: 'Ideal para alimentar menus interativos de seleção no WhatsApp ou na IA.'
    },
    {
      id: 'agendas',
      method: 'GET',
      path: '/api/v1/agendas',
      title: 'Listar Profissionais / Agendas',
      category: 'catalogo',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800',
      description: 'Lista todos os profissionais, consultórios e especialistas da clínica cadastrados.',
      params: 'Nenhum',
      curl: `curl -X GET "${originUrl}/api/v1/agendas" \\
  -H "Authorization: Bearer ${currentApiKey}"`,
      n8nTip: 'Permite filtrar a disponibilidade de um médico específico.'
    },
    {
      id: 'lembretes_regras',
      method: 'GET',
      path: '/api/v1/lembretes/regras',
      title: 'Listar Regras de Lembretes',
      category: 'lembretes',
      badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800',
      description: 'Retorna as regras de lembretes configuradas na clínica (minutos de antecedência e templates).',
      params: 'Nenhum',
      curl: `curl -X GET "${originUrl}/api/v1/lembretes/regras" \\
  -H "Authorization: Bearer ${currentApiKey}"`,
      n8nTip: 'Mostra os templates cadastrados e tempos de antecedência.'
    }
  ];

  return (
    <div className="space-y-6">

      {/* Navegação de Abas Interna */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative shrink-0 flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Activity className={`w-4 h-4 ${activeTab === 'logs' ? 'animate-pulse' : ''}`} />
          Logs de Execução (API)
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative shrink-0 flex items-center gap-2 ${
            activeTab === 'api'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Code className="w-4 h-4" />
          API REST & IA Externa
        </button>
        <button
          onClick={() => setActiveTab('n8n')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative shrink-0 flex items-center gap-2 ${
            activeTab === 'n8n'
              ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Zap className="w-4 h-4" />
          Conexão N8N
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative shrink-0 flex items-center gap-2 ${
            activeTab === 'reminders'
              ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          Regras de Lembretes
        </button>
      </div>

      {/* Conteúdo: API & IA Externa */}
      {activeTab === 'api' && (
        <div className="space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Coluna Esquerda: Credenciais */}
            <div className="space-y-6">
              {/* Gerenciador de API Key com Reset/Regenerate */}
              <ApiKeyManager 
                initialApiKey={currentApiKey}
                empresa_id={empresa_id}
                onApiKeyRegenerated={(newKey) => setCurrentApiKey(newKey)}
                onRegenerateKeyAction={regenerateApiKey || (async () => ({ success: false, error: 'Ação não disponível' }))}
              />

              {/* Webhook */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Webhook de Saída (Eventos em tempo real)</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Para onde a Voibi avisa quando houver mudanças</p>
                  </div>
                </div>
                
                <form onSubmit={handleSaveWebhook} className="space-y-3">
                  <input 
                    type="url" 
                    name="webhook_url" 
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://sua-ia-ou-n8n.com/webhook"
                    className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <div className="flex justify-end">
                    <button 
                      type="submit" 
                      disabled={isPending}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isPending ? 'Salvando...' : 'Salvar Webhook'}
                    </button>
                  </div>
                </form>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 leading-relaxed">
                  Disparamos requisições POST com os eventos: <code className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">booking.created</code>, <code className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">booking.updated</code> e <code className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">booking.cancelled</code>.
                </p>
              </div>

              {/* Dica Rápida de cURL para N8N */}
              <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold text-xs">
                  <Zap className="w-4 h-4" />
                  <span>Dica N8N: Como usar o botão "Import cURL"</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  No seu N8N, adicione um nó de <strong>HTTP Request</strong>. No canto superior dele, clique no botão <strong>"Import cURL"</strong> e cole qualquer um dos comandos cURL disponíveis nas abas. O N8N configurará o método, URL, autenticação Bearer e corpo JSON automaticamente!
                </p>
              </div>
            </div>

            {/* Coluna Direita: Guia de Integração e Schemas para IA */}
            <div className="bg-zinc-900 rounded-xl p-5 shadow-sm text-zinc-300 flex flex-col">
              
              {/* Seletor de Sub-aba */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-medium">
                  <button
                    onClick={() => setApiSubTab('mcp')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                      apiSubTab === 'mcp' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    Servidor MCP
                  </button>
                  <button
                    onClick={() => setApiSubTab('endpoints')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                      apiSubTab === 'endpoints' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    Rotas HTTP (cURL)
                  </button>
                  <button
                    onClick={() => setApiSubTab('tools')}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      apiSubTab === 'tools' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Tools / Functions
                  </button>
                  <button
                    onClick={() => setApiSubTab('prompt')}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      apiSubTab === 'prompt' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Prompt Sugerido
                  </button>
                </div>
              </div>

              {/* Sub-aba 0: Servidor MCP */}
              {apiSubTab === 'mcp' && (
                <div className="space-y-4 text-xs font-sans text-zinc-300 overflow-y-auto max-h-[540px] pr-1">
                  
                  {/* Banner explicativo */}
                  <div className="bg-gradient-to-r from-orange-950/40 via-indigo-950/50 to-purple-950/40 p-4 rounded-xl border border-orange-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-orange-300 font-semibold text-sm">
                      <Bot className="w-4 h-4 text-orange-400" />
                      <span>Model Context Protocol (MCP) Oficial</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-mono border border-orange-500/30">
                        Claude Connectors & Remote MCP
                      </span>
                    </div>
                    <p className="text-zinc-300 text-xs leading-relaxed">
                      Conecte sua clínica diretamente ao <strong>Claude (Web ou Desktop)</strong>, ao <strong>Claude Code</strong> ou ao <strong>ChatGPT</strong> via protocolo oficial MCP. A IA passa a consultar horários livres, listar consultas e agendar pacientes de forma 100% autônoma.
                    </p>
                  </div>

                  {/* Seletor de Modo de Conexão MCP */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setMcpConnectMode('claude_url')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                        mcpConnectMode === 'claude_url'
                          ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-sm font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Claude (URL)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMcpConnectMode('claude_json')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                        mcpConnectMode === 'claude_json'
                          ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>Claude Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMcpConnectMode('claude_cli')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                        mcpConnectMode === 'claude_cli'
                          ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Claude Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMcpConnectMode('chatgpt')}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-medium transition-all cursor-pointer ${
                        mcpConnectMode === 'chatgpt'
                          ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>ChatGPT</span>
                    </button>
                  </div>

                  {/* MODO 1: Claude via URL */}
                  {mcpConnectMode === 'claude_url' && (
                    <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-orange-500/30">
                      <div className="space-y-0.5">
                        <h4 className="font-semibold text-zinc-100 flex items-center gap-1.5 text-sm">
                          <Sparkles className="w-4 h-4 text-orange-400" />
                          Conexão Direta no Claude via URL
                        </h4>
                        <p className="text-zinc-400 text-[11px]">
                          No Claude (Claude.ai Web ou Claude Desktop), a integração é feita através de um <strong>Conector Remoto (URL)</strong>.
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-orange-300">
                            URL do Conector MCP (Pronta com Chave de Autenticação):
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={mcpUrlWithKey}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-orange-200 focus:outline-none select-all"
                          />
                          <button
                            onClick={() => copyToClipboard('mcp_url_key', mcpUrlWithKey)}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shadow-sm cursor-pointer"
                          >
                            {copiedMap['mcp_url_key'] ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedMap['mcp_url_key'] ? 'Copiado!' : 'Copiar URL'}
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-zinc-900/70 rounded-lg border border-zinc-800/80 space-y-2 mt-2">
                        <div className="text-[11px] font-medium text-zinc-300">
                          Caso o Claude solicite URL e Chave/Token em campos separados:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="space-y-1">
                            <span className="text-zinc-500 text-[10px] uppercase font-mono">URL Limpa:</span>
                            <div className="flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded border border-zinc-800">
                              <span className="font-mono text-zinc-300 truncate flex-1 text-[10px]">{mcpUrlClean}</span>
                              <button
                                onClick={() => copyToClipboard('mcp_url_clean', mcpUrlClean)}
                                className="text-orange-400 hover:text-orange-300 text-[10px] underline cursor-pointer px-1"
                              >
                                {copiedMap['mcp_url_clean'] ? 'Copiado' : 'Copiar'}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-zinc-500 text-[10px] uppercase font-mono">Chave de API (Bearer Token):</span>
                            <div className="flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded border border-zinc-800">
                              <span className="font-mono text-zinc-300 truncate flex-1 text-[10px]">
                                {currentApiKey.slice(0, 8)}...{currentApiKey.slice(-6)}
                              </span>
                              <button
                                onClick={() => copyToClipboard('api_key_short', currentApiKey)}
                                className="text-orange-400 hover:text-orange-300 text-[10px] underline cursor-pointer px-1"
                              >
                                {copiedMap['api_key_short'] ? 'Copiado' : 'Copiar'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODO 2: Claude Desktop (JSON) */}
                  {mcpConnectMode === 'claude_json' && (
                    <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                          Configuração para Claude Desktop (<code className="text-indigo-300 font-mono">claude_desktop_config.json</code>)
                        </label>
                        <button
                          onClick={() => copyToClipboard('mcp_json', mcpConfigSnippet)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer flex items-center gap-1"
                        >
                          {copiedMap['mcp_json'] ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedMap['mcp_json'] ? 'Copiado!' : 'Copiar JSON'}
                        </button>
                      </div>
                      <pre className="bg-zinc-900 p-3.5 rounded-xl border border-zinc-800 text-[11px] font-mono text-indigo-200 select-all overflow-x-auto leading-relaxed">
                        {mcpConfigSnippet}
                      </pre>
                    </div>
                  )}

                  {/* MODO 3: Claude Code CLI */}
                  {mcpConnectMode === 'claude_cli' && (
                    <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-zinc-300" />
                          Comando para Terminal Claude Code CLI
                        </label>
                        <button
                          onClick={() => copyToClipboard('mcp_cli', claudeCodeCliCommand)}
                          className="text-[11px] text-zinc-300 hover:text-white underline cursor-pointer flex items-center gap-1"
                        >
                          {copiedMap['mcp_cli'] ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedMap['mcp_cli'] ? 'Copiado!' : 'Copiar comando'}
                        </button>
                      </div>
                      <pre className="bg-zinc-900 p-3.5 rounded-xl border border-zinc-800 text-[11px] font-mono text-zinc-200 select-all overflow-x-auto leading-relaxed">
                        {claudeCodeCliCommand}
                      </pre>
                    </div>
                  )}

                  {/* MODO 4: ChatGPT */}
                  {mcpConnectMode === 'chatgpt' && (
                    <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                      <div className="font-semibold text-zinc-200 flex items-center gap-1.5 text-sm">
                        <Bot className="w-4 h-4 text-emerald-400" />
                        Conectar ao ChatGPT (Custom GPTs / Actions)
                      </div>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        No painel de criação do seu GPT (ChatGPT Plus/Team/Enterprise), vá em <strong>Configure ➔ Actions ➔ Create new action</strong>. Selecione <strong>Authentication ➔ Bearer</strong> e cole sua Chave de API.
                      </p>
                    </div>
                  )}

                  {/* Catálogo MCP */}
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-[11px] text-zinc-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      8 Ferramentas nativas ativas no Servidor MCP:
                    </h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                        <div className="text-indigo-400 font-bold">voibi_check_availability</div>
                        <div className="text-zinc-400 font-sans text-[10px] mt-0.5">Consulta horários livres em datas específicas</div>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                        <div className="text-emerald-400 font-bold">voibi_list_bookings</div>
                        <div className="text-zinc-400 font-sans text-[10px] mt-0.5">Lista consultas para envio de confirmações</div>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                        <div className="text-blue-400 font-bold">voibi_create_booking</div>
                        <div className="text-zinc-400 font-sans text-[10px] mt-0.5">Cria novos agendamentos na clínica</div>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                        <div className="text-amber-400 font-bold">voibi_update_booking</div>
                        <div className="text-zinc-400 font-sans text-[10px] mt-0.5">Atualiza status, observação ou horário</div>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                        <div className="text-rose-400 font-bold">voibi_cancel_booking</div>
                        <div className="text-zinc-400 font-sans text-[10px] mt-0.5">Cancela consultas e notifica via Webhook</div>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                        <div className="text-purple-400 font-bold">voibi_list_agendas</div>
                        <div className="text-zinc-400 font-sans text-[10px] mt-0.5">Lista profissionais e consultórios</div>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                        <div className="text-teal-400 font-bold">voibi_list_event_types</div>
                        <div className="text-zinc-400 font-sans text-[10px] mt-0.5">Lista procedimentos, durações e regras</div>
                      </div>
                      <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                        <div className="text-cyan-400 font-bold">voibi_get_booking</div>
                        <div className="text-zinc-400 font-sans text-[10px] mt-0.5">Obtém detalhes de um agendamento por ID</div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Sub-aba 1: Rotas HTTP (REST) com cURLs Prontos */}
              {apiSubTab === 'endpoints' && (
                <div className="space-y-4 text-xs overflow-y-auto max-h-[540px] pr-1">
                  
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex items-center justify-between text-zinc-300">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-blue-400" />
                      <span className="font-semibold text-xs text-zinc-200">Biblioteca de cURLs (Prontos para Importar no N8N)</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">{restEndpoints.length} endpoints</span>
                  </div>

                  {restEndpoints.map((ep) => (
                    <div key={ep.id} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2.5 transition-all hover:border-zinc-700">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${ep.badgeColor}`}>
                            {ep.method}
                          </span>
                          <span className="font-mono font-bold text-zinc-200 text-xs">{ep.path}</span>
                        </div>
                        <span className="text-[11px] text-zinc-400 font-medium">{ep.title}</span>
                      </div>

                      <p className="text-zinc-400 font-sans text-xs leading-relaxed">
                        {ep.description}
                      </p>

                      {/* Caixa de cURL com Botão de Cópia 1-Click */}
                      <div className="relative group">
                        <pre className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre select-all leading-relaxed pr-24">
                          {ep.curl}
                        </pre>
                        <button
                          onClick={() => copyToClipboard(ep.id, ep.curl)}
                          className={`absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-sans transition-all shadow-sm cursor-pointer ${
                            copiedMap[ep.id]
                              ? 'bg-green-600 text-white'
                              : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          {copiedMap[ep.id] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedMap[ep.id] ? 'Copiado!' : 'Copiar cURL'}
                        </button>
                      </div>

                      {ep.n8nTip && (
                        <div className="flex items-start gap-1.5 text-[11px] text-zinc-400 font-sans bg-zinc-900/60 p-2 rounded border border-zinc-800/80">
                          <Zap className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                          <span><strong>Dica N8N:</strong> {ep.n8nTip}</span>
                        </div>
                      )}
                    </div>
                  ))}

                </div>
              )}

              {/* Sub-aba 2: Tools JSON para IA */}
              {apiSubTab === 'tools' && (
                <div className="space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-400 font-sans">
                      Cole este JSON diretamente no seu nó de <strong>Agent no N8N</strong>, <strong>OpenAI Assistants</strong>, <strong>Claude Tools</strong> ou <strong>Flowise/Typebot</strong>:
                    </p>
                    <button
                      onClick={() => copyToClipboard('ai_tools', aiToolsJson)}
                      className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-md transition-colors font-mono cursor-pointer"
                    >
                      {copiedMap['ai_tools'] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedMap['ai_tools'] ? 'Copiado!' : 'Copiar JSON'}
                    </button>
                  </div>
                  <pre className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-[11px] font-mono text-blue-300 overflow-y-auto max-h-[460px] flex-1 select-all leading-relaxed">
                    {aiToolsJson}
                  </pre>
                </div>
              )}

              {/* Sub-aba 3: Prompt Sugerido */}
              {apiSubTab === 'prompt' && (
                <div className="space-y-3 text-xs font-sans text-zinc-300 overflow-y-auto max-h-[500px]">
                  <p className="text-zinc-400">
                    Instrução com o formato de disparo <code className="text-amber-300 font-mono">[HTTP_REQUEST:...]</code> pronto para o robô:
                  </p>
                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed select-all">
{`Você é a atendente virtual da clínica. Seu papel é consultar horários, agendar e cancelar consultas.
Sempre que precisar executar uma ação no sistema, responda EXATAMENTE com a tag [HTTP_REQUEST:{...}] correspondente.

REGRAS DE COMUNICAÇÃO HTTP:
Domínio base: ${originUrl}
Headers padrão: {"Authorization": "Bearer ${currentApiKey}", "Content-Type": "application/json"}

COMO DISPARAR CADA AÇÃO:

1. CONSULTAR HORÁRIOS LIVRES DE UM DIA:
Quando o paciente quiser saber horários para uma data (ex: 2026-10-17):
[HTTP_REQUEST:{"method":"GET","url":"${originUrl}/api/v1/availability?date=2026-10-17","headers":{"Authorization":"Bearer ${currentApiKey}"}}]

2. CRIAR NOVO AGENDAMENTO:
Quando o paciente confirmar o horário (ex: 09:00), nome e telefone:
[HTTP_REQUEST:{"method":"POST","url":"${originUrl}/api/v1/bookings","headers":{"Authorization":"Bearer ${currentApiKey}","Content-Type":"application/json"},"body":{"inicio":"2026-10-17T09:00:00Z","nome":"Nome do Paciente","telefone":"11999999999","observacao":"Agendado pela IA"}}]

3. BUSCAR CONSULTAS DO PACIENTE (PARA CANCELAR OU REMARCAR):
Quando o paciente disser que quer cancelar ou consultar:
[HTTP_REQUEST:{"method":"GET","url":"${originUrl}/api/v1/bookings?telefone=11999999999&status=confirmado","headers":{"Authorization":"Bearer ${currentApiKey}"}}]

4. CANCELAR O AGENDAMENTO:
Após localizar o ID da consulta e o paciente confirmar o cancelamento:
[HTTP_REQUEST:{"method":"POST","url":"${originUrl}/api/v1/bookings/ID_DO_AGENDAMENTO/cancel","headers":{"Authorization":"Bearer ${currentApiKey}","Content-Type":"application/json"},"body":{"motivo":"Pedido do cliente"}}]

5. LISTAR PROCEDIMENTOS/SERVIÇOS:
[HTTP_REQUEST:{"method":"GET","url":"${originUrl}/api/v1/event-types","headers":{"Authorization":"Bearer ${currentApiKey}"}}]`}
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* Conteúdo: N8N */}
      {activeTab === 'n8n' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 dark:border-orange-900/50 dark:from-orange-950/20 dark:to-orange-900/10 rounded-xl p-8 shadow-sm">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 bg-white dark:bg-zinc-900 shadow-sm border border-orange-100 dark:border-orange-800 text-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Conexão Mágica com N8N</h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-2xl leading-relaxed text-sm">
                  Não perca tempo configurando manualmente. Você pode importar o workflow completo ou usar a opção <strong>"Import cURL"</strong> em qualquer nó HTTP Request do N8N para configurar URLs, Headers Bearer e JSON em 1 segundo.
                </p>
                
                <button 
                  onClick={() => {
                    const n8nNodes = [
                      {
                        "parameters": {
                          "path": "voibi-agendamentos",
                          "responseMode": "onReceived",
                          "options": {}
                        },
                        "id": "1",
                        "name": "Receber Eventos Voibi",
                        "type": "n8n-nodes-base.webhook",
                        "typeVersion": 1.1,
                        "position": [ 100, 300 ],
                        "webhookId": "voibi-webhook-magic"
                      },
                      {
                        "parameters": {
                          "rule": {
                            "interval": [
                              {
                                "field": "minutes",
                                "minutesInterval": 10
                              }
                            ]
                          }
                        },
                        "id": "2",
                        "name": "Agendador a cada 10 min",
                        "type": "n8n-nodes-base.scheduleTrigger",
                        "typeVersion": 1.2,
                        "position": [ 100, 500 ]
                      },
                      {
                        "parameters": {
                          "method": "GET",
                          "url": `${originUrl}/api/v1/lembretes/pendentes?marcar_enviado=true&formato=array`,
                          "sendHeaders": true,
                          "headerParameters": {
                            "parameters": [
                              {
                                "name": "Authorization",
                                "value": `Bearer ${currentApiKey}`
                              }
                            ]
                          },
                          "options": {}
                        },
                        "id": "3",
                        "name": "Buscar Lembretes Pendentes",
                        "type": "n8n-nodes-base.httpRequest",
                        "typeVersion": 4.2,
                        "position": [ 360, 500 ]
                      }
                    ];
                    navigator.clipboard.writeText(JSON.stringify(n8nNodes, null, 2));
                    setCopiedN8n(true);
                    setTimeout(() => setCopiedN8n(false), 3000);
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all shadow-sm cursor-pointer ${copiedN8n ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
                >
                  {copiedN8n ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copiedN8n ? 'Workflow Copiado! Cole com Ctrl+V no N8N' : 'Copiar Template N8N Completo'}
                </button>
              </div>
            </div>
          </div>

          {/* Destaque: Comandos cURL Rápidos para o nó HTTP do N8N */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg">Comandos cURL para Importar no N8N</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Clique para copiar o comando e cole direto no botão <strong>"Import cURL"</strong> do nó HTTP Request:</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono">GET</span>
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Disparo de Lembretes (1-Passo Auto)</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono truncate max-w-[280px]">/api/v1/lembretes/pendentes?marcar_enviado=true</p>
                </div>
                <button
                  onClick={() => copyToClipboard('quick_curl_reminders', curlLembretesAuto)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm"
                >
                  {copiedMap['quick_curl_reminders'] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedMap['quick_curl_reminders'] ? 'Copiado!' : 'Copiar cURL'}
                </button>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">GET</span>
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Consultar Horários Disponíveis</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono truncate max-w-[280px]">/api/v1/availability?date=YYYY-MM-DD</p>
                </div>
                <button
                  onClick={() => copyToClipboard('quick_curl_avail', `curl -X GET "${originUrl}/api/v1/availability?date=2026-10-17" -H "Authorization: Bearer ${currentApiKey}"`)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm"
                >
                  {copiedMap['quick_curl_avail'] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedMap['quick_curl_avail'] ? 'Copiado!' : 'Copiar cURL'}
                </button>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">POST</span>
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Criar Novo Agendamento</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono truncate max-w-[280px]">/api/v1/bookings</p>
                </div>
                <button
                  onClick={() => copyToClipboard('quick_curl_create', `curl -X POST "${originUrl}/api/v1/bookings" -H "Authorization: Bearer ${currentApiKey}" -H "Content-Type: application/json" -d '{"inicio":"2026-10-17T09:00:00Z","nome":"Paciente","telefone":"11999998888"}'`)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm"
                >
                  {copiedMap['quick_curl_create'] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedMap['quick_curl_create'] ? 'Copiado!' : 'Copiar cURL'}
                </button>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">GET</span>
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Buscar Agendamentos por Telefone</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono truncate max-w-[280px]">/api/v1/bookings?telefone=...</p>
                </div>
                <button
                  onClick={() => copyToClipboard('quick_curl_get_client', `curl -X GET "${originUrl}/api/v1/bookings?telefone=11999998888&status=confirmado" -H "Authorization: Bearer ${currentApiKey}"`)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm"
                >
                  {copiedMap['quick_curl_get_client'] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedMap['quick_curl_get_client'] ? 'Copiado!' : 'Copiar cURL'}
                </button>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 md:col-span-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono">GET</span>
                    <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Buscar Pacientes Faltosos (Para Reengajamento)</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono truncate max-w-[420px]">/api/v1/bookings?status_atendimento=faltou</p>
                </div>
                <button
                  onClick={() => copyToClipboard('quick_curl_faltosos', `curl -X GET "${originUrl}/api/v1/bookings?status_atendimento=faltou" -H "Authorization: Bearer ${currentApiKey}"`)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm"
                >
                  {copiedMap['quick_curl_faltosos'] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedMap['quick_curl_faltosos'] ? 'Copiado!' : 'Copiar cURL'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-lg">Notificações N8N (Webhook de Saída)</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Para onde a Voibi deve enviar avisos de novos agendamentos?</p>
              </div>
            </div>
            
            <form onSubmit={handleSaveWebhook} className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-6">
              <div className="flex flex-col sm:flex-row items-end gap-4">
                <div className="flex-1 w-full space-y-1.5">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">URL do Webhook do seu N8N</label>
                  <input 
                    type="url" 
                    name="webhook_url" 
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="Ex: https://n8n.suaclinica.com/webhook/voibi-agendamentos"
                    className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Salvando...' : 'Salvar Conexão'}
                </button>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3">
                Use a URL gerada pelo nó "Receber Eventos Voibi" (disponível no template acima) e cole aqui.
              </p>
            </form>
          </div>

        </div>
      )}

      {/* Conteúdo: Lembretes */}
      {activeTab === 'reminders' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Regras de Lembretes</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Configure mensagens automáticas para avisar seus clientes antes do agendamento.</p>
            </div>
            {!showLembreteForm && (
              <button onClick={() => setShowLembreteForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-sm">
                <Plus className="w-4 h-4" /> Novo Lembrete
              </button>
            )}
          </div>

          {showLembreteForm && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-6 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  {isEditingLembrete ? 'Editar Lembrete' : 'Criar Novo Lembrete'}
                </h4>
              </div>
              
              <form onSubmit={handleSaveLembrete} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome Interno</label>
                    <input required type="text" value={formLembrete.nome} onChange={e => setFormLembrete({...formLembrete, nome: e.target.value})} placeholder="Ex: Aviso de 2 Dias" className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Disparar Lembrete</label>
                    <div className="flex items-center gap-2">
                      <input required type="number" min="1" value={formLembrete.tempoValor} onChange={e => setFormLembrete({...formLembrete, tempoValor: parseInt(e.target.value) || 1})} className="w-20 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                      <select value={formLembrete.tempoUnidade} onChange={e => setFormLembrete({...formLembrete, tempoUnidade: e.target.value})} className="flex-1 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white dark:bg-zinc-900">
                        <option value="horas">Hora(s) antes</option>
                        <option value="dias">Dia(s) antes</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                    <span>Mensagem (WhatsApp)</span>
                    <span className="text-xs text-zinc-400">Suporta variáveis dinâmicas</span>
                  </label>
                  <textarea required value={formLembrete.mensagem} onChange={e => setFormLembrete({...formLembrete, mensagem: e.target.value})} rows={4} placeholder="Olá {{cliente_nome}}, seu agendamento..." className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"></textarea>
                  
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span onClick={() => setFormLembrete({...formLembrete, mensagem: formLembrete.mensagem + '{{cliente_nome}}'})} className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 transition-colors">{"{{cliente_nome}}"}</span>
                    <span onClick={() => setFormLembrete({...formLembrete, mensagem: formLembrete.mensagem + '{{primeiro_nome}}'})} className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 transition-colors">{"{{primeiro_nome}}"}</span>
                    <span onClick={() => setFormLembrete({...formLembrete, mensagem: formLembrete.mensagem + '{{data_hora}}'})} className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 transition-colors">{"{{data_hora}}"}</span>
                    <span onClick={() => setFormLembrete({...formLembrete, mensagem: formLembrete.mensagem + '{{profissional_nome}}'})} className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 transition-colors">{"{{profissional_nome}}"}</span>
                    <span onClick={() => setFormLembrete({...formLembrete, mensagem: formLembrete.mensagem + '{{procedimento}}'})} className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 transition-colors">{"{{procedimento}}"}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => {setShowLembreteForm(false); setIsEditingLembrete(null);}} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors cursor-pointer">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSavingRule} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm disabled:opacity-50">
                    {isSavingRule ? 'Salvando...' : 'Salvar Regra'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {!showLembreteForm && lembretes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lembretes.map(l => {
                const isDias = l.minutos_antes >= 1440 && l.minutos_antes % 1440 === 0;
                const tempoLabel = isDias ? `${l.minutos_antes / 1440} dia(s) antes` : `${Math.floor(l.minutos_antes / 60)} hora(s) antes`;

                return (
                  <div key={l.id} className={`bg-white dark:bg-zinc-900 border rounded-xl p-5 transition-all shadow-sm ${!l.ativo ? 'border-zinc-200 dark:border-zinc-700 opacity-60 bg-zinc-50 dark:bg-zinc-950' : 'border-blue-100 dark:border-zinc-700'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`font-semibold ${l.ativo ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'}`}>{l.nome}</h4>
                          {!l.ativo && <span className="text-[10px] bg-zinc-200 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase">Pausado</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 px-2 py-1 rounded-md mt-2 inline-flex font-medium">
                          <Clock className="w-3.5 h-3.5" /> {tempoLabel}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleLembrete(l.id)} className={`p-1.5 rounded-md transition-colors cursor-pointer ${l.ativo ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50' : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-950/50'}`} title={l.ativo ? "Pausar regra" : "Ativar regra"}>
                          <Zap className="w-4 h-4" />
                        </button>
                        <button onClick={() => startEditLembrete(l)} className="text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-zinc-800 p-1.5 rounded-md transition-colors cursor-pointer" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteLembrete(l.id)} className="text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-zinc-800 p-1.5 rounded-md transition-colors cursor-pointer" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-50 dark:bg-zinc-950 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800 mt-4 relative">
                      <MessageSquare className="w-4 h-4 text-zinc-300 dark:text-zinc-600 absolute top-3 right-3" />
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium whitespace-pre-wrap pr-6">{l.mensagem_template}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!showLembreteForm && lembretes.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">
              <Bell className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">Nenhum lembrete configurado</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Crie mensagens automáticas para reduzir as faltas dos seus clientes.</p>
              <button onClick={() => setShowLembreteForm(true)} className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 cursor-pointer">
                <Plus className="w-4 h-4" /> Criar o primeiro lembrete
              </button>
            </div>
          )}

          {/* PAINEL COMPLETO DE DISPARO NO N8N COM cURLS */}
          <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-200 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    Disparo Automático de Lembretes no N8N
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                      API Oficial /v1/lembretes
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Modelo de busca periódica (Pull) para enviar WhatsApp e evitar mensagens duplicadas.
                  </p>
                </div>
              </div>

              {/* Botão de Teste ao Vivo */}
              <button
                onClick={runTestReminder}
                disabled={testReminderLoading}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 text-emerald-400 ${testReminderLoading ? 'animate-spin' : ''}`} />
                {testReminderLoading ? 'Buscando...' : 'Testar Busca Agora'}
              </button>
            </div>

            {/* Resultado do Teste ao Vivo */}
            {testReminderResult && (
              <div className={`p-4 rounded-xl border text-xs font-mono animate-in fade-in duration-200 ${
                testReminderResult.ok 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
                  : 'bg-red-950/40 border-red-500/30 text-red-200'
              }`}>
                <div className="flex items-center justify-between mb-2 font-sans font-semibold">
                  <span className="flex items-center gap-1.5">
                    {testReminderResult.ok ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                    Resultado do Teste da API (Status {testReminderResult.status}):
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {testReminderResult.data?.count || 0} lembrete(s) pendente(s)
                  </span>
                </div>
                <pre className="bg-zinc-950 p-3 rounded-lg overflow-x-auto text-[11px] text-zinc-300 select-all max-h-48">
                  {JSON.stringify(testReminderResult.data, null, 2)}
                </pre>
              </div>
            )}

            {/* Alternador de Modo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setReminderMode('mode1')}
                className={`py-2 px-3 rounded-lg font-medium transition-all cursor-pointer text-left flex items-center justify-between ${
                  reminderMode === 'mode1'
                    ? 'bg-purple-600 text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <span>Modo 1: Automático em 1 Passo (Recomendado)</span>
                <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-mono">Mais Simples</span>
              </button>
              <button
                type="button"
                onClick={() => setReminderMode('mode2')}
                className={`py-2 px-3 rounded-lg font-medium transition-all cursor-pointer text-left flex items-center justify-between ${
                  reminderMode === 'mode2'
                    ? 'bg-purple-600 text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <span>Modo 2: Confirmação Manual em 2 Passos</span>
                <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-mono">Avançado</span>
              </button>
            </div>

            {/* MODO 1: Automático em 1 Passo */}
            {reminderMode === 'mode1' && (
              <div className="space-y-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-purple-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-300">
                      Comando cURL para Importar no nó HTTP Request do N8N:
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">GET com auto-confirmação</span>
                  </div>

                  <div className="relative group">
                    <pre className="bg-zinc-900 p-3.5 rounded-xl border border-zinc-800 text-xs font-mono text-purple-200 select-all overflow-x-auto leading-relaxed pr-28">
                      {curlLembretesAuto}
                    </pre>
                    <button
                      onClick={() => copyToClipboard('curl_auto_reminders', curlLembretesAuto)}
                      className={`absolute top-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer ${
                        copiedMap['curl_auto_reminders']
                          ? 'bg-green-600 text-white'
                          : 'bg-purple-600 hover:bg-purple-500 text-white'
                      }`}
                    >
                      {copiedMap['curl_auto_reminders'] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedMap['curl_auto_reminders'] ? 'Copiado!' : 'Copiar cURL'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80 space-y-1">
                      <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">1</span>
                        Schedule Trigger
                      </div>
                      <p className="text-[11px] text-zinc-400">Configure no N8N para rodar a cada 5 ou 10 minutos.</p>
                    </div>

                    <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80 space-y-1">
                      <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">2</span>
                        HTTP Request (Voibi)
                      </div>
                      <p className="text-[11px] text-zinc-400">Clique em <strong>"Import cURL"</strong> e cole o comando copiado acima.</p>
                    </div>

                    <div className="bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/80 space-y-1">
                      <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">3</span>
                        Disparo WhatsApp
                      </div>
                      <p className="text-[11px] text-zinc-400">Envie a mensagem para o número do cliente.</p>
                    </div>
                  </div>
                </div>

                {/* Mapeamento de Campos no N8N */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-purple-400" />
                      Variáveis retornadas para usar no nó HTTP do ChatVoibi / WhatsApp no N8N:
                    </h5>
                    <span className="text-[10px] text-zinc-500 font-mono">Prontas para o nó seguinte</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-zinc-500 text-[10px] uppercase font-sans">Telefone Limpo (só números):</div>
                      <div className="text-emerald-400 font-bold select-all">{'{{ $json.cliente.telefone_limpo }}'}</div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-zinc-500 text-[10px] uppercase font-sans">Nome do Paciente:</div>
                      <div className="text-amber-400 font-bold select-all">{'{{ $json.cliente.nome }}'}</div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-zinc-500 text-[10px] uppercase font-sans">Data e Hora:</div>
                      <div className="text-blue-400 font-bold select-all">{'{{ $json.data_hora }}'}</div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-zinc-500 text-[10px] uppercase font-sans">Profissional:</div>
                      <div className="text-teal-400 font-bold select-all">{'{{ $json.profissional.nome }}'}</div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-zinc-500 text-[10px] uppercase font-sans">Procedimento:</div>
                      <div className="text-rose-400 font-bold select-all">{'{{ $json.procedimento_nome }}'}</div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-zinc-500 text-[10px] uppercase font-sans">Primeiro Nome:</div>
                      <div className="text-amber-300 font-bold select-all">{'{{ $json.cliente.primeiro_nome }}'}</div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-zinc-500 text-[10px] uppercase font-sans">Mensagem Pronta (Opcional):</div>
                      <div className="text-purple-400 font-bold select-all">{'{{ $json.mensagem }}'}</div>
                    </div>
                    <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800">
                      <div className="text-zinc-500 text-[10px] uppercase font-sans">ID do Agendamento:</div>
                      <div className="text-zinc-300 font-bold select-all">{'{{ $json.booking_id }}'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MODO 2: Confirmação em 2 Passos */}
            {reminderMode === 'mode2' && (
              <div className="space-y-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">
                      Passo 1: Buscar pendentes (sem marcar ainda como enviado)
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">GET</span>
                  </div>

                  <div className="relative group">
                    <pre className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-300 select-all overflow-x-auto leading-relaxed pr-28">
                      {curlLembretesManualGet}
                    </pre>
                    <button
                      onClick={() => copyToClipboard('curl_manual_get', curlLembretesManualGet)}
                      className={`absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                        copiedMap['curl_manual_get'] ? 'bg-green-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                      }`}
                    >
                      {copiedMap['curl_manual_get'] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedMap['curl_manual_get'] ? 'Copiado!' : 'Copiar cURL'}
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">
                      Passo 2: Confirmar envio na Voibi (após o WhatsApp responder com sucesso 200)
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">POST</span>
                  </div>

                  <div className="relative group">
                    <pre className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-300 select-all overflow-x-auto leading-relaxed pr-28">
                      {curlLembretesManualConfirm}
                    </pre>
                    <button
                      onClick={() => copyToClipboard('curl_manual_post', curlLembretesManualConfirm)}
                      className={`absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                        copiedMap['curl_manual_post'] ? 'bg-green-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                      }`}
                    >
                      {copiedMap['curl_manual_post'] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedMap['curl_manual_post'] ? 'Copiado!' : 'Copiar cURL'}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* Conteúdo: Logs da API */}
      {activeTab === 'logs' && (
        <LogsViewer empresa_id={empresa_id} />
      )}

    </div>
  );
}
