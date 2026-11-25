// Agendas de vendas/reuniões (ex.: tipo "Comercial") atendem clientes, não pacientes.
export function rotuloPessoa(tipoAgenda?: string | null): 'Cliente' | 'Paciente' {
  return /comercial|vend|reuni|call|sdr/i.test(tipoAgenda || '') ? 'Cliente' : 'Paciente';
}
