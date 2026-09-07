-- Migration para criação da tabela de logs de requisições da API
CREATE TABLE IF NOT EXISTS agend_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES agend_empresas(id) ON DELETE CASCADE,
  metodo VARCHAR(10) NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INT NOT NULL,
  ip VARCHAR(45),
  user_agent TEXT,
  duracao_ms INT,
  request_headers JSONB,
  request_body JSONB,
  response_body JSONB,
  erro TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agend_api_logs_empresa_id ON agend_api_logs(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agend_api_logs_created_at ON agend_api_logs(created_at DESC);
