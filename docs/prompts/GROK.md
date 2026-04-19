# Prompts Grok Code Fast 1 — Backend Endpoints & Seed

Você é **Grok Code Fast 1**, operando no repositório `C:/inetpub/opensquad`. Seu papel: camada HTTP do orchestrator + seed de dados fake. Siga `PLANO_MULTI_IA.md` (stream A) e `docs/CONTRATOS.md`.

Regra-ouro: **só crie arquivos novos** (dentro da sua coluna §2 do plano) e adicione **no máximo 3 linhas** em `orchestrator/orchestrator.js` (registro de routers). Não toque em `activity-logger.js`, `schema.prisma`, `multi-ai-router.js`, nem em arquivos do Doubao ou Gemini.

Depois de cada tarefa, anote em `.kilo/coordination.log`:
```
[GROK] <ISO8601> GROK-N DONE — <resumo>
```

---

## GROK-1 — Seed de dados fake (PRIMEIRO, destrava Gemini)

```
Tarefa GROK-1/6.

Criar orchestrator/prisma/seed-activity.js populando o DB com dados realistas para desenvolvimento:

Contexto:
- Schema Prisma já aplicado (migration 20260417060004_add_activity_logger_models)
- Models: Agent NÃO existe no schema — use diretamente agentId como string em AgentRun/ActivityEvent/FileTouch/CostLedger
- Siga o schema atual em orchestrator/prisma/schema.prisma sem modificá-lo

Gerar:
1. 2 SquadExecution:
   - id=uuid, squadId='shlomo-engineering', status='running', priority=5, taskType='parse_and_classify', taskPayload='{}', startedAt=agora-30min
   - id=uuid, squadId='dev-assistant', status='completed', startedAt=ontem, completedAt=ontem+2h, durationMs=7200000
2. 6 AgentRun distribuídos entre as 2 execuções:
   - agentIds: 'pdf-parser-engineer', 'classification-engine', 'qa-validator', 'dashboard-builder', 'senior-dev', 'tech-writer'
   - aiModel variado: 'claude-3-5-sonnet', 'gpt-4o-mini', 'gemini-1.5-pro'
   - currentTask plausível em português
   - status: 3 'working', 2 'done', 1 'failed'
   - tokensIn/tokensOut/costUsd com valores realistas (200-4000 tokens, 0.001-0.15 USD)
3. 30 ActivityEvents espalhados nos últimos 2h, tipos variados (TASK_STARTED, FILE_READ, FILE_WRITE, TOOL_CALL, AI_CALL, TASK_COMPLETED), com squadId/agentId/runId coerentes
4. 12 FileTouch em arquivos plausíveis do repo (orchestrator/routes/monitor.js, dashboard/src/App.tsx, squads/shlomo-engineering/pipeline.json, etc.), linesAdded/linesRemoved e diffPreview curto
5. 20 CostLedger nos últimos 7 dias distribuídos por aiModel e agentId

Regras:
- Usar PrismaClient, chamar await prisma.$disconnect() no final
- Imprimir resumo: "✅ Seed: 2 executions, 6 runs, 30 events, 12 files, 20 costs"
- Se rodar 2x, limpar antes: await prisma.activityEvent.deleteMany(), fileTouch.deleteMany(), costLedger.deleteMany(), agentRun.deleteMany(), squadExecution.deleteMany()
- NÃO apagar User/Transaction/ClassificationRule

Rodar:
  cd orchestrator
  node prisma/seed-activity.js

Ao final, imprima exatamente: "GROK-1 DONE — seed populado"
```

---

## GROK-2 — Router /api/agents + /api/executions

