# Prompts Prontos — Qwen 3.6 e Gemini 3.1 Pro

Copie e cole cada bloco na IA indicada. Os prompts foram escritos para serem executados em paralelo sem conflito de arquivos.

> Leia `PLANO_MULTI_IA.md` para entender o contexto completo.

---

## 🧱 QWEN 3.6 — Backend de Dados & Agentes

### PROMPT Q1 — Schema Prisma + Activity Logger (executar primeiro)

```
Você é Qwen 3.6, a IA backend do projeto OpenSquad (C:/inetpub/opensquad).
Leia PLANO_MULTI_IA.md antes de começar. Sua coluna na tabela de responsabilidades é "Qwen".

TAREFA 1/6: Evoluir o schema Prisma e criar o ActivityLogger.

1. Abrir orchestrator/prisma/schema.prisma e ADICIONAR (sem remover o que já existe) os seguintes models:

model Agent {
  id          String   @id                   // "pdf-parser-engineer"
  squadId     String
  name        String
  role        String
  icon        String?
  createdAt   DateTime @default(now())
  runs        AgentRun[]
  events      ActivityEvent[]
  fileTouches FileTouch[]
}

model SquadExecution {
  id              String   @id @default(uuid())
  squadId         String
  runId           String   @unique            // "2026-04-17-023000"
  status          String                      // running|completed|failed|aborted
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  triggeredBy     String                      // "whatsapp:+5511..." | "ui" | "cron"
  triggerMessage  String?
  totalCostUsd    Float    @default(0)
  totalTokens     Int      @default(0)
  runs            AgentRun[]
  events          ActivityEvent[]
}

model AgentRun {
  id            String   @id @default(uuid())
  executionId   String
  execution     SquadExecution @relation(fields: [executionId], references: [id])
  agentId       String
  agent         Agent     @relation(fields: [agentId], references: [id])
  status        String                        // idle|working|done|failed
  aiModel       String?
  startedAt     DateTime @default(now())
  completedAt   DateTime?
  tokensIn      Int      @default(0)
  tokensOut    Int      @default(0)
  costUsd       Float    @default(0)
  progressPct   Int      @default(0)
  currentTask   String?
  events        ActivityEvent[]
  fileTouches   FileTouch[]
}

model ActivityEvent {
  id            String   @id @default(uuid())
  timestamp     DateTime @default(now())
  executionId   String?
  execution     SquadExecution? @relation(fields: [executionId], references: [id])
  runId         String?
  run           AgentRun? @relation(fields: [runId], references: [id])
  agentId       String?
  agent         Agent?    @relation(fields: [agentId], references: [id])
  squadId       String?
  type          String                        // TASK_STARTED|FILE_READ|FILE_WRITE|TOOL_CALL|AI_CALL|TASK_COMPLETED|TASK_FAILED|MESSAGE
  filePath      String?
  toolName      String?
  aiModel       String?
  tokensIn      Int?
  tokensOut     Int?
  costUsd       Float?
  durationMs    Int?
  message       String?
  payloadJson   String?                       // JSON livre serializado
}

model FileTouch {
  id          String   @id @default(uuid())
  timestamp   DateTime @default(now())
  runId       String?
  run         AgentRun? @relation(fields: [runId], references: [id])
  agentId     String
  agent       Agent    @relation(fields: [agentId], references: [id])
  filePath    String
  action      String                          // read|write|delete|create
  linesAdded  Int?
  linesRemoved Int?
  diffPreview String?
}

model CostLedger {
  id          String   @id @default(uuid())
  date        DateTime @default(now())
  agentId     String?
  aiModel     String
  tokensIn    Int
  tokensOut   Int
  costUsd     Float
  taskType    String?
}

2. Rodar no terminal (PowerShell, Windows):
   cd orchestrator
   npx prisma migrate dev --name add_activity_tracking
   npx prisma generate

3. Criar orchestrator/services/activity-logger.js exportando:
   - logEvent(event)                  // persiste ActivityEvent + emite no EventEmitter global 'activity'
   - logFileTouch({agentId, runId, filePath, action, linesAdded, linesRemoved, diffPreview})
   - startAgentRun({executionId, agentId, aiModel, currentTask}) -> runId
   - finishAgentRun(runId, {status, tokensIn, tokensOut, costUsd})
   - logAiCall({runId, aiModel, tokensIn, tokensOut, costUsd, taskType}) // também grava em CostLedger
   Todas as funções devem ser async e usar PrismaClient singleton (reusar o já instanciado em orchestrator.js se possível, ou criar um novo em services/prisma.js).
   Adicionar um EventEmitter exportado como 'activityBus' para que o orchestrator possa fazer broadcast WebSocket.

4. Criar seed em orchestrator/prisma/seed-activity.js gerando:
   - 4 Agents: pdf-parser-engineer, classification-engine, dashboard-builder, qa-validator
   - 2 SquadExecutions (uma running, uma completed)
   - 6 AgentRuns
   - 30 ActivityEvents espalhados
   - 12 FileTouches
   - 20 CostLedger entries dos últimos 7 dias
   Rodar: node orchestrator/prisma/seed-activity.js

5. NÃO toque em: orchestrator/orchestrator.js, orchestrator/routes/webhooks.js, nem em skills/whatsapp-integration/*, dashboard/**, shlomo-ledger/**.

Ao terminar, imprima: "Q1 DONE — schema + activity-logger + seed prontos"
```

