'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const fullLink = link.startsWith('http') ? link : `${window.location.origin}${link}`;
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      title="Copiar Link de Agendamento"
      className={`p-1.5 rounded-md transition-colors ${copied ? 'text-green-600 bg-green-50' : 'text-zinc-400 hover:text-blue-600 hover:bg-blue-50'}`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}
