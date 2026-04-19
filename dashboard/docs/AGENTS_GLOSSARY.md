# Glossário OpenSquad

Termos do domínio que toda IA / dev trabalhando neste repo precisa entender.

| Termo | Definição | Onde aparece no código |
|---|---|---|
| **Squad** | Time de agentes IA que executa um pipeline coordenado. Tem código único (ex: `shlomo-engineering`), nome, descrição, triggers e pipeline_file. | tabela `squads`, página `/squads` |
| **Agente** | Membro de um squad com role específica e modelo IA atribuído. Tem `system_prompt`, `model`, `status`. | tabela `agents`, página `/agents` |
| **Skill** | Capacidade reutilizável que um agente pode usar (ex: enviar email via Resend, postar no Instagram, gerar imagem). 10 skills no catálogo OpenSquad real. | tabela `skills`, página `/skills` |
| **Pipeline** | Sequência ordenada de steps, cada step executado por um agente, com handoff para o próximo. | coluna `pipeline_file`, edge function `orchestrate` |
| **Step** | Um passo do pipeline. `step_current/step_total` em `runs`. | tabela `runs` |
| **Handoff** | Entrega de contexto entre dois agentes consecutivos. Carrega a mensagem/output que o anterior produziu. | tabela `handoffs` |
| **Trigger** | Palavra-gatilho que dispara um squad via WhatsApp ou /command (ex: "shlomo", "agenda"). | coluna `squads.triggers` |
| **Run** | Execução concreta de um pipeline. Tem status, custo, tokens, logs. | tabela `runs`, página `/runs` |
| **Status do agente** | `idle` (parado) → `working` (executando) → `delivering` (entregando handoff) → `done` (concluído) → `checkpoint` (pausa para validação humana). | enum `agent_status` |
| **Status do squad** | `idle` / `running` / `completed` / `checkpoint`. | coluna `squads.status` |
| **Status do run** | `queued` / `running` / `success` / `failed` / `cancelled`. | enum `run_status` |
| **Auto-run** | Flag por squad que indica se ele dispara automaticamente sem confirmação humana. | coluna `squads.auto_run` |
| **Response max chars** | Limite de caracteres para resposta enviada de volta ao WhatsApp. | coluna `squads.response_max_chars` |
| **Office View** | Visualização visual estilo "escritório" mostrando agentes em mesas (`desk_col`, `desk_row`) com status colorido. | componente `SquadOfficeView` |
| **Comando** | Texto ou voz que o operador envia para iniciar um pipeline. | página `/command` |
| **Fila / Queue** | Comandos vindos do WhatsApp aguardando processamento. | tabela `tasks`, página `/tasks` |
| **Lovable AI Gateway** | Proxy que dá acesso a múltiplos modelos (Gemini, GPT-5) sem precisar de API key direta. | edge function `orchestrate` |

## Squads de referência (do repo original)

- **shlomo-engineering** — Engenharia de dados/PDF: PDF Parser → Classification Engine → QA Validator → Dashboard Builder.
- **gestao-pessoal** — Assistente pessoal: agenda, lembretes, tarefas.
- **dev-assistant** — Apoio a desenvolvimento.

## Skills de referência (catálogo OpenSquad)

apify, blotato, canva, image-ai-generator, instagram-publisher, resend, whatsapp-integration, opensquad-skill-creator, opensquad-agent-creator.
