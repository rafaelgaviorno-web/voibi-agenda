import DemoCalendar from './DemoCalendar';

export default function DemoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl glass-panel flex flex-col md:flex-row overflow-hidden border border-white/5">
        {/* Lado Esquerdo: Info Mock */}
        <div className="w-full md:w-1/3 bg-background/50 p-8 border-b md:border-b-0 md:border-r border-white/5 relative">
          <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-xs text-primary font-bold tracking-widest uppercase mb-3">
              Dra. Ana Silva
            </p>
            <h1 className="text-3xl font-extrabold text-foreground mb-4 leading-tight">
              Consulta de Avaliação
            </h1>
            <div className="flex items-center text-muted-foreground font-medium mb-6">
              <svg className="w-5 h-5 mr-2 text-primary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              60 min
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              (DEMONSTRAÇÃO VISUAL) <br/><br/> Selecione uma data e horário disponíveis para confirmar seu agendamento simulado.
            </p>
          </div>
        </div>

        {/* Lado Direito: Calendário Mock */}
        <div className="w-full md:w-2/3 p-8 bg-card/40 backdrop-blur-sm">
          <DemoCalendar />
        </div>
      </div>
    </div>
  );
}
