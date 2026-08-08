'use client';

import { useState, useEffect } from 'react';
import { ArrowRightLeft, X, Calendar, User, Info } from 'lucide-react';

export default function TransferModal({
  isOpen,
  onClose,
  sourceAgendaId,
  agendas,
  onTransfer
}: {
  isOpen: boolean,
  onClose: () => void,
  sourceAgendaId: string,
  agendas: any[],
  onTransfer: (sourceId: string, targetId: string, date: string) => Promise<void>
}) {
  const [targetId, setTargetId] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sourceAgenda = agendas.find(a => a.id === sourceAgendaId);

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setTransferDate(`${y}-${m}-${day}`);
      setTargetId('');
    }
  }, [isOpen]);

  if (!isOpen || !sourceAgenda) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId || !transferDate) return;
    
    setIsSubmitting(true);
    await onTransfer(sourceAgendaId, targetId, transferDate);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 sticky top-0 z-10">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            Transferir Agendamentos
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors text-zinc-500 dark:text-zinc-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form id="transfer-form" onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="bg-blue-50/50 border border-blue-100 text-blue-800 p-4 rounded-xl text-sm flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p>
              Transfira todos os agendamentos de uma agenda para outra em uma data específica, mantendo os horários originais.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-400" />
                Data da Transferência
              </label>
              <input 
                type="date"
                required
                value={transferDate}
                onChange={e => setTransferDate(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" 
              />
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">De (Origem)</label>
                <div className="flex items-center gap-2 p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg opacity-75">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sourceAgenda.cor }}></div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{sourceAgenda.nome}</span>
                </div>
              </div>

              <div className="flex justify-center -my-2 relative z-10">
                <div className="bg-white dark:bg-zinc-900 p-1 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-sm text-zinc-400">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  Para (Destino)
                </label>
                <select 
                  required
                  value={targetId}
                  onChange={e => setTargetId(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                >
                  <option value="" disabled>Selecione a nova agenda</option>
                  {agendas.filter(a => a.id !== sourceAgendaId).map(ag => (
                    <option key={ag.id} value={ag.id}>{ag.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button 
            form="transfer-form"
            type="submit" 
            disabled={isSubmitting || !targetId || !transferDate}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? 'Transferindo...' : 'Transferir Todos'}
          </button>
        </div>

      </div>
    </div>
  );
}