```
Tarefa GROK-2/6. Depende: GROK-1 feito.

Criar orchestrator/routes/agent-activity.js como Express Router. Usar PrismaClient singleton (criar orchestrator/services/prisma.js se não existir: module.exports = new PrismaClient()).

Endpoints (seguir docs/CONTRATOS.md para shape de resposta):

1. GET /api/agents
   → Lista distinct de agentId em AgentRun, com último status e último aiModel.

2. GET /api/agents/live  (formato AgentStatus[])
   → Agentes com AgentRun.status='working' agora.
   → Para cada: agentId, name (usar agentId title-case), squadId (via execution), currentTask, aiModel, progressPct (derivar da duração vs média), startedAt, elapsedMs (agora - startedAt), tokensUsedToday (sum AgentRun do dia), costTodayUsd (sum), lastFileTouched (último FileTouch desse agentId).
   → Ordenar por startedAt desc.

3. GET /api/agents/:id/timeline?limit=100
   → ActivityEvents WHERE agentId=:id ORDER BY timestamp desc LIMIT ?limit.

4. GET /api/agents/:id/files
   → FileTouch groupBy filePath WHERE agentId=:id.
   → Retornar [{filePath, touches, lastAction, lastAt}].

5. GET /api/executions/live
   → SquadExecution WHERE status='running' + agentRuns embedded (only status='working').

6. GET /api/executions/:id  (formato SquadSnapshot)
   → SquadExecution findUnique + agentRuns + pipeline derivado de squad-registry.json (ler o arquivo) + totalCostUsd/totalTokens somados.

Validar:
  node orchestrator.js &
  curl http://localhost:3001/api/agents/live
  curl http://localhost:3001/api/executions/live

Imprima: "GROK-2 DONE — agent-activity router"
```

---

## GROK-3 — Router /api/metrics

```
Tarefa GROK-3/6.

Criar orchestrator/routes/metrics.js (Express Router).

1. GET /api/metrics/costs?period=today|week|month  (formato CostMetrics)
   → Soma CostLedger no período (hoje: desde meia-noite; week: últimos 7 dias; month: últimos 30).
   → Retorna {period, totalUsd, totalBrl: totalUsd*5.0, byModel: {...}, byAgent: {...}, byDay: [{date, usd}]}.

2. GET /api/metrics/throughput?period=today|week
   → Agrupa AgentRun por hora truncada. Retorna [{hour: ISO, completed, failed}].
   → Completed = status='done', failed = status='failed'.

3. GET /api/metrics/top-files?limit=10
   → FileTouch groupBy filePath, count desc, com lastAction/lastAt/lastAgentId.

4. GET /api/metrics/leaderboard  (formato LeaderboardEntry[])
   → Agrupa AgentRun por agentId nos últimos 30 dias:
     - tasksCompleted = count(status='done')
     - totalCostUsd = sum(costUsd)
     - tokensUsed = sum(tokensIn+tokensOut)
     - successRatePct = done / (done+failed) * 100
   → Ordenar por tasksCompleted desc.

Usar services/prisma.js. Validar com curl.

Imprima: "GROK-3 DONE — metrics router"
```

---

## GROK-4 — Registrar routers no orchestrator.js

```
Tarefa GROK-4/6.

Em orchestrator/orchestrator.js, LOCALIZAR a linha:
  app.use('/api/upload', uploadRoutes);

Adicionar IMEDIATAMENTE ABAIXO (e apenas isto):

  const agentActivityRoutes = require('./routes/agent-activity');
  app.use('/api', agentActivityRoutes);
  const metricsRoutes = require('./routes/metrics');
  app.use('/api', metricsRoutes);

Não mexer em mais nada no arquivo. Reiniciar o orchestrator e validar:
  curl http://localhost:3001/api/agents/live
  curl http://localhost:3001/api/metrics/costs?period=today

Imprima: "GROK-4 DONE — routers registrados"
```

---

## GROK-5 — API WhatsApp Panel

```
Tarefa GROK-5/6.

Criar orchestrator/routes/whatsapp-api.js:

1. GET /api/whatsapp/messages?limit=50
   → Por enquanto retorna array mock realista de 10 WhatsAppMessage (formato do CONTRATOS §9), misturando user/bot, com texto + uma mensagem com audioTranscript e uma com attachment PDF.
   → TODO(kilo): conectar com histórico real do mcp-whatsapp-server.

2. POST /api/whatsapp/send
   → Body {phoneNumber, text}
   → Faz POST http://localhost:3003/send (MCP WhatsApp server — se não responder, retorna 503 com {ok:false, error:'whatsapp-bot-offline'})
   → Sucesso: {ok:true}

Registrar em orchestrator.js ABAIXO dos routers do GROK-4:
  const whatsappApiRoutes = require('./routes/whatsapp-api');
  app.use('/api/whatsapp', whatsappApiRoutes);

Imprima: "GROK-5 DONE — whatsapp api"
```

---

