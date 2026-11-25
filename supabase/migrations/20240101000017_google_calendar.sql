-- Integração com o Google Agenda (um calendário Google por agenda do Voibi Agenda).
--
-- O token do Google fica numa tabela própria, e não em agend_profissionais, porque a
-- tela de configuração da agenda carrega todos os campos do profissional no navegador.
-- RLS ligado e sem policies: só o servidor (service_role) lê e grava.

CREATE TABLE IF NOT EXISTS agend_google_contas (
  profissional_id UUID PRIMARY KEY REFERENCES agend_profissionais(id) ON DELETE CASCADE,
  email TEXT,
  refresh_token TEXT NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  bloquear_ocupados BOOLEAN NOT NULL DEFAULT TRUE, -- compromissos do Google bloqueiam horários no Voibi Agenda
  criar_meet BOOLEAN NOT NULL DEFAULT TRUE,        -- gera link do Google Meet em cada agendamento
  conectado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_erro TEXT,
  ultimo_erro_em TIMESTAMPTZ
);

ALTER TABLE agend_google_contas ENABLE ROW LEVEL SECURITY;

-- Evento criado no Google para cada agendamento
ALTER TABLE agend_agendamentos
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS meet_link TEXT;
