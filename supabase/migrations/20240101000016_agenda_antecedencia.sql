-- Adiciona configuração de antecedência mínima (em horas) por agenda
ALTER TABLE agend_profissionais
  ADD COLUMN IF NOT EXISTS antecedencia_minima_horas INTEGER NOT NULL DEFAULT 0;

-- Recarregar o cache do PostgREST
NOTIFY pgrst, 'reload schema';
