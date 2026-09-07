'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyAgendaId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      onClick={handleCopy}
      title="Clique para copiar o ID da agenda"
      className="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded-md text-[11px] font-mono cursor-pointer transition-colors border border-zinc-200 dark:border-zinc-700"
    >
      <span className="text-zinc-400 select-none">ID:</span>
      <span className="truncate max-w-[120px]">{id}</span>
      {copied ? <Check className="w-3 h-3 text-green-600 shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
    </div>
  );
}
