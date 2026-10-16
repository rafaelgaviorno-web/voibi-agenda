# Voibi Agenda - Servidor MCP (Model Context Protocol)

O servidor MCP integra o **Voibi Agenda** aos assistentes de inteligência artificial (**Claude**, **ChatGPT**, **Antigravity**, etc.), permitindo que agentes autônomos consultem disponibilidades em tempo real, listem agendamentos para confirmação, criem novas consultas e gerenciem cancelamentos de forma nativa através de ferramentas semânticas padronizadas.

---

## 🌐 1. Conexão no Claude via URL Remota (Recomendado)

O Claude suporta conexão nativa com servidores MCP remotos através do protocolo **Streamable HTTP / SSE**.

1. Acesse o **Claude** ([claude.ai](https://claude.ai) no navegador ou app Desktop).
2. Vá em **Settings (Configurações) ➔ Connectors (Conectores)** ou **Customize ➔ Connectors**.
3. Clique em **Add** ou **Add custom connector**.
4. No campo **URL**, informe:
   ```
   https://agenda.voibi.com.br/api/mcp?apiKey=SUA_CHAVE_API
   ```
5. Salve a configuração. O Claude descobrirá automaticamente as 8 ferramentas da sua clínica.

---

## 💻 2. Conexão no Claude Code CLI (Terminal)

```bash
claude mcp add --transport http voibi_agenda https://agenda.voibi.com.br/api/mcp --header "Authorization: Bearer SUA_CHAVE_API"
```

---

## 🖥️ 3. Conexão no Claude Desktop (`claude_desktop_config.json`)

No Claude Desktop, acesse **Settings ➔ Developer ➔ Edit Config** e adicione:

```json
{
  "mcpServers": {
    "voibi_agenda": {
      "type": "http",
      "url": "https://agenda.voibi.com.br/api/mcp",
      "headers": {
        "Authorization": "Bearer SUA_CHAVE_API"
      }
    }
  }
}
```

---

## 🛠️ Ferramentas (Tools) Disponíveis

| Ferramenta | Descrição |
| :--- | :--- |
| **`voibi_list_agendas`** | Lista todos os profissionais e agendas disponíveis da clínica. |
| **`voibi_list_event_types`** | Lista os procedimentos, durações e regras de agendamento. |
| **`voibi_check_availability`** | Consulta horários livres para uma data (`date`), podendo filtrar por profissional e procedimento. |
| **`voibi_list_bookings`** | Consulta agendamentos marcados com filtros por data (`date`), status, profissional ou paciente (`telefone`/`email`). |
| **`voibi_get_booking`** | Consulta os dados completos de um agendamento específico por ID. |
| **`voibi_create_booking`** | Realiza um novo agendamento com validação de agenda, paciente e conflito de horário. |
| **`voibi_update_booking`** | Atualiza um agendamento (horário, status ou registro de confirmação recebida). |
| **`voibi_cancel_booking`** | Cancela um agendamento, grava o motivo e aciona os webhooks da clínica. |

---

## 🚀 Desenvolvimento Local (STDIO)

```bash
VOIBI_API_URL=http://localhost:3000 VOIBI_API_KEY=sua_chave node mcp/voibi-server.mjs
```
