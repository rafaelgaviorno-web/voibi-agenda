'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Key, Copy, Check, Link2, Code, Zap, Bell, Plus, Trash2, Edit2, MessageSquare, Clock, ArrowRight, Activity } from 'lucide-react';
import LogsViewer from './LogsViewer';

export default function AutomationsClient({ 
  apiKey, 
  webhookUrl: initialWebhookUrl, 
  updateWebhook,
  empresa_id 
}: { 
  apiKey: string, 
  webhookUrl: string, 
  updateWebhook: (data: FormData) => Promise<void>,
  empresa_id: string
}) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'n8n';
  
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

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

  // Estados dos lembretes (Mock)
  const [lembretes, setLembretes] = useState<any[]>([
    { id: '1', nome: 'Lembrete Padrão (1 Dia antes)', minutos_antes: 1440, mensagem_template: 'Olá {{cliente_nome}}, confirmando seu agendamento para o dia {{data_hora}} com {{profissional_nome}}.', ativo: true }
  ]);
  const [isEditingLembrete, setIsEditingLembrete] = useState<string | null>(null);
  const [formLembrete, setFormLembrete] = useState({ nome: '', tempoValor: 1, tempoUnidade: 'dias', mensagem: '' });
  const [showLembreteForm, setShowLembreteForm] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
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
  
  const handleSaveLembrete = (e: React.FormEvent) => {
    e.preventDefault();
    const minutos = calcularMinutos(formLembrete.tempoValor, formLembrete.tempoUnidade);
    
    if (isEditingLembrete) {
      setLembretes(lembretes.map(l => l.id === isEditingLembrete ? {
        ...l, nome: formLembrete.nome, minutos_antes: minutos, mensagem_template: formLembrete.mensagem
      } : l));
    } else {
      setLembretes([...lembretes, {
        id: Date.now().toString(), nome: formLembrete.nome, minutos_antes: minutos, mensagem_template: formLembrete.mensagem, ativo: true
      }]);
    }
    
    setShowLembreteForm(false);
    setIsEditingLembrete(null);
    setFormLembrete({ nome: '', tempoValor: 1, tempoUnidade: 'dias', mensagem: '' });
  };

  const startEditLembrete = (l: any) => {
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

  const deleteLembrete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta regra de lembrete?')) {
      setLembretes(lembretes.filter(l => l.id !== id));
    }
  };

  const toggleLembrete = (id: string) => {
    setLembretes(lembretes.map(l => l.id === id ? { ...l, ativo: !l.ativo } : l));
  };

  const [apiSubTab, setApiSubTab] = useState<'endpoints' | 'tools' | 'prompt'>('endpoints');
  const [copiedTools, setCopiedTools] = useState(false);

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
            "description": "Data no formato AAAA-MM-DD (ex: 2026-09-08)"
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
            "description": "Data e hora ISO 8601 de início (ex: 2026-09-08T09:00:00Z)"
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
            "description": "UUID do profissional (opcional, caso o serviço seja de um profissional específico)"
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
      "description": "Busca consultas ativas do paciente pelo número de telefone ou e-mail. Essencial para verificar horários antes de cancelar ou reagendar.",
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

  const handleCopyTools = () => {
    navigator.clipboard.writeText(aiToolsJson);
    setCopiedTools(true);
    setTimeout(() => setCopiedTools(false), 2500);
  };

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
          className={`pb-3 px-4 text-sm font-semibold transition-all relative shrink-0 ${
            activeTab === 'api'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          API REST & IA Externa
        </button>
        <button
          onClick={() => setActiveTab('n8n')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative shrink-0 ${
            activeTab === 'n8n'
              ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          Conexão N8N
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`pb-3 px-4 text-sm font-semibold transition-all relative shrink-0 ${
            activeTab === 'reminders'
              ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          Regras de Lembretes
        </button>
      </div>

      {/* Conteúdo: API & IA Externa */}
      {activeTab === 'api' && (
        <div className="space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Coluna Esquerda: Credenciais */}
            <div className="space-y-6">
              {/* API Key */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Chave de API (API Key)</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Passe no cabeçalho Authorization: Bearer &lt;API_KEY&gt;</p>
                  </div>
                </div>
                
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 flex items-center justify-between">
                  <code className="text-sm text-zinc-800 dark:text-zinc-200 font-mono select-all overflow-hidden text-ellipsis">{apiKey}</code>
                  <button 
                    onClick={handleCopy}
                    className="ml-3 p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:bg-zinc-800 rounded-md transition-colors flex-shrink-0"
                    title="Copiar chave"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-3 font-medium bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded border border-amber-200 dark:border-amber-800/60">
                  Esta chave dá acesso aos agendamentos e horários desta clínica. Mantenha em segurança na sua IA/Servidor.
                </p>
              </div>

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
            </div>

            {/* Coluna Direita: Guia de Integração e Schemas para IA */}
            <div className="bg-zinc-900 rounded-xl p-5 shadow-sm text-zinc-300 flex flex-col">
              
              {/* Seletor de Sub-aba */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-medium">
                  <button
                    onClick={() => setApiSubTab('endpoints')}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      apiSubTab === 'endpoints' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Rotas HTTP (REST)
                  </button>
                  <button
                    onClick={() => setApiSubTab('tools')}
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      apiSubTab === 'tools' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Tools / Functions para IA
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

                {apiSubTab === 'tools' && (
                  <button
                    onClick={handleCopyTools}
                    className="flex items-center gap-1.5 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-2.5 py-1.5 rounded-md transition-colors font-mono"
                  >
                    {copiedTools ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedTools ? 'Copiado!' : 'Copiar JSON'}
                  </button>
                )}
              </div>

              {/* Sub-aba 1: Endpoints HTTP */}
              {apiSubTab === 'endpoints' && (
                <div className="space-y-4 text-xs font-mono overflow-y-auto max-h-[500px] pr-1">
                  
                  {/* 1. Disponibilidade */}
                  <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">GET /api/v1/availability</span>
                      <span className="text-[10px] text-zinc-400 font-sans">Checar Horários</span>
                    </div>
                    <div className="text-zinc-400 font-sans text-xs">
                      Consulta os slots livres no dia para a IA oferecer ao paciente:
                    </div>
                    <div className="text-zinc-300 select-all bg-zinc-900 p-2 rounded">
                      GET https://agenda.voibi.com.br/api/v1/availability?date=2026-09-08&event_type_id={'<ID>'}
                    </div>
                    <div className="text-zinc-400 font-sans text-[11px]">
                      Retorna: <code className="text-amber-300 font-mono">available_times: ["09:00", "09:30", "10:00"]</code>
                    </div>
                  </div>

                  {/* 2. Criar Agendamento */}
                  <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-400">POST /api/v1/bookings</span>
                      <span className="text-[10px] text-zinc-400 font-sans">Fazer Agendamento</span>
                    </div>
                    <div className="text-zinc-400 font-sans text-xs">
                      Cria o agendamento em <code className="text-zinc-300">https://agenda.voibi.com.br/api/v1/bookings</code>:
                    </div>
                    <div className="text-zinc-300 select-all bg-zinc-900 p-2 rounded whitespace-pre">
{`{
  "event_type_id": "uuid-do-servico",
  "inicio": "2026-09-08T09:00:00Z",
  "nome": "João Silva",
  "telefone": "11999999999",
  "observacao": "Agendado via IA WhatsApp"
}`}
                    </div>
                  </div>

                  {/* 3. Buscar Consultas do Paciente */}
                  <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">GET /api/v1/bookings</span>
                      <span className="text-[10px] text-zinc-400 font-sans">Localizar Consulta</span>
                    </div>
                    <div className="text-zinc-400 font-sans text-xs">
                      Encontra as consultas do paciente antes de cancelar ou reagendar:
                    </div>
                    <div className="text-zinc-300 select-all bg-zinc-900 p-2 rounded">
                      GET https://agenda.voibi.com.br/api/v1/bookings?telefone=11999999999&status=confirmado
                    </div>
                  </div>

                  {/* 4. Cancelar Agendamento */}
                  <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-400">DELETE /api/v1/bookings/{'{id}'}</span>
                      <span className="text-[10px] text-zinc-400 font-sans">Cancelar</span>
                    </div>
                    <div className="text-zinc-400 font-sans text-xs">
                      Cancela a consulta (também aceita POST com final /cancel):
                    </div>
                    <div className="text-zinc-300 select-all bg-zinc-900 p-2 rounded">
                      POST https://agenda.voibi.com.br/api/v1/bookings/uuid-do-agendamento/cancel
                    </div>
                  </div>

                  {/* 5. Serviços e Profissionais */}
                  <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-400">GET /api/v1/event-types</span>
                      <span className="text-[10px] text-zinc-400 font-sans">Catálogo</span>
                    </div>
                    <div className="text-zinc-400 font-sans text-xs">
                      https://agenda.voibi.com.br/api/v1/event-types e https://agenda.voibi.com.br/api/v1/agendas
                    </div>
                  </div>

                </div>
              )}

              {/* Sub-aba 2: Tools JSON para IA */}
              {apiSubTab === 'tools' && (
                <div className="space-y-3 flex-1 flex flex-col">
                  <p className="text-xs text-zinc-400 font-sans">
                    Cole este JSON diretamente no seu nó de <strong>Agent no N8N</strong>, <strong>OpenAI Assistants</strong>, <strong>Claude Tools</strong> ou <strong>Flowise/Typebot</strong>:
                  </p>
                  <pre className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-[11px] font-mono text-blue-300 overflow-y-auto max-h-[420px] flex-1 select-all leading-relaxed">
                    {aiToolsJson}
                  </pre>
                </div>
              )}

              {/* Sub-aba 3: Prompt Sugerido */}
              {apiSubTab === 'prompt' && (
                <div className="space-y-3 text-xs font-sans text-zinc-300 overflow-y-auto max-h-[480px]">
                  <p className="text-zinc-400">
                    Instrução com o formato de disparo <code className="text-amber-300 font-mono">[HTTP_REQUEST:...]</code> pronto para o robô:
                  </p>
                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed select-all">
{`Você é a atendente virtual da clínica. Seu papel é consultar horários, agendar e cancelar consultas.
Sempre que precisar executar uma ação no sistema, responda EXATAMENTE com a tag [HTTP_REQUEST:{...}] correspondente.

REGRAS DE COMUNICAÇÃO HTTP:
Domínio base: https://agenda.voibi.com.br
Headers padrão: {"Authorization": "Bearer ${apiKey}", "Content-Type": "application/json"}

COMO DISPARAR CADA AÇÃO:

1. CONSULTAR HORÁRIOS LIVRES DE UM DIA:
Quando o paciente quiser saber horários para uma data (ex: 2026-09-08):
[HTTP_REQUEST:{"method":"GET","url":"https://agenda.voibi.com.br/api/v1/availability?date=2026-09-08","headers":{"Authorization":"Bearer ${apiKey}"}}]

2. CRIAR NOVO AGENDAMENTO:
Quando o paciente confirmar o horário (ex: 09:00), nome e telefone:
[HTTP_REQUEST:{"method":"POST","url":"https://agenda.voibi.com.br/api/v1/bookings","headers":{"Authorization":"Bearer ${apiKey}","Content-Type":"application/json"},"body":{"inicio":"2026-09-08T09:00:00Z","nome":"Nome do Paciente","telefone":"11999999999","observacao":"Agendado pela IA"}}]

3. BUSCAR CONSULTAS DO PACIENTE (PARA CANCELAR OU REMARCAR):
Quando o paciente disser que quer cancelar ou consultar:
[HTTP_REQUEST:{"method":"GET","url":"https://agenda.voibi.com.br/api/v1/bookings?telefone=11999999999&status=confirmado","headers":{"Authorization":"Bearer ${apiKey}"}}]

4. CANCELAR O AGENDAMENTO:
Após localizar o ID da consulta e o paciente confirmar o cancelamento:
[HTTP_REQUEST:{"method":"POST","url":"https://agenda.voibi.com.br/api/v1/bookings/ID_DO_AGENDAMENTO/cancel","headers":{"Authorization":"Bearer ${apiKey}","Content-Type":"application/json"},"body":{"motivo":"Pedido do cliente"}}]

5. LISTAR PROCEDIMENTOS/SERVIÇOS:
[HTTP_REQUEST:{"method":"GET","url":"https://agenda.voibi.com.br/api/v1/event-types","headers":{"Authorization":"Bearer ${apiKey}"}}]`}
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
          <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 rounded-xl p-8 shadow-sm">
            <div className="flex items-start gap-5">
              <div className="w-14 h-14 bg-white dark:bg-zinc-900 shadow-sm border border-orange-100 text-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Conexão Mágica com N8N</h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-2xl leading-relaxed">
                  Não perca tempo lendo documentações. Clique no botão abaixo para copiar um workflow completo do N8N.
                  Depois, é só abrir o seu N8N, dar <kbd className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded text-xs mx-1 font-mono">Ctrl+V</kbd> e os nós aparecerão prontos na tela com sua API Key já configurada de forma segura!
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
                          "method": "POST",
                          "url": "https://api.voibi.com/v1/events",
                          "sendHeaders": true,
                          "headerParameters": {
                            "parameters": [
                              {
                                "name": "Authorization",
                                "value": `Bearer ${apiKey}`
                              }
                            ]
                          },
                          "sendBody": true,
                          "specifyBody": "json",
                          "jsonBody": "{\n  \"agenda_id\": \"uuid-do-profissional\",\n  \"data_hora\": \"2024-12-01T14:30:00Z\",\n  \"cliente_nome\": \"Nome do Cliente\",\n  \"cliente_whatsapp\": \"11999999999\",\n  \"tipo_evento_id\": \"uuid-do-procedimento\"\n}",
                          "options": {}
                        },
                        "id": "2",
                        "name": "Criar Agendamento Voibi",
                        "type": "n8n-nodes-base.httpRequest",
                        "typeVersion": 4.1,
                        "position": [ 400, 300 ]
                      }
                    ];
                    navigator.clipboard.writeText(JSON.stringify(n8nNodes, null, 2));
                    setCopiedN8n(true);
                    setTimeout(() => setCopiedN8n(false), 3000);
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all shadow-sm ${copiedN8n ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
                >
                  {copiedN8n ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copiedN8n ? 'Workflow Copiado! Cole no N8N' : 'Copiar Template N8N'}
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
              <button onClick={() => setShowLembreteForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
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
                    <span onClick={() => setFormLembrete({...formLembrete, mensagem: formLembrete.mensagem + '{{data_hora}}'})} className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 transition-colors">{"{{data_hora}}"}</span>
                    <span onClick={() => setFormLembrete({...formLembrete, mensagem: formLembrete.mensagem + '{{profissional_nome}}'})} className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 transition-colors">{"{{profissional_nome}}"}</span>
                    <span onClick={() => setFormLembrete({...formLembrete, mensagem: formLembrete.mensagem + '{{procedimento_nome}}'})} className="text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 transition-colors">{"{{procedimento_nome}}"}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => {setShowLembreteForm(false); setIsEditingLembrete(null);}} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                    Salvar Regra
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
                  <div key={l.id} className={`bg-white dark:bg-zinc-900 border rounded-xl p-5 transition-all shadow-sm ${!l.ativo ? 'border-zinc-200 dark:border-zinc-700 opacity-60 bg-zinc-50 dark:bg-zinc-950' : 'border-blue-100'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`font-semibold ${l.ativo ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'}`}>{l.nome}</h4>
                          {!l.ativo && <span className="text-[10px] bg-zinc-200 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded font-bold uppercase">Pausado</span>}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md mt-2 inline-flex font-medium">
                          <Clock className="w-3.5 h-3.5" /> {tempoLabel}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleLembrete(l.id)} className={`p-1.5 rounded-md transition-colors ${l.ativo ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`} title={l.ativo ? "Pausar regra" : "Ativar regra"}>
                          <Zap className="w-4 h-4" />
                        </button>
                        <button onClick={() => startEditLembrete(l)} className="text-zinc-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition-colors" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteLembrete(l.id)} className="text-zinc-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="Excluir">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-50 dark:bg-zinc-950 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800 mt-4 relative">
                      <MessageSquare className="w-4 h-4 text-zinc-300 absolute top-3 right-3" />
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium whitespace-pre-wrap pr-6">{l.mensagem_template}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!showLembreteForm && lembretes.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl">
              <Bell className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">Nenhum lembrete configurado</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Crie mensagens automáticas para reduzir as faltas dos seus clientes.</p>
              <button onClick={() => setShowLembreteForm(true)} className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Criar o primeiro lembrete
              </button>
            </div>
          )}

          <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Como o envio funciona? (Via N8N / API)</h4>
              <p className="text-sm text-blue-800 leading-relaxed mb-3">
                Para evitar problemas com cancelamentos ou reagendamentos, o modelo mais seguro é o de <strong>Busca (Pull)</strong>.
              </p>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside marker:font-semibold">
                <li>No seu N8N, crie um nó de <kbd className="bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded text-xs border border-blue-200 shadow-sm mx-0.5">Schedule</kbd> para rodar a cada 5 ou 10 minutos.</li>
                <li>Ele fará um <code>GET</code> na nossa API <kbd className="bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded text-xs border border-blue-200 shadow-sm mx-0.5">/v1/lembretes/pendentes</kbd>.</li>
                <li>A Voibi vai retornar apenas as mensagens que precisam ser disparadas <strong>naquele exato momento</strong> (ignorando agendamentos cancelados).</li>
                <li>Seu N8N dispara o WhatsApp e pronto!</li>
              </ol>
            </div>
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
