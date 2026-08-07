import { notFound } from 'next/navigation';
import { getServiceSupabase } from '@/lib/supabase/client';
import BookingCalendar from './BookingCalendar';

export default async function BookingPage({
  params
}: {
  params: Promise<{ empresa_slug: string; profissional_slug: string; tipo_evento_slug: string }>
}) {
  const { empresa_slug, profissional_slug, tipo_evento_slug } = await params;
  const supabase = getServiceSupabase();

  const { data: eventType, error } = await supabase
    .from('agend_tipos_evento')
    .select(`
      *,
      agend_profissionais!inner(
        id, nome, slug,
        agend_empresas!inner(id, nome, slug)
      )
    `)
    .eq('slug', tipo_evento_slug)
    .eq('agend_profissionais.slug', profissional_slug)
    .eq('agend_profissionais.agend_empresas.slug', empresa_slug)
    .single();

  if (error || !eventType) {
    notFound();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl glass-panel flex flex-col md:flex-row overflow-hidden border border-white/5">
        {/* Lado Esquerdo: Info */}
        <div className="w-full md:w-1/3 bg-background/50 p-8 border-b md:border-b-0 md:border-r border-white/5 relative">
          <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-xs text-primary font-bold tracking-widest uppercase mb-3">
              {eventType.agend_profissionais.nome}
            </p>
            <h1 className="text-3xl font-extrabold text-foreground mb-4 leading-tight">
              {eventType.nome}
            </h1>
            <div className="flex items-center text-muted-foreground font-medium mb-6">
              <svg className="w-5 h-5 mr-2 text-primary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {eventType.duracao_minutos} min
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Selecione uma data e horário disponíveis para confirmar seu agendamento.
            </p>
          </div>
        </div>

        {/* Lado Direito: Calendário Interativo */}
        <div className="w-full md:w-2/3 p-8 bg-card/40 backdrop-blur-sm">
          <BookingCalendar 
            eventTypeId={eventType.id}
            empresaId={eventType.agend_profissionais.agend_empresas.id}
            duracao={eventType.duracao_minutos} 
          />
        </div>
      </div>
    </div>
  );
}