---

### PROMPT Q2 — Endpoints de Métricas e Agentes

```
Você é Qwen. Continue o trabalho. Tarefa 2/6.

Criar orchestrator/routes/agent-activity.js com os endpoints abaixo (Express Router). Usar o PrismaClient singleton.

1. GET /api/agents
   → Lista todos os Agents com último status (join com AgentRun mais recente)

2. GET /api/agents/live
   → Retorna agentes com AgentRun.status == 'working' agora (ordenar por startedAt desc)
   → Incluir campos: agentId, name, icon, squadId, currentTask, aiModel, progressPct, startedAt, elapsedMs

3. GET /api/agents/:id/timeline?limit=100
   → Últimos N ActivityEvents daquele agente, ordenados por timestamp desc

4. GET /api/agents/:id/files
   → Agrupa FileTouch por filePath, retorna [{filePath, touches, lastAction, lastAt}]

5. GET /api/executions/live
   → SquadExecutions com status 'running', com agentes ativos embutidos

6. GET /api/executions/:id
   → Detalhes completos da execução com runs e events

7. GET /api/metrics/costs?period=today|week|month
   → Soma CostLedger no período, retorna { total_usd, total_brl (usar 5.0 fixo), by_model: {...}, by_agent: {...}, by_day: [...] }

8. GET /api/metrics/throughput?period=today|week
   → Tarefas completadas por hora, retorna array [{hour, completed, failed}]

9. GET /api/metrics/top-files?limit=10
   → FileTouch agrupado por filePath, ordenado por count desc

10. GET /api/metrics/leaderboard
    → Ranking de agentes por: tasks_completed, total_cost, tokens_used, success_rate

11. Registrar o router em orchestrator/orchestrator.js adicionando:
    const agentActivityRoutes = require('./routes/agent-activity');
    app.use('/api', agentActivityRoutes);
    [ESTA É A ÚNICA LINHA QUE VOCÊ PODE ADICIONAR EM orchestrator.js — insira logo após a linha do uploadRoutes]

12. Testar cada endpoint com curl (ou Invoke-RestMethod no PowerShell) e mostrar amostra do resultado.

Ao terminar, imprima: "Q2 DONE — endpoints de métricas prontos"
```

---

### PROMPT Q3 — Parser real de PDFs (Nubank + Itaú)

