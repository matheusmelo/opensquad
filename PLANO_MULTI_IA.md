# Plano Multi-IA v2 — OpenSquad (Sprint Aceleração)

**Data:** 2026-04-17
**Sprint:** Dashboard detalhado + Histórico de agentes + Controle WhatsApp + Parsers reais
**Princípio:** 3 streams 100% paralelos, zero conflito de arquivo, handoffs por contrato.

---

## 0. Status Atual (2026-04-17)

### ✅ Infraestrutura pronta (Kilo)
- `orchestrator/services/activity-logger.js` — logEvent, logFileTouch, startAgentRun, finishAgentRun, logAiCall, activityBus
- WebSocket broadcast em `ws://localhost:3002` para `/ws/activity`
- `orchestrator/prisma/schema.prisma` — models `SquadExecution`, `AgentRun`, `ActivityEvent`, `FileTouch`, `CostLedger` já presentes
- Migração `20260417060004_add_activity_logger_models` aplicada
- `orchestrator/multi-ai-router.js` — `logAiUsage()` integrado
- `skills/whatsapp-integration/mcp-whatsapp-server.js` — comandos `/agentes`, `/executar`, `/parar`, `/custos`, `/relatorio` criados
- `orchestrator/orchestrator.js` — emissão de `TASK_STARTED`, `MESSAGE`, `TASK_COMPLETED`

### ⏳ Pendente para este sprint
- Endpoints HTTP `/api/agents/*` e `/api/metrics/*` (stream Grok)
- Seed de dados fake (stream Grok, bloqueia Gemini)
- Parsers PDF reais Nubank/Itaú (stream Doubao)
- Classification Engine + aprendizado (stream Doubao)
- Dashboard detalhado completo (stream Gemini)
- Autodev instrumentado com activity-logger (stream Doubao)
- Smoke test e2e (Kilo, final)

---

## 1. Alocação por Força de Modelo

| Modelo | Papel | Força explorada |
|---|---|---|
| **Grok Code Fast 1** | **Backend glue & API layer** | Alta velocidade em CRUD, routing Express, queries Prisma repetitivas, wiring de seeds |
| **Doubao Seed 2.0 Pro** | **Lógica de domínio & agentes** | Reasoning em regex complexo, parsers bancários, motor de classificação com aprendizado, autodev autônomo |
| **Gemini 3.1 Pro** | **Frontend premium & UX** | Multimodal, excelência visual, React + reactflow + nivo, consumo de contratos |
| **Kilo (Claude)** | **Arquiteto & Merger** | Contratos, revisão cruzada, merges, smoke test e2e |

Ordenação por bloqueio:
1. **Grok entrega seed (G-A1) → destrava Gemini** (pode desenvolver UI com dados reais)
2. **Grok entrega endpoints (G-A2) → destrava Gemini fully-wired**
3. **Doubao trabalha 100% paralelo** (parsers e classifier independem de UI/endpoints — alimentam upload.js)
4. **Kilo integra + smoke test** no fim

---

## 2. Mapa de Arquivos — Zero Conflito

Cada arquivo tem UM dono. Se uma IA precisar mexer fora da sua coluna, **abre PR** e Kilo revisa.

| Arquivo / pasta | Kilo | Grok | Doubao | Gemini |
|---|:-:|:-:|:-:|:-:|
| `orchestrator/orchestrator.js` | ✅ | ⚠️* | | |
| `orchestrator/multi-ai-router.js` | ✅ | | | |
| `orchestrator/services/activity-logger.js` | ✅ | | | |
| `orchestrator/squad-registry.json` | ✅ | | | |
| `orchestrator/routes/webhooks.js` | ✅ | | | |
| `orchestrator/routes/upload.js` | | | ✅ | |
| `orchestrator/routes/monitor.js` | | ✅ | | |
| `orchestrator/routes/agent-activity.js` (novo) | | ✅ | | |
| `orchestrator/routes/metrics.js` (novo) | | ✅ | | |
| `orchestrator/prisma/schema.prisma` | ✅ | | | |
| `orchestrator/prisma/seed-activity.js` (novo) | | ✅ | | |
| `squads/shlomo-engineering/parsers/**` (novo) | | | ✅ | |
| `squads/shlomo-engineering/classifier/**` (novo) | | | ✅ | |
| `squads/shlomo-autodev/**` | | | ✅ | |
| `skills/whatsapp-integration/**` | ✅ | | | |
| `dashboard/src/components/**` | | | | ✅ |
| `dashboard/src/hooks/**` | | | | ✅ |
| `dashboard/src/store/**` | | | | ✅ |
| `dashboard/src/lib/**` | | | | ✅ |
| `dashboard/src/types/**` | | | | ✅ |
| `dashboard/src/App.tsx` | | | | ✅ |
| `shlomo-ledger/src/**` | | | | ✅ |

