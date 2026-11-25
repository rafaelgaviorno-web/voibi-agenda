-- Superadmin decide, por empresa, se a opção "Conectar Google Agenda" aparece nas agendas.
-- Desligado = a aba some e a sincronização com o Google para (as contas já conectadas ficam guardadas).
ALTER TABLE agend_empresas
  ADD COLUMN IF NOT EXISTS google_agenda_habilitado BOOLEAN NOT NULL DEFAULT FALSE;
