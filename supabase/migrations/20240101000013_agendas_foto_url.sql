-- Adicionar coluna foto_url na tabela agend_profissionais
ALTER TABLE agend_profissionais ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Recarregar o cache do PostgREST
NOTIFY pgrst, 'reload schema';
