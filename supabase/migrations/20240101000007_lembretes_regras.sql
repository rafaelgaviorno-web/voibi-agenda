-- Tabela de Regras de Lembretes Automáticos
CREATE TABLE IF NOT EXISTS agend_lembretes_regras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id TEXT NOT NULL REFERENCES agend_empresas(slug) ON DELETE CASCADE,
    nome TEXT NOT NULL, -- Ex: "2 dias antes", "1 hora antes"
    minutos_antes INTEGER NOT NULL, -- Quando enviar? Ex: 2880 (2 dias), 60 (1 hora)
    mensagem_template TEXT NOT NULL, -- O texto com variáveis (ex: {{cliente_nome}})
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
