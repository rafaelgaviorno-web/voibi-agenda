-- 1. Adicionar empresa_id aos tipos de evento (Procedimentos globais)
ALTER TABLE agend_tipos_evento ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES agend_empresas(id) ON DELETE CASCADE;

-- 2. Remover obrigatoriedade de profissional_id (já que o procedimento pode ser global da clínica)
ALTER TABLE agend_tipos_evento ALTER COLUMN profissional_id DROP NOT NULL;

-- 3. Atualizar a constraint UNIQUE que existia (profissional_id, slug) para (empresa_id, slug)
ALTER TABLE agend_tipos_evento DROP CONSTRAINT IF EXISTS agend_tipos_evento_profissional_id_slug_key;
ALTER TABLE agend_tipos_evento ADD CONSTRAINT agend_tipos_evento_empresa_id_slug_key UNIQUE (empresa_id, slug);
