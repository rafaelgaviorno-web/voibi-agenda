'use client';

import { useState } from 'react';

export default function BloqueiosManager({ initialBloqueios, agendas, unidades, saveBloqueio }: any) {
  const [bloqueios, setBloqueios] = useState(initialBloqueios || []);
  const [novoBloqueio, setNovoBloqueio] = useState({ inicio: '', fim: '', motivo: '', profissional_id: '', unidade_id: '' });
  const [isDiaTodo, setIsDiaTodo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddBloqueio = async () => {
    if (!novoBloqueio.inicio || !novoBloqueio.fim) return;
    setIsSaving(true);
    
    // Formatar datas baseado em isDiaTodo
    let inicioFinal = novoBloqueio.inicio;
    let fimFinal = novoBloqueio.fim;
    
    if (isDiaTodo) {
       // Se o input era apenas 'date', ele vem como YYYY-MM-DD
       inicioFinal = `${novoBloqueio.inicio}T00:00`;
       fimFinal = `${novoBloqueio.fim}T23:59`;
    }

    // profissional_id = '' significa Geral para uma unidade
    const blockData = {
      ...novoBloqueio,
      inicio: inicioFinal,
      fim: fimFinal,
      profissional_id: novoBloqueio.profissional_id === '' ? null : novoBloqueio.profissional_id,
      unidade_id: novoBloqueio.unidade_id === '' ? null : novoBloqueio.unidade_id
    };

    const result = await saveBloqueio(blockData, 'add');
    if (result) {
      setBloqueios([...bloqueios, result]);
      setNovoBloqueio({ inicio: '', fim: '', motivo: '', profissional_id: '', unidade_id: '' });
    }
    setIsSaving(false);
  };

  const handleRemoveBloqueio = async (id: string) => {
    setIsSaving(true);
    await saveBloqueio({ id }, 'remove');
    setBloqueios(bloqueios.filter((b: any) => b.id !== id));
    setIsSaving(false);
  };

  return (
    <div className="p-5">
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Adicione períodos de bloqueio para que não seja possível agendar horários. Você pode bloquear a clínica inteira (Fundo colorido) ou uma agenda específica (Card Cinza).
      </p>

      <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-8 space-y-4">
        
        <div className="flex items-center gap-2 mb-2">
          <input 
            type="checkbox" 
            id="diaTodo" 
            checked={isDiaTodo} 
            onChange={(e) => {
              setIsDiaTodo(e.target.checked);
              // Limpar as datas quando alterna o modo para evitar erros de formatação
              setNovoBloqueio({...novoBloqueio, inicio: '', fim: ''});
            }}
            className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-600 focus:ring-blue-500"
          />
          <label htmlFor="diaTodo" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Bloquear dia todo</label>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          {unidades && unidades.length > 0 && (
            <div className="flex-1 min-w-[140px] space-y-1.5">
               <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Unidade Afetada</label>
               <select 
                  value={novoBloqueio.unidade_id} 
                  onChange={e => setNovoBloqueio({...novoBloqueio, unidade_id: e.target.value})} 
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
               >
                 <option value="">Todas (Geral)</option>
                 {unidades.map((u: any) => (
                   <option key={u.id} value={u.id}>{u.nome}</option>
                 ))}
               </select>
            </div>
          )}
          <div className="flex-1 min-w-[140px] space-y-1.5">
             <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Agenda Afetada</label>
             <select 
                value={novoBloqueio.profissional_id} 
                onChange={e => setNovoBloqueio({...novoBloqueio, profissional_id: e.target.value})} 
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
             >
               <option value="">Todas da Unidade</option>
               {agendas.filter((a:any) => !novoBloqueio.unidade_id || a.unidade_id === novoBloqueio.unidade_id).map((a: any) => (
                 <option key={a.id} value={a.id}>Apenas: {a.nome}</option>
               ))}
             </select>
          </div>
          <div className="flex-1 min-w-[160px] space-y-1.5">
             <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Data Inicial</label>
             <input type={isDiaTodo ? "date" : "datetime-local"} value={novoBloqueio.inicio} onChange={e => setNovoBloqueio({...novoBloqueio, inicio: e.target.value})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex-1 min-w-[160px] space-y-1.5">
             <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Data Final</label>
             <input type={isDiaTodo ? "date" : "datetime-local"} value={novoBloqueio.fim} onChange={e => setNovoBloqueio({...novoBloqueio, fim: e.target.value})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex-1 min-w-[140px] space-y-1.5">
             <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Motivo</label>
             <input type="text" placeholder="Opcional" value={novoBloqueio.motivo} onChange={e => setNovoBloqueio({...novoBloqueio, motivo: e.target.value})} className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500" />
          </div>
          <div className="w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
            <button onClick={handleAddBloqueio} disabled={isSaving || !novoBloqueio.inicio || !novoBloqueio.fim} className="w-full sm:w-auto bg-zinc-900 hover:bg-black text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 h-[38px] flex items-center justify-center">
              Adicionar
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Bloqueios Ativos</h3>
        {bloqueios.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">Nenhum bloqueio cadastrado.</p>
        ) : (
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium">
                <tr>
                  <th className="px-4 py-3">Início</th>
                  <th className="px-4 py-3">Fim</th>
                  <th className="px-4 py-3">Agenda</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {bloqueios.map((b: any) => {
                  const agendaAfetada = b.profissional_id ? agendas.find((a:any) => a.id === b.profissional_id)?.nome : 'Geral (Clínica toda)';
                  return (
                  <tr key={b.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50/50 dark:bg-zinc-900/50">
                    <td className="px-4 py-3">{new Date(b.inicio).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3">{new Date(b.fim).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 font-medium">
                      {b.profissional_id ? (
                        <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">{agendaAfetada}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-md bg-rose-50 text-rose-700 text-xs font-medium border border-rose-100">
                          {b.unidade_id ? `Unidade: ${unidades?.find((u:any) => u.id === b.unidade_id)?.nome || 'Específica'}` : 'Geral (Clínica toda)'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{b.motivo || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleRemoveBloqueio(b.id)} className="text-red-600 hover:text-red-700 font-medium text-xs">Remover</button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
