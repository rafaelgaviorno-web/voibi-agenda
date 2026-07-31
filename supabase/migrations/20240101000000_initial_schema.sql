-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- Necessário para a exclusão temporal

-- 1. Empresas
CREATE TABLE agend_empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    fuso_horario TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    api_key UUID DEFAULT uuid_generate_v4() UNIQUE,
    webhook_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Usuários (Admins/Profissionais do Painel)
CREATE TABLE agend_usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES agend_empresas(id) ON DELETE CASCADE,
    papel TEXT NOT NULL CHECK (papel IN ('admin', 'profissional')),
    nome TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Profissionais
CREATE TABLE agend_profissionais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES agend_empresas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES agend_usuarios(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(empresa_id, slug)
);

-- 4. Tipos de Evento
CREATE TABLE agend_tipos_evento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profissional_id UUID REFERENCES agend_profissionais(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    slug TEXT NOT NULL,
    duracao_minutos INTEGER NOT NULL,
    buffer_antes_minutos INTEGER DEFAULT 0,
    buffer_depois_minutos INTEGER DEFAULT 0,
    antecedencia_min_horas INTEGER DEFAULT 24,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profissional_id, slug)
);

-- 5. Disponibilidade (Regras Semanais)
CREATE TABLE agend_disponibilidade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profissional_id UUID REFERENCES agend_profissionais(id) ON DELETE CASCADE,
    dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    CONSTRAINT agend_disponibilidade_check CHECK (hora_fim > hora_inicio)
);

-- 6. Bloqueios (Exceções / Férias)
CREATE TABLE agend_bloqueios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profissional_id UUID REFERENCES agend_profissionais(id) ON DELETE CASCADE,
    inicio TIMESTAMPTZ NOT NULL,
    fim TIMESTAMPTZ NOT NULL,
    motivo TEXT,
    CONSTRAINT agend_bloqueios_check CHECK (fim > inicio)
);

-- 7. Clientes Finais
CREATE TABLE agend_clientes_finais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES agend_empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    UNIQUE(empresa_id, email),
    UNIQUE(empresa_id, telefone)
);

-- 8. Agendamentos
CREATE TABLE agend_agendamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES agend_empresas(id) ON DELETE CASCADE,
    profissional_id UUID REFERENCES agend_profissionais(id) ON DELETE CASCADE,
    tipo_evento_id UUID REFERENCES agend_tipos_evento(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES agend_clientes_finais(id) ON DELETE CASCADE,
    inicio TIMESTAMPTZ NOT NULL,
    fim TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('confirmado', 'cancelado', 'remarcado', 'concluido')),
    lembrete_24h_enviado BOOLEAN DEFAULT FALSE,
    lembrete_2h_enviado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT agend_agendamentos_check CHECK (fim > inicio),
    EXCLUDE USING gist (
        profissional_id WITH =,
        tstzrange(inicio, fim) WITH &&
    ) WHERE (status IN ('confirmado', 'remarcado'))
);

-- RLS (Row Level Security)
ALTER TABLE agend_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE agend_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE agend_profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE agend_tipos_evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE agend_disponibilidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE agend_bloqueios ENABLE ROW LEVEL SECURITY;
ALTER TABLE agend_clientes_finais ENABLE ROW LEVEL SECURITY;
ALTER TABLE agend_agendamentos ENABLE ROW LEVEL SECURITY;

-- Regras genéricas (permitindo tudo para service role, a camada API vai proteger o acesso)
CREATE POLICY "Permitir tudo para auth anon ou admin (Placeholder para MVP)" 
ON agend_empresas FOR ALL USING (true);
CREATE POLICY "Permitir tudo para auth anon ou admin (Placeholder para MVP)" 
ON agend_usuarios FOR ALL USING (true);
CREATE POLICY "Permitir tudo para auth anon ou admin (Placeholder para MVP)" 
ON agend_profissionais FOR ALL USING (true);
CREATE POLICY "Permitir tudo para auth anon ou admin (Placeholder para MVP)" 
ON agend_tipos_evento FOR ALL USING (true);
CREATE POLICY "Permitir tudo para auth anon ou admin (Placeholder para MVP)" 
ON agend_disponibilidade FOR ALL USING (true);
CREATE POLICY "Permitir tudo para auth anon ou admin (Placeholder para MVP)" 
ON agend_bloqueios FOR ALL USING (true);
CREATE POLICY "Permitir tudo para auth anon ou admin (Placeholder para MVP)" 
ON agend_clientes_finais FOR ALL USING (true);
CREATE POLICY "Permitir tudo para auth anon ou admin (Placeholder para MVP)" 
ON agend_agendamentos FOR ALL USING (true);
