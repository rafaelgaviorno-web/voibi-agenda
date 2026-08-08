'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Key, Copy, Check, Link2, Code, Zap, Bell, Plus, Trash2, Edit2, MessageSquare, Clock, ArrowRight } from 'lucide-react';

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

  return (
    <div>

      {/* Conteúdo: API */}
      {activeTab === 'api' && (
        <div className="space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="space-y-6">
              {/* API Key */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Chave de API (API Key)</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Sua credencial única para autenticação</p>
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
                <p className="text-xs text-amber-600 mt-3 font-medium bg-amber-50 p-2 rounded border border-amber-100">
                  Mantenha esta chave em segredo. Nunca compartilhe ou exponha no lado do cliente (navegador).
                </p>
              </div>

              {/* Webhook */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Webhook (Eventos em tempo real)</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Para onde devemos enviar atualizações?</p>
                  </div>
                </div>
                
                <form onSubmit={handleSaveWebhook} className="space-y-3">
                  <input 
                    type="url" 
                    name="webhook_url" 
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://seu-sistema.com/webhook"
                    className="w-full border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
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
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4 leading-relaxed">
                  Enviaremos requisições POST para esta URL sempre que um agendamento for **Criado**, **Atualizado** ou **Cancelado**.
                </p>
              </div>
            </div>

            {/* Quickstart Guide */}
            <div className="bg-zinc-900 rounded-xl p-5 shadow-sm text-zinc-300">
              <div className="flex items-center gap-2 mb-4 text-white">
                <Code className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold">Guia Rápido: Como criar um evento</h3>
              </div>
              
              <p className="text-sm mb-4 leading-relaxed">
                Você pode automatizar a criação de consultas a partir do N8N, Typebot ou do seu próprio código fazendo uma requisição simples:
              </p>

              <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800 font-mono text-xs overflow-x-auto">
                <div className="text-emerald-400 mb-1">POST <span className="text-zinc-300">https://api.voibi.com/v1/events</span></div>
                <div className="text-blue-300 mb-3">Authorization: Bearer <span className="text-zinc-400">{'{SUA_API_KEY}'}</span></div>
                
                <div className="text-zinc-500 dark:text-zinc-400">{"{"}</div>
                <div className="pl-4">
                  <div><span className="text-blue-300">"agenda_id"</span>: <span className="text-amber-300">"uuid-do-profissional"</span>,</div>
                  <div><span className="text-blue-300">"data_hora"</span>: <span className="text-amber-300">"2024-01-20T14:30:00Z"</span>,</div>
                  <div><span className="text-blue-300">"cliente_nome"</span>: <span className="text-amber-300">"João Silva"</span>,</div>
                  <div><span className="text-blue-300">"cliente_whatsapp"</span>: <span className="text-amber-300">"11999999999"</span></div>
                </div>
                <div className="text-zinc-500 dark:text-zinc-400">{"}"}</div>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <div className="mt-0.5 text-blue-400"><Zap className="w-4 h-4" /></div>
                  <p><strong>N8N / Make:</strong> Use o nó "HTTP Request" configurado para POST, passe a API Key no Header de "Authorization".</p>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <div className="mt-0.5 text-blue-400"><Zap className="w-4 h-4" /></div>
                  <p><strong>Typebot:</strong> Crie um bloco de "Webhook" enviando os dados capturados do cliente nas variáveis JSON acima.</p>
                </div>
              </div>

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

    </div>
  );
}
