-- 1. Adicionar email e whatsapp na tabela de usuários
ALTER TABLE agend_usuarios ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE agend_usuarios ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE agend_usuarios ADD COLUMN IF NOT EXISTS senha_hash TEXT; -- Apenas para referência se usarem auth próprio no futuro, mas o Supabase usa auth.users

-- 2. Criar a tabela de junção (N:N) entre Usuários e Agendas (Profissionais)
CREATE TABLE IF NOT EXISTS agend_usuario_agendas (
    usuario_id UUID REFERENCES agend_usuarios(id) ON DELETE CASCADE,
    agenda_id UUID REFERENCES agend_profissionais(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (usuario_id, agenda_id)
);
