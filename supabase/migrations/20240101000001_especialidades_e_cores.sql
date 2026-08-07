-- 1. Tabela de Especialidades
CREATE TABLE agend_especialidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES agend_empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(empresa_id, nome)
);

ALTER TABLE agend_especialidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo para auth anon ou admin (Placeholder para MVP)" 
ON agend_especialidades FOR ALL USING (true);

-- 2. Modificação na tabela de Profissionais
ALTER TABLE agend_profissionais ADD COLUMN especialidade_id UUID REFERENCES agend_especialidades(id) ON DELETE SET NULL;
ALTER TABLE agend_profissionais ADD COLUMN cor TEXT DEFAULT '#3b82f6'; -- Azul padrão
