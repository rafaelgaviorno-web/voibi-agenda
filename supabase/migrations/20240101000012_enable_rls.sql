-- Ativa Row Level Security em todas as tabelas do app.
--
-- Sem nenhuma policy, a chave pública (anon), que vai junto no código do navegador,
-- deixa de ler e de gravar essas tabelas. O servidor usa a service_role,
-- que ignora o RLS, então o app continua funcionando normalmente.
--
-- Pegamos todas as tabelas agend_* do schema public, inclusive as criadas
-- direto pelo painel do Supabase (agend_unidades, agend_regras_lembretes etc.).
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'agend\_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
