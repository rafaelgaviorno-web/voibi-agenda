-- 1. Criação da tabela de Planos
CREATE TABLE agend_planos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL UNIQUE,
    max_agendas INTEGER NOT NULL DEFAULT 1, -- Uso de -1 ou 0 para ilimitado, se desejado
    preco_mensal NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir alguns planos padrão para facilitar
INSERT INTO agend_planos (nome, max_agendas, preco_mensal) VALUES
('Starter', 1, 49.90),
('Pro', 5, 149.90),
('Enterprise', -1, 499.90); -- -1 = Ilimitado

-- 2. Atualizar a tabela de Empresas para receber o plano
ALTER TABLE agend_empresas
ADD COLUMN plano_id UUID REFERENCES agend_planos(id) ON DELETE SET NULL;

-- Atualizar empresas antigas para o plano Starter (1 agenda)
UPDATE agend_empresas 
SET plano_id = (SELECT id FROM agend_planos WHERE nome = 'Starter')
WHERE plano_id IS NULL;

-- 3. RLS Policies
ALTER TABLE agend_planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura publica dos planos" 
ON agend_planos FOR SELECT USING (true);

CREATE POLICY "Permitir gerenciamento de planos para admin" 
ON agend_planos FOR ALL USING (true); -- Placeholder para MVP
