# Voibi Agenda - Servidor MCP (Model Context Protocol)

Este servidor MCP integra o **Voibi Agenda** aos assistentes de IA (como Antigravity e Claude Desktop), permitindo que agentes autônomos consultem disponibilidades, listem agendamentos para confirmação, criem novas consultas e gerenciem cancelamentos de forma nativa via ferramentas semânticas.

---

## 🛠️ Ferramentas (Tools) Disponíveis

| Ferramenta | Descrição |
| :--- | :--- |
| **`voibi_list_agendas`** | Lista os profissionais e agendas da clínica. |
| **`voibi_list_event_types`** | Lista os tipos de procedimentos e suas durações/regras. |
| **`voibi_check_availability`** | Consulta horários livres para uma data (`date`), podendo filtrar por profissional e procedimento. |
| **`voibi_list_bookings`** | Consulta agendamentos marcados com filtros por data (`date`), status, profissional ou paciente (`telefone`/`email`). |
| **`voibi_get_booking`** | Consulta os dados completos de um agendamento específico por ID. |
| **`voibi_create_booking`** | Realiza um novo agendamento com validação automática de agenda e paciente. |
| **`voibi_update_booking`** | Atualiza um agendamento (horário, status ou registro de confirmação recebida). |
| **`voibi_cancel_booking`** | Cancela um agendamento, grava o motivo e aciona os webhooks da clínica. |

---

## ⚙️ Variáveis de Ambiente

- **`VOIBI_API_URL`**: URL da aplicação Voibi Agenda (Padrão: `http://localhost:3000`).
- **`VOIBI_API_KEY`**: Chave de API da clínica cadastrada no painel da Voibi Agenda.

---

## 🚀 Como testar localmente

```bash
node mcp/voibi-server.mjs
```
O servidor se comunicará via protocolo padrão STDIO (JSON-RPC 2.0).
