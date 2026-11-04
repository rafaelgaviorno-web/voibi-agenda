-- Migration para suporte a bloqueios recorrentes por dias da semana e vigência
ALTER TABLE agend_bloqueios 
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'data',
  ADD COLUMN IF NOT EXISTS dias_semana INTEGER[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hora_inicio TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hora_fim TIME DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS data_fim_recorrencia DATE DEFAULT NULL;

-- Permitir que inicio e fim sejam flexíveis para registros recorrentes
ALTER TABLE agend_bloqueios ALTER COLUMN inicio DROP NOT NULL;
ALTER TABLE agend_bloqueios ALTER COLUMN fim DROP NOT NULL;

-- Atualizar constraint de agend_bloqueios
ALTER TABLE agend_bloqueios DROP CONSTRAINT IF EXISTS agend_bloqueios_check;
ALTER TABLE agend_bloqueios ADD CONSTRAINT agend_bloqueios_check 
  CHECK (
    (tipo = 'recorrente' AND (hora_fim IS NULL OR hora_inicio IS NULL OR hora_fim > hora_inicio)) 
    OR 
    (tipo = 'data' AND (fim IS NULL OR inicio IS NULL OR fim > inicio))
    OR
    (tipo IS NULL AND (fim IS NULL OR inicio IS NULL OR fim > inicio))
  );

CREATE INDEX IF NOT EXISTS idx_agend_bloqueios_tipo ON agend_bloqueios(tipo);

-- Recarregar o cache do PostgREST
NOTIFY pgrst, 'reload schema';