```
Você é Qwen. Tarefa 3/6.

Implementar parsers reais de PDF de fatura em Node.js (para integrar no orchestrator).

1. Instalar dependências: cd orchestrator && npm install pdf-parse
2. Criar pasta squads/shlomo-engineering/parsers/
3. Criar squads/shlomo-engineering/parsers/base-parser.js com classe abstrata BaseParser:
   - async parse(pdfBuffer) -> { bank, period, transactions: [{date, description, amount, type}] }
4. Criar squads/shlomo-engineering/parsers/nubank-parser.js
   - Regex para linhas: /(\d{2}\/\d{2})\s+(.+?)\s+R\$\s*([\d\.,]+)/
   - Detectar "COMPRA PARCELADA" e extrair parcela atual
5. Criar squads/shlomo-engineering/parsers/itau-parser.js
   - Regex: /(\d{2}\.\d{2}\.\d{2})\s+(.+?)\s+([\d\.,]+)/
6. Criar squads/shlomo-engineering/parsers/parser-factory.js
   - detectBank(text) retorna 'nubank' | 'itau' | 'unknown'
   - getParser(bank) retorna instância correspondente
7. Criar testes em squads/shlomo-engineering/parsers/__tests__/parser.test.js
   - Usar PDFs fake (string com texto de fatura simulada) — mockar pdf-parse
8. Integrar: em orchestrator/routes/upload.js, após salvar PDF, chamar ParserFactory.getParser(bank).parse(buffer) e persistir Transactions no banco via Prisma.
   → Importante: também emitir ActivityEvent TASK_COMPLETED com o resumo do parse via activity-logger.

9. NÃO mexer em: dashboard/, shlomo-ledger/, skills/whatsapp-integration/, orchestrator/orchestrator.js (exceto a linha permitida na Q2).

Ao terminar, imprima: "Q3 DONE — parsers Nubank e Itaú funcionais"
```

---

### PROMPT Q4 — Classification Engine + Aprendizado

```
Você é Qwen. Tarefa 4/6.

Implementar motor de classificação com regex + score de confiança + aprendizado contínuo.

1. Criar squads/shlomo-engineering/classifier/rules.yaml com as regras iniciais do PROMPTS_ANTIGRAVITY.md (UBER/99, CONDOMINIO, SUPERMERCADO, NETFLIX, IFOOD, AMAZON, AWS, FACEBOOK ADS, etc.)
2. Criar squads/shlomo-engineering/classifier/classification-engine.js exportando:
   - classifyTransaction(transaction, userId) -> { contexto, pulmao, categoria, confianca, matchedRule }
   - classifyBatch(transactions, userId) -> Transaction[] classificadas
   - loadRules() — carrega rules.yaml + ClassificationRule do DB (merge)
   - saveRule(rule) — persiste nova regra
3. Criar squads/shlomo-engineering/classifier/rule-learner.js exportando:
   - suggestRuleFromCorrection(original, corrected) -> Rule candidate
   - promoteRule(ruleId) — se > 10 acertos, muda createdBy para SYSTEM
   - decayRules() — desativa regras sem uso há 30 dias
4. Adicionar endpoints em orchestrator/routes/agent-activity.js (mesmo arquivo):
   - POST /api/classify — body: { transactions: [...], userId }
   - POST /api/rules/suggest — sugere nova regra
   - POST /api/rules/approve — aprova sugestão
5. Emitir ActivityEvent TOOL_CALL para cada classifyBatch com contagem e custo zero (é local).

NÃO toque em: dashboard, shlomo-ledger, whatsapp skill, orchestrator.js.

Imprima: "Q4 DONE — classifier + learner prontos"
```

---

### PROMPT Q5 — Agentes Autônomos Auto-Dev

```
Você é Qwen. Tarefa 5/6.

Melhorar squads/shlomo-autodev/ para que o loop autônomo:
1. Leia roadmap de squads/shlomo-autodev/ROADMAP.md (criar com 10 features a implementar)
2. A cada ciclo, emita ActivityEvents via services/activity-logger.js do orchestrator
3. Registre AgentRun no banco com tokens/custo reais
4. Ao fim, atualize SquadExecution com totais

Arquivos:
- squads/shlomo-autodev/run-autodev.js (alterar)
- squads/shlomo-autodev/ROADMAP.md (criar)
- squads/shlomo-autodev/agents/*.md (revisar os 3 existentes: tech-lead, senior-dev, devops)

Importar o activity-logger assim:
  const logger = require('../../orchestrator/services/activity-logger');

Manter comportamento: não commitar se testes falharem. NÃO toque em dashboard nem shlomo-ledger.

Imprima: "Q5 DONE — autodev instrumentado"
```