## GROK-6 — Validação + RELATORIO_GROK.md

```
Tarefa GROK-6/6.

1. Com orchestrator rodando, testar TODOS os endpoints criados:
   curl -s http://localhost:3001/api/agents
   curl -s http://localhost:3001/api/agents/live
   curl -s http://localhost:3001/api/executions/live
   curl -s http://localhost:3001/api/metrics/costs?period=today
   curl -s http://localhost:3001/api/metrics/throughput?period=today
   curl -s http://localhost:3001/api/metrics/top-files
   curl -s http://localhost:3001/api/metrics/leaderboard
   curl -s http://localhost:3001/api/whatsapp/messages

2. Corrigir qualquer 500.

3. Escrever RELATORIO_GROK.md na raiz com:
   - Endpoints implementados (lista com path + exemplo de response truncado)
   - Arquivos criados
   - Linhas adicionadas em orchestrator.js (colar trecho)
   - Como rodar o seed
   - Problemas encontrados / pendências

Imprima: "GROK-6 DONE — backend Grok validado"
```

---

# === SPRINT 2 ===

## GROK-7 — Autenticação JWT (cadastro, login, sessão)

```
Tarefa GROK-7. Sprint 2. Instalar auth básica mas sólida.

1. cd orchestrator && npm install jsonwebtoken bcryptjs cookie-parser zod

2. Schema Prisma: adicionar em orchestrator/prisma/schema.prisma o model AuthUser (NAO editar User existente):
   model AuthUser {
     id           String   @id @default(uuid())
     email        String   @unique
     passwordHash String
     name         String
     role         String   @default("user")
     createdAt    DateTime @default(now())
     lastLoginAt  DateTime?
   }
   Rodar: npx prisma migrate dev --name add_auth_user

3. orchestrator/middleware/auth.js:
   - verifyJWT(req,res,next): le cookie opensquad_token ou header Authorization Bearer, valida, poe req.user
   - requireAuth: 401 se nao autenticado
   - requireAdmin: 403 se role != admin
   Usar SECRET de process.env.JWT_SECRET (default 'dev-secret-change-me')

4. orchestrator/middleware/validate.js: validate(schema) middleware que usa zod: { body | query | params }

5. orchestrator/routes/auth.js (Express Router):
   - POST /api/auth/signup body {email, password, name} -> cria AuthUser, retorna {token, user}, seta cookie httpOnly
   - POST /api/auth/login   body {email, password} -> valida bcrypt, retorna {token, user}, seta cookie
   - POST /api/auth/logout  limpa cookie
   - GET  /api/auth/me      requireAuth -> retorna user sem passwordHash

6. Em orchestrator.js: app.use(cookieParser()); app.use('/api/auth', authRoutes). NAO proteger rotas existentes ainda.

7. Seed admin inicial (append em seed-activity.js): AuthUser admin email='admin@opensquad.dev' password='admin123' role='admin'.

Imprima: "GROK-7 DONE — auth JWT"
```

---

## GROK-8 — Endpoints de Transactions (CRUD + busca + aprovacao)

```
Tarefa GROK-8.

orchestrator/routes/transactions.js:

1. GET /api/transactions?page=1&limit=50&contexto=PF&pulmao=1&search=uber&from=ISO&to=ISO -> {items,total,page,pageSize}
2. GET /api/transactions/:id -> detalhe
3. PATCH /api/transactions/:id body {contexto?, pulmao?, categoria?, descricao?}
   -> Se contexto/pulmao/categoria mudou, chama POST /api/rules/suggest com a correcao
   -> Emite ActivityEvent TOOL_CALL {toolName:'transaction_update', agentId:'user'}
4. DELETE /api/transactions/:id (soft delete via campo deletedAt — adicionar ao schema Transaction)
5. POST /api/transactions/bulk body {ids:[], action:'approve'|'recategorize', payload:{...}}
6. GET /api/transactions/summary?month=2026-04 -> totais por pulmao/contexto/categoria

Validar com zod via middleware/validate.js.

Imprima: "GROK-8 DONE — transactions CRUD"
```

---

## GROK-9 — BullMQ Queue para Squads

