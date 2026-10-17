-- Alterar o valor default do status de agendamento para 'pendente'
ALTER TABLE agend_agendamentos ALTER COLUMN status SET DEFAULT 'pendente';
