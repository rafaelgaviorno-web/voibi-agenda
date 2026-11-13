-- Adiciona suporte a datas liberadas (exceções de abertura) dentro de bloqueios recorrentes
ALTER TABLE agend_bloqueios
  ADD COLUMN IF NOT EXISTS datas_liberadas DATE[] DEFAULT '{}';

-- Recarregar o cache do PostgREST
NOTIFY pgrst, 'reload schema';

