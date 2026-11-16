'use client';

import { useState } from 'react';

export const TIPOS_AGENDA_PADRAO = [
  'Avaliação',
  'Orto',
  'Implante',
  'Prótese',
  'Clínico',
  'Endo',
  'Periodontia',
  'Harmonização',
  'Estética',
  'Geral',
] as const;

const OUTRO_VALUE = '__outro__';

interface TipoAgendaSelectProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  className?: string;
}

/**
 * Seletor obrigatório de tipo/especialidade da agenda com opções padrão e entrada personalizada.
 */
export default function TipoAgendaSelect({
  name = 'tipo_agenda',
  value,
  defaultValue = '',
  onChange,
  required = true,
  className = 'w-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all',
}: TipoAgendaSelectProps) {
  const initialValue = (value !== undefined ? value : defaultValue).trim();
  const isPreset = TIPOS_AGENDA_PADRAO.includes(
    initialValue as (typeof TIPOS_AGENDA_PADRAO)[number]
  );

  const [isCustom, setIsCustom] = useState<boolean>(
    Boolean(initialValue) && !isPreset
  );
  const [internalValue, setInternalValue] = useState<string>(initialValue);

  const currentValue = value !== undefined ? value : internalValue;
  const selectValue = isCustom
    ? OUTRO_VALUE
    : TIPOS_AGENDA_PADRAO.includes(
          currentValue as (typeof TIPOS_AGENDA_PADRAO)[number]
        )
      ? currentValue
      : '';

  const updateValue = (next: string) => {
    if (value === undefined) {
      setInternalValue(next);
    }
    onChange?.(next);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === OUTRO_VALUE) {
      setIsCustom(true);
      updateValue('');
      return;
    }
    setIsCustom(false);
    updateValue(selected);
  };

  return (
    <div className="space-y-2">
      <select
        name={isCustom ? undefined : name}
        value={selectValue}
        onChange={handleSelectChange}
        required={required && !isCustom}
        className={`${className} cursor-pointer`}
      >
        <option value="">Selecione o tipo da agenda...</option>
        {TIPOS_AGENDA_PADRAO.map((tipo) => (
          <option key={tipo} value={tipo}>
            {tipo}
          </option>
        ))}
        <option value={OUTRO_VALUE}>Outro (especificar)...</option>
      </select>

      {isCustom && (
        <input
          type="text"
          name={name}
          value={currentValue}
          onChange={(e) => updateValue(e.target.value)}
          required={required}
          placeholder="Digite o tipo (ex: Odontopediatria)"
          className={className}
        />
      )}
    </div>
  );
}
