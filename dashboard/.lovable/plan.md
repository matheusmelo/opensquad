
## Plano: Mesclar OpenSquad real ao dashboard + sync GitHub

### Sobre o GitHub
A conexão GitHub na Lovable cria **um repo NOVO** a partir deste projeto Lovable — ela não permite "puxar" código de um repo existente para dentro do projeto Lovable. A sincronização é bidirecional **com o repo criado pela Lovable**, não com `matheusmelo/opensquad`.

Duas opções para você manter UM repo só:
- **(A) Recomendado:** conectar GitHub na Lovable (cria `matheusmelo/<novo-nome>`), depois você copia manualmente os arquivos relevantes de `opensquad` (orchestrator, skills, _opensquad/) para esse novo repo via commit local. A partir daí tudo sincroniza.
- **(B)** Manter `opensquad` original como está e usar este Lovable como "frontend dashboard v2", sincronizando só este aqui.

Vou seguir lendo o repo `opensquad` direto via API do GitHub sempre que precisar de referência — não preciso clonar para mesclar conceitos.

### Conceitos do OpenSquad que vou mesclar no dashboard atual

O OpenSquad real é diferente do dashboard genérico atual. Principais conceitos:

- **Squads** (times de agentes) em vez de agentes soltos. Ex: `shlomo-engineering`, `gestao-pessoal`, `dev-assistant`.
- **Pipeline com handoff**: cada squad executa steps sequenciais; cada agente entrega para o próximo (`handoff.from → to`).
- **Status de agente**: `idle | working | delivering | done | checkpoint` (mais rico que ativo/pausado).
- **Status de squad**: `idle | running | completed | checkpoint`.
- **Skills** já existentes no repo: `apify`, `blotato`, `canva`, `image-ai-generator`, `instagram-publisher`, `resend`, `whatsapp-integration`, `opensquad-skill-creator`, `opensquad-agent-creator`.
- **Triggers WhatsApp**: cada squad tem palavras-gatilho que disparam execução.
- **Runs** com `run_id`, input/output folders, `pipeline_file`.

### Mudanças no dashboard

#### 1. Modelo de dados (migração SQL)
- Renomear conceito: adicionar tabela **`squads`** (id, code, name, description, icon, triggers[], pipeline_file, response_max_chars, auto_run, status).
- Tabela **`agents`**: adicionar coluna `squad_id` (FK), `role` (ex: "PDF Parser Engineer"), `gender`, `desk_col`, `desk_row`, mudar enum de status para `idle|working|delivering|done|checkpoint`.
- Tabela **`runs`**: adicionar `step_current`, `step_total`, `step_label`, `pipeline_file`.
- Nova tabela **`handoffs`** (run_id, from_agent, to_agent, message, completed_at).
- Skills: pré-popular catálogo com as 10 skills reais do OpenSquad (ícones e descrições do repo).

#### 2. Páginas atualizadas
- **Overview**: cards de KPI passam a mostrar "Squads ativos", "Runs em execução", "Handoffs últimas 24h", "Skills ativas". Lista "Squads em execução" com mini-progress (step current/total).
- **Nova página `/squads`** (substitui `/agents` como entrada principal): grid de cards de squads, cada um com ícone, descrição, lista de agentes, triggers WhatsApp, status, último run. Botão "Executar squad" e "Ver pipeline".
- **`/squads/:code`** (substitui AgentDetail): tabs **Pipeline** (timeline visual dos steps + handoffs), **Agentes** (membros do squad), **Triggers** (palavras-chave WhatsApp), **Runs** (histórico), **Configuração**.
- **`/agents`** vira sub-visão filtrável por squad.
- **Skills**: catálogo já existente recebe os 10 skills reais com ícones corretos e contagem de squads usando.
- **Tasks** vira **`/queue`**: fila de comandos vindos do WhatsApp aguardando squad.
- **Runs**: drawer de execução mostra timeline de handoffs entre agentes (não só logs).

#### 3. Novo componente: **SquadOfficeView**
Visualização inspirada no Phaser do repo original, mas em **CSS/SVG** (sem Phaser para manter leve): grid isométrico simples mostrando agentes em mesas, com indicador de status colorido pulsando quando `working`, seta animada quando `delivering`. Modo "compacto" (lista) e "office" (visual).

#### 4. Seed atualizado
- 2 squads reais (`shlomo-engineering`, `gestao-pessoal`) com agentes corretos (PDF Parser, Classification Engine, QA Validator, Dashboard Builder).
- 10 skills do catálogo OpenSquad.
- Runs de exemplo com handoffs realistas.

#### 5. Pequenos ajustes técnicos
- Corrigir warning do `ProtectedRoute` (envolver `Navigate` em fragment já está ok — o warning vem de outro lugar; investigar e silenciar).
- Manter design dark Linear/Vercel já implementado.
- Sidebar: adicionar item **Squads** acima de Agentes.

### Entregas desta iteração
1. Migração SQL: nova tabela `squads`, `handoffs`; colunas extras em `agents` e `runs`.
2. Página `/squads` (lista + detalhe com tabs).
3. Componente `SquadOfficeView` (CSS isométrico simples).
4. Skills atualizadas com catálogo real.
5. Overview revisado com KPIs de squads/handoffs.
6. Seed reescrito com dados reais do OpenSquad.
7. Sidebar reorganizada.

### O que NÃO entra agora (próximas iterações)
- Integração WhatsApp real (precisa de Twilio ou similar).
- Execução real do pipeline (chamadas a LLM).
- Importação automática de squad-registry.json do GitHub (faria sentido como botão "Sincronizar com repo").

### Sobre o GitHub — você precisa decidir
Antes de eu começar, me diga: **opção (A)** — conectar Lovable ao GitHub agora (cria repo novo, ex: `opensquad-dashboard`) e depois você unifica manualmente; ou **opção (B)** — seguimos só evoluindo este projeto Lovable como "v2 do dashboard" e você decide depois.