```
Tarefa GROK-9.

1. cd orchestrator && npm install bullmq ioredis
2. orchestrator/services/queue.js exportando { addSquadJob(squadId, payload), getQueueStatus() }
   Se REDIS_URL ausente, usar fallback em memoria (adapter queue-memory.js)
3. orchestrator/workers/squad-worker.js — processor com concurrency=MAX_CONCURRENT_SQUADS (default 3), emitindo ActivityEvents
4. POST /execute agora enfileira via queue.addSquadJob e retorna {jobId, status:'queued'}. Backward-compat: header X-Sync=true executa sync como antes.
5. GET /api/queue/status -> {active, waiting, completed, failed, delayed}
6. GET /api/queue/jobs/:id -> status

Imprima: "GROK-9 DONE — queue"
```

---

## GROK-10 — Sistema de alertas (budget + squad failures)

```
Tarefa GROK-10. orchestrator/services/alerts.js:

1. checkBudget() a cada 5min via scheduler:
   - Soma CostLedger do dia
   - Se > process.env.DAILY_BUDGET_USD (default 5.0): dispara alerta
   - Evita duplicados via Map com TTL
2. alertChannels: 'whatsapp' (POST localhost:3003/send), 'webhook' (POST ALERT_WEBHOOK), 'log' (console.warn)
3. Tipos: BUDGET_EXCEEDED, SQUAD_FAILED (listener em activityBus type=TASK_FAILED), QUEUE_BACKLOG (waiting>20), AGENT_STUCK (running>30min)
4. Schema: model Alert { id, type, severity, message, triggeredAt, resolvedAt?, metadataJson }
5. GET /api/alerts?limit=50 -> historico; POST /api/alerts/:id/resolve -> marca resolvedAt

Imprima: "GROK-10 DONE — alerts"
```

---

## GROK-11 — Scheduler (node-cron)

```
Tarefa GROK-11.

1. cd orchestrator && npm install node-cron
2. Schema: model ScheduledJob { id, name, cron, squadId, payloadJson?, enabled, lastRunAt?, nextRunAt? }
3. Ao subir o orchestrator, carregar ScheduledJob enabled e registrar em cron.
4. Endpoints: GET /api/schedules; POST (cria+registra); PATCH /:id (re-registra); DELETE /:id (desregistra); POST /:id/run-now (dispara via queue).
5. Seed: job "relatorio-diario" cron "0 9 * * *" squad 'shlomo-engineering' taskType='daily_report'.

Imprima: "GROK-11 DONE — scheduler"
```

---

## GROK-12 — Exports CSV/PDF

```
Tarefa GROK-12.

1. cd orchestrator && npm install json2csv pdfkit
2. orchestrator/routes/exports.js:
   - GET /api/exports/transactions.csv?month=YYYY-MM&contexto=PF -> stream CSV
   - GET /api/exports/report.pdf?month=YYYY-MM -> PDF: capa com logo, resumo por pulmao, top 10 categorias, total vs budget, rodape com data.
   - GET /api/exports/activity.csv?from=&to= -> eventos do periodo
3. Emitir ActivityEvent ao exportar.

Imprima: "GROK-12 DONE — exports"
```

---

## GROK-13 — Busca global

```
Tarefa GROK-13.

GET /api/search?q=termo&types=transactions,agents,files,events&limit=20
- Promise.all: transactions (descricao/categoria), agents (id/name), files (FileTouch.filePath), events (ActivityEvent.message)
- Retorna {transactions, agents, files, events}
- Rate limit 30req/min por IP (express-rate-limit)

cd orchestrator && npm install express-rate-limit

Imprima: "GROK-13 DONE — search"
```

---

## GROK-14 — Pino logger + Sentry + validacao final

```
Tarefa GROK-14.

1. cd orchestrator && npm install pino pino-pretty @sentry/node
2. orchestrator/services/logger.js: pino prod level info; dev level debug com pino-pretty transport.
3. Sentry.init em orchestrator.js se SENTRY_DSN env presente: requestHandler + errorHandler.
4. Substituir console.log/error nos arquivos proprios (auth.js, queue.js, alerts.js, scheduler.js) por logger. NAO tocar nos arquivos do Doubao/Gemini.
5. Testar TODOS novos endpoints (auth, transactions, queue, schedules, alerts, exports, search).
6. RELATORIO_GROK_S2.md com endpoints + ENV vars + como rodar Redis.

Imprima: "GROK-14 DONE — logger+sentry+validacao"
```