---

### PROMPT Q6 — Validação e Testes

```
Você é Qwen. Tarefa 6/6.

1. Rodar seed: node orchestrator/prisma/seed-activity.js
2. Subir orchestrator: node orchestrator/orchestrator.js
3. Testar com PowerShell:
   Invoke-RestMethod http://localhost:3001/api/agents/live
   Invoke-RestMethod http://localhost:3001/api/metrics/costs?period=today
   Invoke-RestMethod http://localhost:3001/api/metrics/top-files
4. Corrigir qualquer erro encontrado
5. Escrever RELATORIO_QWEN.md na raiz com:
   - Endpoints implementados + exemplos
   - Schema final Prisma
   - Como rodar os testes dos parsers
   - Próximos passos sugeridos

Imprima: "Q6 DONE — backend validado, pronto para Gemini consumir"
```

---

## 🎨 GEMINI 3.1 PRO — Frontend Premium & UX

### PROMPT G1 — Base do Dashboard Detalhado

```
Você é Gemini 3.1 Pro, a IA frontend do projeto OpenSquad (C:/inetpub/opensquad).
Leia PLANO_MULTI_IA.md antes de começar. Sua coluna na tabela é "Gemini".

TAREFA 1/7: Estruturar o novo dashboard detalhado em dashboard/src/.

1. Instalar dependências: cd dashboard && npm install reactflow @nivo/calendar @nivo/heatmap framer-motion date-fns react-router-dom
2. Criar dashboard/src/types/activity.ts com interfaces:
   - ActivityEvent, AgentStatus, SquadSnapshot, CostMetrics, ThroughputPoint
   (seguir exatamente os contratos do PLANO_MULTI_IA.md §5)

3. Criar dashboard/src/lib/api.ts com fetcher tipado para:
   - GET /api/agents/live
   - GET /api/agents/:id/timeline
   - GET /api/agents/:id/files
   - GET /api/executions/live
   - GET /api/executions/:id
   - GET /api/metrics/costs
   - GET /api/metrics/throughput
   - GET /api/metrics/top-files
   - GET /api/metrics/leaderboard
   Use fetch com base URL configurável via import.meta.env.VITE_API_URL (default http://localhost:3001).

4. Criar dashboard/src/hooks/useLiveAgents.ts — polling 3s
   Criar dashboard/src/hooks/useAgentTimeline.ts
   Criar dashboard/src/hooks/useMetrics.ts
   Criar dashboard/src/hooks/useActivityStream.ts — WebSocket em /ws/activity com fallback para polling

5. Estender dashboard/src/store/useSquadStore.ts adicionando slices:
   - liveAgents: AgentStatus[]
   - activityFeed: ActivityEvent[] (cap em 200 últimos)
   - metrics: CostMetrics | null
   - selectedAgentId, selectedSquadId

NÃO toque em: orchestrator/, squads/, shlomo-ledger/, skills/whatsapp-integration/.

Imprima: "G1 DONE — base do dashboard estruturada"
```

---

### PROMPT G2 — Componentes Core (AgentCard, Timeline, Feed)