*Grok pode adicionar UMA linha em `orchestrator.js` (registro do router `agent-activity` + `metrics`). Ponto de entrada documentado.

### Branches
- `main` — protegida, só Kilo faz merge
- `feat/grok/backend-endpoints`
- `feat/grok/seed-activity`
- `feat/doubao/parsers`
- `feat/doubao/classifier`
- `feat/doubao/autodev`
- `feat/gemini/dashboard-v2`
- `feat/gemini/whatsapp-panel`
- `feat/kilo/*` (se Kilo precisar)

### Coordenação
- Cada IA escreve em `.kilo/coordination.log` (append): `[MODEL] [TIMESTAMP] action`
- Ao terminar cada tarefa: `RELATORIO_<MODEL>.md` na raiz
- Contratos em `docs/CONTRATOS.md` são **sagrados** — mudar exige consenso Kilo + autor

---

## 3. Contratos (single source of truth)

Arquivo: `docs/CONTRATOS.md` — Kilo mantém. Os 3 modelos só leem.

### ActivityEvent (emitido via `activityBus`, consumido por Gemini via WS)
```ts
type ActivityEvent = {
  id: string;
  timestamp: string; // ISO8601
  executionId?: string;
  runId?: string;
  agentId?: string;
  squadId?: string;
  type: 'TASK_STARTED' | 'FILE_READ' | 'FILE_WRITE' | 'TOOL_CALL'
      | 'AI_CALL' | 'TASK_COMPLETED' | 'TASK_FAILED' | 'MESSAGE';
  filePath?: string;
  toolName?: string;
  aiModel?: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  durationMs?: number;
  message?: string;
  payloadJson?: string;
};
```

### AgentStatus (derivado por `GET /api/agents/live`)
```ts
type AgentStatus = {
  agentId: string;
  name: string;
  icon?: string;
  squadId: string;
  status: 'idle' | 'working' | 'done' | 'failed';
  currentTask?: string;
  aiModel?: string;
  progressPct: number;
  startedAt?: string;
  elapsedMs?: number;
  tokensUsedToday: number;
  costTodayUsd: number;
  lastFileTouched?: string;
};
```

### SquadSnapshot (`GET /api/executions/:id`)
```ts
type SquadSnapshot = {
  squadId: string;
  executionId: string;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  pipeline: Array<{
    stepId: string;
    label: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    agentId: string;
  }>;
  activeAgents: string[];
  startedAt: string;
  completedAt?: string;
  totalCostUsd: number;
  totalTokens: number;
};
```

### ParsedStatement (produzido por `squads/shlomo-engineering/parsers/`)
```ts
type ParsedStatement = {
  bank: 'nubank' | 'itau' | 'bradesco' | 'unknown';
  period: { start: string; end: string }; // ISO date
  transactions: Array<{
    date: string;          // ISO date
    description: string;
    amount: number;        // centavos? NÃO — reais com 2 decimais
    type: 'debit' | 'credit';
    installment?: { current: number; total: number };
  }>;
};
```

### ClassificationResult (produzido por `classifier/classification-engine.js`)
```ts
type ClassificationResult = {
  contexto: 'PF' | 'PJ';
  pulmao?: 1 | 2 | 3; // null se PJ
  categoria: string;
  confianca: number; // 0..1
  matchedRule?: { id: string; pattern: string; source: 'yaml' | 'db' };
};
```

### WebSocket topics (já live em `:3002`)
- `/ws/activity` — todos os `ActivityEvent`
- `/ws/squad/:id` — filtra por squad
- `/ws/agent/:id` — filtra por agente

---

## 4. Streams de Execução

### 🚀 STREAM A — Grok Code Fast 1 (Backend endpoints + seed)

