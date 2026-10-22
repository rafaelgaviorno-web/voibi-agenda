import { clsx } from 'clsx';

// Símbolo oficial da Voibi, montado com duas máscaras tiradas do PNG original:
// a parte azul fica na cor da marca e a parte preta segue a cor do texto
// (preta no tema claro, branca no escuro). `mono` pinta tudo na cor do texto.
const maskLayer = (src: string, color: string): React.CSSProperties => ({
  backgroundColor: color,
  WebkitMaskImage: `url(${src})`,
  maskImage: `url(${src})`,
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
});

export function VoibiMark({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <span aria-hidden="true" className={clsx('relative inline-block aspect-square align-middle', className)}>
      <span className="absolute inset-0" style={maskLayer('/brand/voibi-mark-blue.png', mono ? 'currentColor' : '#5271FF')} />
      <span className="absolute inset-0" style={maskLayer('/brand/voibi-mark-dark.png', 'currentColor')} />
    </span>
  );
}

export default function VoibiLogo({
  className,
  size = 'md',
  subtitle,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
}) {
  const text = { sm: 'text-base', md: 'text-lg', lg: 'text-2xl' }[size];
  const mark = { sm: 'w-6', md: 'w-7', lg: 'w-9' }[size];

  return (
    <div className={clsx('flex items-center gap-2.5 min-w-0', className)}>
      <VoibiMark className={clsx(mark, 'shrink-0 text-zinc-900 dark:text-white')} />
      <div className="min-w-0 leading-none">
        <div className={clsx(text, 'font-bold tracking-tight')}>
          <span className="text-zinc-900 dark:text-white">Voibi</span>{' '}
          <span className="text-brand-500 font-semibold">Agenda</span>
        </div>
        {subtitle && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