```
Você é Gemini. Tarefa 2/7.

Criar componentes visuais seguindo estética dark glassmorphism (bg-zinc-900, backdrop-blur, border-zinc-800, framer-motion para animações).

1. dashboard/src/components/AgentCard.tsx
   Props: agent: AgentStatus
   Layout:
   - Avatar circular (inicial do nome) com ring colorido pelo status (green=working, zinc=idle, blue=done, red=failed)
   - Nome + role em cima
   - Badge do modelo de IA atual
   - Linha de progresso animada (framer-motion) com progressPct
   - Rodapé: tempo gasto (formato "2m 34s") + custo hoje (USD)
   - Ícone pulsante quando status=working (usar framer-motion animate={{scale: [1, 1.1, 1]}})
   - Clicável: aciona store.setSelectedAgentId

2. dashboard/src/components/AgentTimeline.tsx
   Props: agentId: string
   - Usa useAgentTimeline(agentId)
   - Renderiza lista vertical com ícone por tipo de evento:
     TASK_STARTED=▶️, FILE_READ=📖, FILE_WRITE=✏️, TOOL_CALL=🔧, AI_CALL=🧠, TASK_COMPLETED=✅, TASK_FAILED=❌, MESSAGE=💬
   - Cada item: timestamp relativo (date-fns formatDistanceToNow), descrição derivada do payload, expansível
   - Auto-scroll ao chegar novo evento

3. dashboard/src/components/ActivityFeed.tsx
   - Stream global (últimos 50 eventos de todos os agentes)
   - Formato similar ao log do GitHub Actions
   - Filtros por squad / agente / tipo
   - Colorido por squad

4. dashboard/src/components/StatusDot.tsx — pequeno, reusável

5. Integrar no App.tsx mantendo compatibilidade com o SquadSelector existente:
   - Layout grid: sidebar (SquadSelector + MetricsCard resumido) | centro (AgentGrid + ActivityFeed) | direita (drawer com AgentTimeline do selecionado)
   - Se nenhum agente selecionado, mostra ActivityFeed ocupando a direita

NÃO editar: hooks/useSquadSocket.ts (manter como está), App.tsx original preservar estrutura mas adicionar novas views ao lado.

Imprima: "G2 DONE — AgentCard, Timeline, Feed prontos"
```

---

### PROMPT G3 — SquadGraph + CostHeatmap

```
Você é Gemini. Tarefa 3/7.

1. dashboard/src/components/SquadGraph.tsx
   - Usa reactflow
   - Nós = etapas do pipeline (carregar de /api/executions/:id)
   - Arestas = handoff entre agentes
   - Nó ativo piscando (CSS animation)
   - Nó completed = verde, failed = vermelho
   - Minimap no canto

2. dashboard/src/components/CostHeatmap.tsx
   - Usa @nivo/calendar
   - Props: period (last-30d, last-90d)
   - Cores: zinc-900 (zero) -> emerald-400 (alto custo)
   - Tooltip mostra breakdown por modelo

3. dashboard/src/components/MetricsCard.tsx
   - Card compacto com: total tasks, total cost today, success rate, avg duration
   - Sparkline com throughput da semana (recharts LineChart)

4. dashboard/src/components/FileTouchMap.tsx
   - Lista top 10 arquivos mais editados
   - Cada linha: ícone, path, n° edições, último agente que tocou, timestamp relativo
   - Clique abre diff preview em modal

5. dashboard/src/components/Leaderboard.tsx
   - Ranking de agentes por produtividade, com badges (🥇🥈🥉)

Integrar as novas views no App.tsx em uma página /metrics acessível pelo SquadSelector footer.

Imprima: "G3 DONE — graph + heatmap + leaderboard prontos"
```

---

### PROMPT G4 — Shlomo Ledger Polishing

```
Você é Gemini. Tarefa 4/7.

Revisar e polir shlomo-ledger/src/components/* (LungCard, MonthlyOverview, TransactionTable, RoyaltyTracker, LaunchTimeline, CampaignCard, PDFUploader).

Melhorias:
1. Mobile-first responsividade (testar em 375px, 768px, 1440px)
2. Acessibilidade: aria-labels, focus rings, contraste AA
3. Skeleton loaders enquanto carrega
4. Empty states ilustrados quando sem dados
5. Animações sutis de entrada (framer-motion stagger)
6. Dark mode é o default, adicionar toggle light mode via Tailwind dark: classes

Integrar shlomo-ledger ao dashboard principal via iframe OU rota React Router compartilhada (preferir router).

NÃO mexer em: orchestrator/, squads/, skills/.

Imprima: "G4 DONE — shlomo-ledger polido"
```

