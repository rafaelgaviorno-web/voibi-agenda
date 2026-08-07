-- Adicionar coluna para controlar as abas que o usuário tem acesso
-- Vamos usar JSONB para flexibilidade de adicionar futuras abas sem precisar de array puro.
ALTER TABLE agend_usuarios ADD COLUMN IF NOT EXISTS abas_acesso JSONB DEFAULT '[]'::jsonb;
