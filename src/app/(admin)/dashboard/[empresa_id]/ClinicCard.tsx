// Cartão com o nome da clínica no topo do menu lateral
const initialsOf = (name: string) =>
  name.split(/\s+/).filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || name.charAt(0).toUpperCase();

export default function ClinicCard({ nome }: { nome: string }) {
  return (
    <div className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/10 bg-white/[0.04]">
      <span className="w-8 h-8 shrink-0 rounded-[9px] bg-brand-500 text-white flex items-center justify-center text-xs font-extrabold">
        {initialsOf(nome)}
      </span>
      <span className="min-w-0 text-[14px] font-bold text-white truncate">{nome}</span>
    </div>
  );
}
