'use client';

import { useState } from 'react';
import { format } from 'date-fns';

export default function DemoCalendar() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<{start: Date, end: Date} | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  // Horários fake para demonstração
  const slots = [
    { start: new Date(new Date().setHours(9, 0, 0, 0)), end: new Date(new Date().setHours(10, 0, 0, 0)) },
    { start: new Date(new Date().setHours(10, 30, 0, 0)), end: new Date(new Date().setHours(11, 30, 0, 0)) },
    { start: new Date(new Date().setHours(14, 0, 0, 0)), end: new Date(new Date().setHours(15, 0, 0, 0)) },
    { start: new Date(new Date().setHours(15, 30, 0, 0)), end: new Date(new Date().setHours(16, 30, 0, 0)) },
  ];

  async function handleBooking(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSlot) return;

    setBookingStatus('submitting');
    // Fake delay
    setTimeout(() => {
      setBookingStatus('success');
    }, 1500);
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
              <label className="block text-sm font-medium mb-2">Horários Disponíveis (Demonstração)</label>
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
