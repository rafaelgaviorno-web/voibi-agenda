'use client';

import { useState } from 'react';
import { ArrowLeft, Clock, CalendarX, User, FormInput, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function AgendaConfigClient({ 
  agenda, 
  disponibilidadeInicial, 
  empresaId, 
  onSaveBasico,
  onSaveDisponibilidade
}: any) {
  const [activeTab, setActiveTab] = useState('basico');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Estados locais
  const [nome, setNome] = useState(agenda.nome);
  const [cor, setCor] = useState(agenda.cor || '#4285f4');
  const [webhookUrl, setWebhookUrl] = useState(agenda.webhook_url || '');
  const [permitirSobreposicao, setPermitirSobreposicao] = useState(agenda.permitir_sobreposicao || false);
  const [campos, setCampos] = useState<any[]>(agenda.campos_personalizados || []);
  // Para simplificar no MVP, vamos manter um formato fácil de iterar
  const diasDaSemana = [
    { num: 0, label: 'Domingo' },
    { num: 1, label: 'Segunda-feira' },
    { num: 2, label: 'Terça-feira' },
    { num: 3, label: 'Quarta-feira' },
    { num: 4, label: 'Quinta-feira' },
    { num: 5, label: 'Sexta-feira' },
    { num: 6, label: 'Sábado' }
  ];

  const [disponibilidade, setDisponibilidade] = useState(() => {
    // Inicializa com estrutura base ou dados existentes
    const base = diasDaSemana.map(d => ({
      dia_semana: d.num,
      ativo: false,
      intervalos: [{ inicio: '08:00', fim: '18:00' }]
    }));
    
    // Preencher com dados do banco se houver
    if (disponibilidadeInicial && disponibilidadeInicial.length > 0) {
      disponibilidadeInicial.forEach((d: any) => {
        const dia = base.find(b => b.dia_semana === d.dia_semana);
        if (dia) {
          dia.ativo = true;
          // Se já tem intervalos válidos (do banco), os agrupamos.
          // Como o DB retorna linhas separadas, agrupamos por dia.
          // Aqui faríamos uma lógica para agrupar, mas para simplificar:
          // Se for a primeira vez que vemos o dia, substituímos o array padrão.
          if (!dia.intervalos[0] || (dia.intervalos.length === 1 && dia.intervalos[0].inicio === '08:00' && dia.intervalos[0].fim === '18:00' && !dia._modificado)) {
            dia.intervalos = [];
            dia._modificado = true;
          }
          dia.intervalos.push({ inicio: d.hora_inicio.substring(0,5), fim: d.hora_fim.substring(0,5) });
        }
      });
    }
    return base;
  });


  const handleSaveBasico = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSaveBasico({ nome, cor, webhook_url: webhookUrl, permitir_sobreposicao: permitirSobreposicao, campos_personalizados: campos });
    if (empresaId === 'mock-clinic') {
      localStorage.setItem(`mock_campos_${agenda.id}`, JSON.stringify(campos));
      localStorage.setItem(`mock_webhook_agenda_${agenda.id}`, webhookUrl);
      localStorage.setItem(`mock_sobreposicao_agenda_${agenda.id}`, permitirSobreposicao ? 'true' : 'false');
    }
    setSaveMessage('Dados salvos com sucesso!');
    setTimeout(() => setSaveMessage(''), 3000);
    setIsSaving(false);
  };

  const handleSaveDisponibilidade = async () => {
    setIsSaving(true);
    // Filtrar apenas dias ativos e limpar campos temporários
    const dadosLimpos = disponibilidade
      .filter(d => d.ativo)
      .map(d => ({
        dia_semana: d.dia_semana,
        intervalos: d.intervalos
      }));
    await onSaveDisponibilidade(dadosLimpos);
    setSaveMessage('Horários salvos com sucesso!');
    setTimeout(() => setSaveMessage(''), 3000);
    setIsSaving(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/${empresaId}/agendas`} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{agenda.nome}</h1>
            <p className="text-sm text-zinc-500 mt-1">Configurações da agenda</p>
          </div>
        </div>
        {saveMessage && (
          <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {saveMessage}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 mb-6">
        <button 
          onClick={() => setActiveTab('basico')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'basico' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}`}
        >
          <User className="w-4 h-4" />
          Dados Básicos
        </button>
        <button 
          onClick={() => setActiveTab('horarios')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'horarios' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}`}
        >
          <Clock className="w-4 h-4" />
          Horários de Atendimento
        </button>

        <button 
          onClick={() => setActiveTab('formulario')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'formulario' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'}`}
        >
          <FormInput className="w-4 h-4" />
          Formulário do Cliente
        </button>
      </div>

      {/* Content: Dados Básicos */}
      {activeTab === 'basico' && (
        <form onSubmit={handleSaveBasico} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm max-w-2xl">
          <div className="space-y-4">
            <div>
               <label className="block text-sm font-medium text-zinc-700 mb-1">Nome da Agenda</label>
               <input value={nome} onChange={e => setNome(e.target.value)} required className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
            <div>
               <label className="block text-sm font-medium text-zinc-700 mb-2">Cor no Calendário</label>
               <div className="flex flex-wrap items-center gap-2">
                 {[
                  '#1d4ed8', '#3b82f6', '#60a5fa', // Azuis
                  '#6d28d9', '#8b5cf6', '#a78bfa', // Roxos
                  '#be185d', '#ec4899', '#f472b6', // Rosas
                  '#0f766e', '#14b8a6', '#5eead4', // Teals
                  '#0369a1', '#0ea5e9', '#7dd3fc', // Cianos
                  '#475569', '#64748b', '#94a3b8'  // Cinzas
                 ].map(c => (
                   <label key={c} className="cursor-pointer">
                     <input type="radio" name="cor" value={c} className="peer sr-only" required checked={cor === c} onChange={() => setCor(c)} />
                     <div className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:ring-2 peer-checked:ring-offset-1 peer-checked:ring-zinc-900 transition-all shadow-sm hover:scale-110" style={{ backgroundColor: c }}></div>
                   </label>
                 ))}
                 {!['#1d4ed8', '#3b82f6', '#60a5fa', '#6d28d9', '#8b5cf6', '#a78bfa', '#be185d', '#ec4899', '#f472b6', '#0f766e', '#14b8a6', '#5eead4', '#0369a1', '#0ea5e9', '#7dd3fc', '#475569', '#64748b', '#94a3b8'].includes(cor) && (
                   <label className="cursor-pointer ml-2">
                     <input type="radio" name="cor" value={cor} className="peer sr-only" required checked={true} readOnly />
                     <div className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:ring-2 peer-checked:ring-offset-1 peer-checked:ring-zinc-900 transition-all shadow-sm" style={{ backgroundColor: cor }}></div>
                     <span className="text-xs text-zinc-400 mt-1 block text-center">Atual</span>
                   </label>
                 )}
               </div>
            </div>
            <div className="pt-4 border-t border-zinc-100">
               <label className="block text-sm font-medium text-zinc-700 mb-1">Webhook URL (Opcional)</label>
               <p className="text-xs text-zinc-500 mb-2">Dispara um POST para este link quando houver um agendamento. (Substitui o webhook global da clínica)</p>
               <input type="url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://n8n.exemplo.com/webhook/..." className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
            
            <div className="pt-4 border-t border-zinc-100">
              <label className="flex items-start gap-3 p-4 bg-zinc-50 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-100/50 transition-colors">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={permitirSobreposicao}
                    onChange={(e) => setPermitirSobreposicao(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white border-zinc-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-zinc-900">Permitir sobreposição com outras agendas</span>
                  <span className="text-xs text-zinc-500 mt-1">
                    Se marcado, esta agenda poderá ter agendamentos no mesmo horário que outras agendas (ex: profissionais atendendo em salas separadas). Se desmarcado, um agendamento nela bloqueia a clínica inteira naquele horário.
                  </span>
                </div>
              </label>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-zinc-100 flex justify-end">
            <button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      )}

      {/* Content: Horários */}
      {activeTab === 'horarios' && (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm text-zinc-500 mb-6">
            Defina os horários em que esta agenda estará disponível para receber agendamentos. Você pode adicionar múltiplos intervalos por dia (ex: pausa para almoço).
          </p>
          
          <div className="space-y-4">
            {disponibilidade.map((dia, diaIdx) => (
              <div key={dia.dia_semana} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-zinc-100 rounded-lg bg-zinc-50/50">
                <div className="w-40 flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={dia.ativo}
                    onChange={(e) => {
                      const newDisp = [...disponibilidade];
                      newDisp[diaIdx].ativo = e.target.checked;
                      setDisponibilidade(newDisp);
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
                  />
                  <span className={`text-sm font-medium ${dia.ativo ? 'text-zinc-900' : 'text-zinc-400'}`}>
                    {diasDaSemana.find(d => d.num === dia.dia_semana)?.label}
                  </span>
                </div>
                
                <div className="flex-1 space-y-2">
                  {dia.ativo ? (
                    dia.intervalos.map((intervalo: any, intIdx: number) => (
                      <div key={intIdx} className="flex items-center gap-2">
                        <input 
                          type="time" 
                          value={intervalo.inicio}
                          onChange={(e) => {
                            const newDisp = [...disponibilidade];
                            newDisp[diaIdx].intervalos[intIdx].inicio = e.target.value;
                            setDisponibilidade(newDisp);
                          }}
                          className="bg-white border border-zinc-300 rounded px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <span className="text-zinc-400 text-sm">até</span>
                        <input 
                          type="time" 
                          value={intervalo.fim}
                          onChange={(e) => {
                            const newDisp = [...disponibilidade];
                            newDisp[diaIdx].intervalos[intIdx].fim = e.target.value;
                            setDisponibilidade(newDisp);
                          }}
                          className="bg-white border border-zinc-300 rounded px-2 py-1 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        {dia.intervalos.length > 1 && (
                          <button 
                            onClick={() => {
                              const newDisp = [...disponibilidade];
                              newDisp[diaIdx].intervalos.splice(intIdx, 1);
                              setDisponibilidade(newDisp);
                            }}
                            className="p-1 text-zinc-400 hover:text-red-500 transition-colors ml-2"
                            title="Remover intervalo"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-zinc-400 italic">Indisponível</span>
                  )}
                  {dia.ativo && (
                    <button 
                      onClick={() => {
                        const newDisp = [...disponibilidade];
                        newDisp[diaIdx].intervalos.push({ inicio: '13:00', fim: '18:00' });
                        setDisponibilidade(newDisp);
                      }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 mt-1"
                    >
                      <PlusIcon /> Adicionar intervalo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 flex justify-end">
            <button onClick={handleSaveDisponibilidade} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {isSaving ? 'Salvando...' : 'Salvar Horários'}
            </button>
          </div>
        </div>
      )}


      {/* Content: Formulário */}
      {activeTab === 'formulario' && (
        <form onSubmit={handleSaveBasico} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Campos do Agendamento</h2>
              <p className="text-sm text-zinc-500">Defina quais informações o cliente precisa preencher ao agendar (além de Nome e WhatsApp).</p>
            </div>
            <button 
              type="button"
              onClick={() => setCampos([...campos, { id: 'campo-' + Date.now(), titulo: '', tipo: 'text', obrigatorio: false }])}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-4 h-4" /> Adicionar Campo
            </button>
          </div>

          <div className="space-y-3">
            {campos.map((campo, index) => (
              <div key={campo.id} className="flex flex-col sm:flex-row gap-3 p-4 border border-zinc-200 rounded-xl bg-zinc-50/30 items-start sm:items-center">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Título do Campo</label>
                  <input 
                    value={campo.titulo}
                    onChange={e => {
                      const newCampos = [...campos];
                      newCampos[index].titulo = e.target.value;
                      setCampos(newCampos);
                    }}
                    placeholder="Ex: CPF, Data de Nascimento..."
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    required
                  />
                </div>
                <div className="w-full sm:w-40">
                  <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Tipo</label>
                  <select 
                    value={campo.tipo}
                    onChange={e => {
                      const newCampos = [...campos];
                      newCampos[index].tipo = e.target.value;
                      if (e.target.value === 'select' && !newCampos[index].opcoes) {
                         newCampos[index].opcoes = 'Opção 1, Opção 2';
                      }
                      setCampos(newCampos);
                    }}
                    className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                  >
                    <option value="text">Texto Curto</option>
                    <option value="textarea">Texto Longo</option>
                    <option value="select">Lista Suspensa</option>
                  </select>
                </div>
                
                {campo.tipo === 'select' && (
                  <div className="w-full sm:w-64">
                    <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Opções (separadas por vírgula)</label>
                    <input 
                      value={campo.opcoes || ''}
                      onChange={e => {
                        const newCampos = [...campos];
                        newCampos[index].opcoes = e.target.value;
                        setCampos(newCampos);
                      }}
                      placeholder="Ex: Unimed, SulAmérica, Particular"
                      className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                )}

                <div className="flex items-center gap-4 mt-2 sm:mt-0 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-700">
                    <input 
                      type="checkbox"
                      checked={campo.obrigatorio}
                      onChange={e => {
                        const newCampos = [...campos];
                        newCampos[index].obrigatorio = e.target.checked;
                        setCampos(newCampos);
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
                    />
                    Obrigatório
                  </label>
                  <button 
                    type="button"
                    onClick={() => setCampos(campos.filter(c => c.id !== campo.id))}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {campos.length === 0 && (
              <div className="text-center py-8 text-zinc-400 border-2 border-dashed border-zinc-200 rounded-xl">
                Nenhum campo personalizado adicionado.
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-100 flex justify-end">
            <button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  );
}
