'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getSlotsForDate, createBookingAction } from './actions';

export default function BookingCalendar({ 
  eventTypeId, 
  empresaId, 
  duracao 
}: { 
  eventTypeId: string, 
  empresaId: string, 
  duracao: number 
}) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<{start: Date, end: Date}[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{start: Date, end: Date} | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (selectedDate) {
      setLoading(true);
      getSlotsForDate(eventTypeId, selectedDate)
        .then(res => {
          setSlots(res as any);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedDate, eventTypeId]);

  async function handleBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSlot) return;

    setBookingStatus('submitting');
    setErrorMsg('');

    const formData = new FormData(e.currentTarget);
    formData.append('eventTypeId', eventTypeId);
    formData.append('empresaId', empresaId);
    formData.append('inicio', selectedSlot.start.toISOString());
    formData.append('fim', selectedSlot.end.toISOString());

    const result = await createBookingAction(formData);

    if (result.error) {
      setErrorMsg(result.error);
      setBookingStatus('error');
    } else {
      setBookingStatus('success');
    }
  }

  if (bookingStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
        <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 className="text-2xl font-bold">Agendamento Confirmado!</h2>
        <p className="text-muted-foreground">Você receberá um lembrete em breve.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {!selectedSlot ? (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Escolha uma Data</label>
            <input 
              type="date" 
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-foreground focus:ring-2 focus:ring-primary outline-none transition-all"
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {selectedDate && (
            <div>
              <label className="block text-sm font-medium mb-2">Horários Disponíveis</label>
              {loading ? (
                <div className="animate-pulse flex space-x-4">
                  <div className="h-10 w-24 bg-white/10 rounded"></div>
                  <div className="h-10 w-24 bg-white/10 rounded"></div>
                </div>
              ) : slots.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedSlot(slot)}
                      className="py-2 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-medium transition-colors border border-primary/20"
                    >
                      {format(new Date(slot.start), 'HH:mm')}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum horário disponível para esta data.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleBooking} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
            <div>
              <p className="text-sm text-muted-foreground">Horário selecionado</p>
              <p className="font-semibold text-primary">
                {format(new Date(selectedSlot.start), "dd/MM/yyyy 'às' HH:mm")}
              </p>
            </div>
            <button 
              type="button" 
              onClick={() => setSelectedSlot(null)}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Mudar
            </button>
          </div>

          <div>
            <label className="block text-sm mb-1">Nome completo</label>
            <input required type="text" name="nome" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-primary transition-colors" placeholder="João da Silva" />
          </div>
          <div>
            <label className="block text-sm mb-1">E-mail</label>
            <input required type="email" name="email" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-primary transition-colors" placeholder="joao@exemplo.com" />
          </div>
          <div>
            <label className="block text-sm mb-1">WhatsApp / Telefone</label>
            <input required type="tel" name="telefone" className="w-full bg-white/5 border border-white/10 rounded-lg p-3 outline-none focus:border-primary transition-colors" placeholder="(11) 99999-9999" />
          </div>

          {errorMsg && (
            <div className="p-3 bg-destructive/20 text-destructive rounded-lg text-sm border border-destructive/30">
              {errorMsg}
            </div>
          )}

          <button 
            type="submit" 
            disabled={bookingStatus === 'submitting'}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 mt-6"
          >
            {bookingStatus === 'submitting' ? 'Confirmando...' : 'Confirmar Agendamento'}
          </button>
        </form>
      )}
    </div>
  );
}