**Objetivo:** entregar todos os endpoints HTTP que o Gemini consome + seed fake para destravar frontend sem depender do Doubao.

Prompts em `docs/prompts/GROK.md`.

| # | Tarefa | Arquivos | Saída | Bloqueia |
|---|---|---|---|---|
| **G-A1** | Seed fake de dados (Agents, SquadExecutions, AgentRuns, 30 eventos, 12 file touches, 20 cost entries nos últimos 7 dias) | `orchestrator/prisma/seed-activity.js` (novo) | `"G-A1 DONE"` + DB populado | destrava Gemini |
| **G-A2** | Router `agent-activity.js`: `/api/agents`, `/api/agents/live`, `/api/agents/:id/timeline`, `/api/agents/:id/files`, `/api/executions/live`, `/api/executions/:id` | `orchestrator/routes/agent-activity.js` (novo) | endpoints respondendo | Gemini G-G2 |
| **G-A3** | Router `metrics.js`: `/api/metrics/costs`, `/api/metrics/throughput`, `/api/metrics/top-files`, `/api/metrics/leaderboard` | `orchestrator/routes/metrics.js` (novo) | endpoints respondendo | Gemini G-G3 |
| **G-A4** | Registrar routers em `orchestrator.js` (UMA linha cada, logo após `uploadRoutes`) | `orchestrator/orchestrator.js` (2 linhas) | smoke curl OK | |
| **G-A5** | Endpoints WhatsApp panel: `GET /api/whatsapp/messages`, `POST /api/whatsapp/send` (stub que chama MCP via HTTP) | `orchestrator/routes/whatsapp-api.js` (novo) + 1 linha em `orchestrator.js` | | Gemini G-G5 |
| **G-A6** | Validar com `curl`/PowerShell e escrever `RELATORIO_GROK.md` | raiz | relatório | |

**Regras Grok:**
- **Pode criar:** `orchestrator/routes/agent-activity.js`, `orchestrator/routes/metrics.js`, `orchestrator/routes/whatsapp-api.js`, `orchestrator/prisma/seed-activity.js`
- **Pode adicionar em `orchestrator.js`:** apenas 3 linhas `app.use(...)` logo após `uploadRoutes`
- **NÃO toca:** `activity-logger.js`, `multi-ai-router.js`, `schema.prisma`, nenhum arquivo do Doubao ou Gemini
- **Usa:** `PrismaClient` singleton — criar `orchestrator/services/prisma.js` se não existir (export único)

---

### 🧠 STREAM B — Doubao Seed 2.0 Pro (Domínio: parsers + classifier + autodev)

**Objetivo:** funcionalidade de domínio que não depende de UI nem endpoints — roda em paralelo ao Grok.

Prompts em `docs/prompts/DOUBAO.md`.

| # | Tarefa | Arquivos | Saída |
|---|---|---|---|
| **D-B1** | `base-parser.js` (classe abstrata) + `nubank-parser.js` + `itau-parser.js` + `parser-factory.js` | `squads/shlomo-engineering/parsers/*` | parsers testados |
| **D-B2** | Tests unitários com fixtures de texto (mock `pdf-parse`) | `squads/shlomo-engineering/parsers/__tests__/*` | `npm test` verde |
| **D-B3** | Integrar parser em `orchestrator/routes/upload.js`: após salvar PDF, chamar `ParserFactory.getParser(bank).parse(buffer)`, persistir `Transaction`s no DB, emitir `TASK_COMPLETED` via activity-logger | `orchestrator/routes/upload.js` (edit) | upload → DB + evento |
| **D-B4** | `classifier/rules.yaml` (regras iniciais: UBER/99, CONDOMINIO, SUPERMERCADO, NETFLIX, IFOOD, AMAZON, AWS, FACEBOOK ADS) + `classification-engine.js` (classifyTransaction, classifyBatch, loadRules) | `squads/shlomo-engineering/classifier/*` | |
| **D-B5** | `rule-learner.js` (suggestRuleFromCorrection, promoteRule, decayRules) + endpoints `POST /api/classify`, `POST /api/rules/suggest`, `POST /api/rules/approve` **em arquivo próprio** `orchestrator/routes/classifier.js` (novo) | | |
| **D-B6** | Instrumentar `squads/shlomo-autodev/run-autodev.js`: emite `ActivityEvent`s via `require('../../orchestrator/services/activity-logger')`, registra `AgentRun`, atualiza `SquadExecution` | `squads/shlomo-autodev/run-autodev.js`, `squads/shlomo-autodev/ROADMAP.md` (novo) | autodev aparece no dashboard |
| **D-B7** | `RELATORIO_DOUBAO.md` na raiz | | |

