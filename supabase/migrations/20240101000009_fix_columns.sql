-- 1. Restaurar colunas deletadas de agend_tipos_evento
ALTER TABLE agend_tipos_evento ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE agend_tipos_evento ADD COLUMN IF NOT EXISTS buffer_antes_minutos INTEGER DEFAULT 0;
ALTER TABLE agend_tipos_evento ADD COLUMN IF NOT EXISTS buffer_depois_minutos INTEGER DEFAULT 0;
ALTER TABLE agend_tipos_evento ADD COLUMN IF NOT EXISTS antecedencia_min_horas INTEGER DEFAULT 24;

-- Atualizar slugs vazios para um slug baseado no nome
UPDATE agend_tipos_evento SET slug = lower(regexp_replace(nome, '[^a-zA-Z0-9]', '-', 'g')) WHERE slug IS NULL;

-- 2. Tabela: agend_agendamentos
ALTER TABLE agend_agendamentos ADD COLUMN IF NOT EXISTS is_encaixe BOOLEAN DEFAULT FALSE;
ALTER TABLE agend_agendamentos ADD COLUMN IF NOT EXISTS observacao TEXT;

-- Forçar o reload do cache do Supabase PostgREST
NOTIFY pgrst, 'reload schema';
