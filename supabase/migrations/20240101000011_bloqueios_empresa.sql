-- Bloqueios pertencem a uma empresa (inclusive os gerais, sem profissional).
-- As colunas já existiam no banco de produção; aqui ficam registradas.
ALTER TABLE agend_bloqueios ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES agend_empresas(id) ON DELETE CASCADE;
ALTER TABLE agend_bloqueios ADD COLUMN IF NOT EXISTS unidade_id UUID;

-- Preenche a empresa dos bloqueios por profissional que ficaram sem ela
UPDATE agend_bloqueios b
SET empresa_id = p.empresa_id
FROM agend_profissionais p
WHERE b.profissional_id = p.id AND b.empresa_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_agend_bloqueios_empresa ON agend_bloqueios(empresa_id);
