-- 1. Tabela: agend_tipos_evento (Procedimentos)
ALTER TABLE agend_tipos_evento ADD COLUMN IF NOT EXISTS is_recorrente BOOLEAN DEFAULT FALSE;

-- 2. Tabela: agend_agendamentos
ALTER TABLE agend_agendamentos ADD COLUMN IF NOT EXISTS is_encaixe BOOLEAN DEFAULT FALSE;
ALTER TABLE agend_agendamentos ADD COLUMN IF NOT EXISTS observacao TEXT;

-- Forçar o reload do cache do Supabase PostgREST
NOTIFY pgrst, 'reload schema';
