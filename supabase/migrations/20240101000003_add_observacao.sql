-- Adicionar coluna 'observacao' e 'whatsapp' (caso seja salvo no agendamento ou cliente)
-- Vamos adicionar 'observacao' em agend_agendamentos
ALTER TABLE agend_agendamentos ADD COLUMN IF NOT EXISTS observacao TEXT;

-- O whatsapp já pode estar no 'telefone' de agend_clientes_finais, mas vamos garantir
ALTER TABLE agend_clientes_finais ADD COLUMN IF NOT EXISTS whatsapp TEXT;
