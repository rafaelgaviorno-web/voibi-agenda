-- Adiciona o campo obrigatório tipo_agenda na tabela agend_profissionais
ALTER TABLE agend_profissionais
  ADD COLUMN IF NOT EXISTS tipo_agenda TEXT;

-- Preenche agendas existentes para permitir a constraint NOT NULL
UPDATE agend_profissionais
SET tipo_agenda = 'Geral'
WHERE tipo_agenda IS NULL OR length(trim(tipo_agenda)) = 0;

ALTER TABLE agend_profissionais
  ALTER COLUMN tipo_agenda SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agend_profissionais_tipo_agenda_not_empty'
  ) THEN
    ALTER TABLE agend_profissionais
      ADD CONSTRAINT agend_profissionais_tipo_agenda_not_empty
      CHECK (length(trim(tipo_agenda)) > 0);
  END IF;
END $$;
