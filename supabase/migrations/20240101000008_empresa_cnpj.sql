ALTER TABLE agend_empresas ADD COLUMN IF NOT EXISTS cnpj TEXT;
NOTIFY pgrst, 'reload schema';