**Regras Doubao:**
- **Pode criar:** tudo dentro de `squads/shlomo-engineering/parsers/`, `squads/shlomo-engineering/classifier/`, `squads/shlomo-autodev/`, `orchestrator/routes/classifier.js`
- **Pode editar:** `orchestrator/routes/upload.js` (próprio do stream de dados)
- **Pode adicionar em `orchestrator.js`:** 1 linha `app.use('/api', classifierRoutes)` após os routers do Grok
- **NÃO toca:** schema.prisma, activity-logger.js, nenhum arquivo do Grok ou Gemini, dashboard, shlomo-ledger
- **Depende do Grok?** Não. Pode começar em paralelo — o `activity-logger` já está pronto e o schema está aplicado.

---

### 🎨 STREAM C — Gemini 3.1 Pro (Frontend premium)

**Objetivo:** dashboard detalhado v2 + WhatsApp panel + shlomo-ledger polish.

Prompts em `docs/prompts/GEMINI.md`.

| # | Tarefa | Depende | Entrega |
|---|---|---|---|
| **C-G1** | Base: `types/activity.ts` (cola os tipos do §3), `lib/api.ts` (fetcher), hooks (`useLiveAgents`, `useAgentTimeline`, `useMetrics`, `useActivityStream`), store extensions | nenhum (pode começar já) | estrutura pronta |
| **C-G2** | Componentes core: `AgentCard`, `AgentTimeline`, `ActivityFeed`, `StatusDot` | G-A1 (seed) | UI renderizando seed |
| **C-G3** | Avançados: `SquadGraph` (reactflow), `CostHeatmap` (@nivo/calendar), `MetricsCard`, `FileTouchMap`, `Leaderboard` | G-A3 | métricas visuais |
| **C-G4** | `App.tsx` com rotas (`/`, `/agent/:id`, `/squad/:id`, `/metrics`, `/whatsapp`) usando react-router-dom | C-G2, C-G3 | navegação |
| **C-G5** | `WhatsAppPanel.tsx` + hook `useWhatsAppMessages` | G-A5 | painel espelhando comandos |
| **C-G6** | WebSocket `useActivityStream` conectado em `ws://localhost:3002` + toasts (sonner) + `NotificationCenter` | (WS já live) | stream real-time |
| **C-G7** | Shlomo Ledger polish: mobile-first, a11y (aria, focus, contraste AA), skeletons, empty states, framer-motion stagger | nenhum | produção-ready |
| **C-G8** | Validação visual: `npm run dev`, screenshots em `dashboard/docs/screenshots/`, `RELATORIO_GEMINI.md` | tudo acima | relatório |

**Regras Gemini:**
- **Pode editar/criar:** tudo dentro de `dashboard/src/`, `shlomo-ledger/src/`, `dashboard/docs/`
- **NÃO toca:** orchestrator, squads, skills — nada fora do frontend
- **Base URL:** `VITE_API_URL=http://localhost:3001` (default), `VITE_WS_URL=ws://localhost:3002`
- **Estética:** dark glassmorphism (bg-zinc-900, backdrop-blur, border-zinc-800), framer-motion para transições, emojis nos event icons (`▶️📖✏️🔧🧠✅❌💬`)

---

## 5. Timeline (paralelismo máximo)

