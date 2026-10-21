import { clsx } from 'clsx';

// Símbolo ▶▶ do logo Voibi: chevron na cor do texto + play na cor da marca
export function VoibiMark({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 32 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3 4.5 11.5 12 3 19.5"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 5.2c0-1.7 1.9-2.7 3.3-1.7l10 7.1c1.2.8 1.2 2.6 0 3.4l-10 7.1c-1.4 1-3.3 0-3.3-1.7V5.2Z"
        fill={mono ? 'currentColor' : '#5271FF'}
      />
    </svg>
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
          <span className="text-zinc-900 dark:text-white">voibi</span>{' '}
          <span className="text-brand-500 font-semibold">agenda</span>
        </div>
        {subtitle && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