---

### PROMPT G5 — WhatsApp Control Panel UI

```
Você é Gemini. Tarefa 5/7.

Criar painel visual que espelha as interações via WhatsApp, em dashboard/src/components/WhatsAppPanel.tsx.

1. Layout:
   - Esquerda: histórico de mensagens (como chat, bolhas)
   - Direita: input de mensagem + botões rápidos (/status, /agentes, /custos, /relatorio)
   - Topo: status da conexão do bot (verde se conectado)

2. Hooks:
   - useWhatsAppMessages() — GET /api/whatsapp/messages?limit=50 (o Kilo vai implementar este endpoint, por enquanto mockar com dados estáticos)
   - sendCommand(text) — POST /api/whatsapp/send

3. Características:
   - Mensagens enviadas pelo bot: bolha cinza à esquerda
   - Mensagens do usuário: bolha azul à direita
   - Transcrições de áudio destacadas com ícone 🎤
   - PDFs anexados mostram thumbnail

4. Acessar via rota /whatsapp no router.

NÃO editar: skills/whatsapp-integration/ (Kilo cuida).

Imprima: "G5 DONE — WhatsApp panel pronto (aguardando endpoints Kilo)"
```

---

### PROMPT G6 — WebSocket Live + Notificações

```
Você é Gemini. Tarefa 6/7.

1. Em dashboard/src/hooks/useActivityStream.ts, conectar em ws://localhost:3001/ws/activity
2. Atualizar store.activityFeed ao receber novo evento
3. Toast notifications (usar sonner ou react-hot-toast) quando:
   - Agent inicia nova task
   - Agent completa task
   - Agent falha
   - Squad completa execução
4. Som opcional (toggle nas settings) quando task completa

Adicionar dashboard/src/components/NotificationCenter.tsx — ícone sino com badge de não lidas, abre drawer com últimas 20 notifs.

Imprima: "G6 DONE — live stream + notificações"
```

---

### PROMPT G7 — Validação Visual

```
Você é Gemini. Tarefa 7/7.

1. cd dashboard && npm run dev
2. Abrir http://localhost:5173 e validar que:
   - AgentCard mostra agentes do seed de Qwen
   - Timeline renderiza eventos
   - CostHeatmap mostra últimos 7 dias do seed
   - Leaderboard lista agentes ordenados
3. Tirar prints (salvar em dashboard/docs/screenshots/)
4. Escrever RELATORIO_GEMINI.md com:
   - Componentes criados
   - Páginas e rotas
   - Pendências conhecidas
   - Sugestões de UX

Imprima: "G7 DONE — frontend validado"
```

---

## 🔄 Coordenação (Kilo)

### Comando de sincronização para você enviar nas 3 IAs simultaneamente

Depois de dar Q1 para Qwen, aguarde o "Q1 DONE" e então mande Q2 + G1 em paralelo. Gemini consegue trabalhar em G1 mesmo com Qwen em Q2 porque G1 só mexe em dashboard/.

Sequência recomendada:
1. `[KILO já fez]` PLANO_MULTI_IA.md + PROMPTS_MULTI_IA.md
2. `[QWEN]` Q1 (schema + activity-logger + seed) ← bloqueia Gemini
3. `[QWEN paralelo a GEMINI]` Q2 || G1 + G2
4. `[QWEN paralelo a GEMINI]` Q3 + Q4 || G3
5. `[KILO]` integrar activity-logger no orchestrator.js + novos comandos WhatsApp
6. `[QWEN paralelo a GEMINI]` Q5 + Q6 || G4 + G5 + G6
7. `[GEMINI]` G7 (validação visual)
8. `[KILO]` merge final + smoke test e2e

### Monitoramento
Cada IA escreve seu RELATORIO_<NOME>.md na raiz quando termina. Kilo lê os 3 e faz merge.