```
T+0h  ┌─────────────────────────────────────────────────────────┐
      │ Kilo: escreve plano v2 + contratos + coordination.log   │ ← agora
      └─────────────────────────────────────────────────────────┘
T+0h  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐
      │ Grok: G-A1   │  │ Doubao: D-B1+2 │  │ Gemini: C-G1     │ ← paralelo
      │ (seed)       │  │ (parsers+test) │  │ (base + hooks)   │
      └──────────────┘  └────────────────┘  └──────────────────┘
T+1h  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐
      │ Grok: G-A2   │  │ Doubao: D-B3+4 │  │ Gemini: C-G2     │
      │ (endpoints)  │  │ (upload+rules) │  │ (core components)│
      └──────────────┘  └────────────────┘  └──────────────────┘
T+2h  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐
      │ Grok: G-A3+4 │  │ Doubao: D-B5+6 │  │ Gemini: C-G3+C-G4│
      │ (metrics+reg)│  │ (learner+auto) │  │ (advanced+routes)│
      └──────────────┘  └────────────────┘  └──────────────────┘
T+3h  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐
      │ Grok: G-A5+6 │  │ Doubao: D-B7   │  │ Gemini: C-G5+C-G6│
      │ (wpp api+val)│  │ (relatorio)    │  │ (wpp panel + WS) │
      └──────────────┘  └────────────────┘  └──────────────────┘
T+4h  ┌──────────────┐                      ┌──────────────────┐
      │ Kilo: review │                      │ Gemini: C-G7+C-G8│
      │ + merge      │                      │ (ledger + val)   │
      └──────────────┘                      └──────────────────┘
T+5h  ┌─────────────────────────────────────────────────────────┐
      │ Kilo: smoke test e2e + deploy                           │
      └─────────────────────────────────────────────────────────┘
```

### Gating
- **Gemini C-G2** aguarda **Grok G-A1** (precisa de seed)
- **Gemini C-G3** aguarda **Grok G-A3** (precisa de endpoints métricas)
- **Gemini C-G5** aguarda **Grok G-A5** (precisa de endpoints WhatsApp)
- **Doubao** não bloqueia nem é bloqueado — roda 100% paralelo

---

## 6. Checklist de Smoke Test (Kilo, final)

```bash
# 1. DB + seed
cd orchestrator && npx prisma migrate deploy && node prisma/seed-activity.js

# 2. Orchestrator up
node orchestrator.js  # porta 3001 + WS 3002

# 3. Endpoints
curl http://localhost:3001/api/agents/live
curl http://localhost:3001/api/metrics/costs?period=today
curl http://localhost:3001/api/metrics/top-files
curl http://localhost:3001/api/executions/live

# 4. Upload PDF → parser real → classifier → DB
curl -X POST -F "file=@fixtures/nubank-fake.pdf" http://localhost:3001/api/upload

# 5. Dashboard
cd ../dashboard && npm run dev  # localhost:5173 — tudo deve renderizar

# 6. WhatsApp → Squad → Dashboard
# Enviar "/agentes" no WhatsApp, ver resposta; disparar "/executar shlomo-engineering parse"
# Ver evento aparecer ao vivo no dashboard via WS

# 7. Autodev
node squads/shlomo-autodev/run-autodev.js
# Ver AgentRun aparecer no dashboard
```

Critério de sucesso: os 7 passos verdes. Qualquer falha → bugfix com IA dona do arquivo.

---

## 7. Regras de Não-Conflito (rígidas)

1. **Declaração de intent:** antes de editar arquivo compartilhado, append em `.kilo/coordination.log`: `[MODEL] [ISO] editing <path> — reason`
2. **PR obrigatório** para qualquer arquivo fora da própria coluna (§2)
3. **Contratos são congelados** neste sprint. Mudança exige consenso Kilo + autor do consumidor
4. **Commit style:** `feat(scope): descrição` — scopes: `grok`, `doubao`, `gemini`, `kilo`, `dashboard`, `parser`, `classifier`, `autodev`, `whatsapp`
5. **Nunca rebase `main`** sem aviso
6. **Relatórios finais:** cada IA escreve `RELATORIO_<MODEL>.md` ao terminar — Kilo agrega em `RELATORIO_SPRINT.md`

---

## 8. Onde achar os prompts

- `docs/prompts/GROK.md` — 6 prompts para Grok Code Fast 1
- `docs/prompts/DOUBAO.md` — 7 prompts para Doubao Seed 2.0 Pro
- `docs/prompts/GEMINI.md` — 8 prompts para Gemini 3.1 Pro
- `docs/CONTRATOS.md` — contratos (single source of truth)

Copie e cole cada bloco no modelo correto. Entre tarefas, aguarde o sinal `<TASK_ID> DONE` antes de mandar a próxima do mesmo stream (mas os 3 streams rodam em paralelo).
