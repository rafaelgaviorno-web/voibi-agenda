-- Adicionar colunas necessárias na tabela agend_profissionais
ALTER TABLE agend_profissionais ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE agend_profissionais ADD COLUMN IF NOT EXISTS permitir_sobreposicao BOOLEAN DEFAULT false;
ALTER TABLE agend_profissionais ADD COLUMN IF NOT EXISTS campos_personalizados JSONB DEFAULT '[]'::jsonb;

-- Recarregar o cache do PostgREST
NOTIFY pgrst, 'reload schema';
