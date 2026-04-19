# Contratos OpenSquad (single source of truth)

> Este arquivo é **congelado** durante o sprint. Qualquer mudança exige consenso entre Kilo e o autor do consumidor. As 3 IAs (Grok, Doubao, Gemini) consomem e produzem conforme este documento.

---

## 1. ActivityEvent

Emitido por `orchestrator/services/activity-logger.js` via `activityBus.emit('activity', event)` e broadcast em `ws://localhost:3002` no topic `/ws/activity`.

```ts
type ActivityEventType =
  | 'TASK_STARTED'
  | 'FILE_READ'
  | 'FILE_WRITE'
  | 'TOOL_CALL'
  | 'AI_CALL'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'MESSAGE';

interface ActivityEvent {
  id: string;                    // uuid
  timestamp: string;             // ISO8601
  executionId?: string;
  runId?: string;
  agentId?: string;
  squadId?: string;
  type: ActivityEventType;
  filePath?: string;
  toolName?: string;
  aiModel?: string;
  tokensIn?: number;
  tokensOut?: number;
  costUsd?: number;
  durationMs?: number;
  message?: string;
  payloadJson?: string;          // JSON arbitrário serializado
}
```

WS message envelope: `{ "type": "ACTIVITY_EVENT", "data": <ActivityEvent> }`.

---

## 2. AgentStatus

Retorno de `GET /api/agents/live`.

```ts
interface AgentStatus {
  agentId: string;
  name: string;
  icon?: string;
  squadId: string;
  status: 'idle' | 'working' | 'done' | 'failed';
  currentTask?: string;
  aiModel?: string;
  progressPct: number;           // 0..100
  startedAt?: string;            // ISO8601
  elapsedMs?: number;
  tokensUsedToday: number;
  costTodayUsd: number;
  lastFileTouched?: string;
}
```

---

## 3. SquadSnapshot

Retorno de `GET /api/executions/:id`.

```ts
interface PipelineStep {
  stepId: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agentId: string;
}

interface SquadSnapshot {
  squadId: string;
  executionId: string;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  pipeline: PipelineStep[];
  activeAgents: string[];
  startedAt: string;
  completedAt?: string;
  totalCostUsd: number;
  totalTokens: number;
}
```

---

## 4. CostMetrics

Retorno de `GET /api/metrics/costs?period=today|week|month`.

```ts
interface CostMetrics {
  period: 'today' | 'week' | 'month';
  totalUsd: number;
  totalBrl: number;              // USD * 5.0 (câmbio fixo)
  byModel: Record<string, number>;       // { "gpt-4o-mini": 0.12, ... }
  byAgent: Record<string, number>;
  byDay: Array<{ date: string; usd: number }>;
}
```

---

## 5. ThroughputPoint

Retorno de `GET /api/metrics/throughput?period=today|week`.

```ts
interface ThroughputPoint {
  hour: string;                  // ISO8601 truncado para hora
  completed: number;
  failed: number;
}
```

---

## 6. TopFile / Leaderboard

```ts
interface TopFile {
  filePath: string;
  touches: number;
  lastAction: 'read' | 'write' | 'delete' | 'create';
  lastAt: string;
  lastAgentId: string;
}

interface LeaderboardEntry {
  agentId: string;
  name: string;
  tasksCompleted: number;
  totalCostUsd: number;
  tokensUsed: number;
  successRatePct: number;
}
```

---

## 7. ParsedStatement (saída dos parsers Doubao)

```ts
interface ParsedTransaction {
  date: string;                  // ISO date YYYY-MM-DD
  description: string;
  amount: number;                // reais com 2 decimais
  type: 'debit' | 'credit';
  installment?: { current: number; total: number };
}

interface ParsedStatement {
  bank: 'nubank' | 'itau' | 'bradesco' | 'santander' | 'inter' | 'unknown';
  period: { start: string; end: string };
  transactions: ParsedTransaction[];
}
```

---

## 8. ClassificationResult (saída do classifier Doubao)

```ts
interface ClassificationResult {
  contexto: 'PF' | 'PJ';
  pulmao?: 1 | 2 | 3;            // null se PJ
  categoria: string;
  confianca: number;             // 0..1
  matchedRule?: {
    id: string;
    pattern: string;
    source: 'yaml' | 'db';
  };
}
```

---

## 9. WhatsApp Messages

```ts
interface WhatsAppMessage {
  id: string;
  timestamp: string;
  from: 'user' | 'bot';
  phoneNumber: string;
  text?: string;
  audioTranscript?: string;
  attachments?: Array<{ kind: 'pdf' | 'image'; url: string; name: string }>;
}
```

Endpoints:
- `GET /api/whatsapp/messages?limit=50` → `WhatsAppMessage[]`
- `POST /api/whatsapp/send` — body `{ phoneNumber: string; text: string }` → `{ ok: true }`

---

## 10. WebSocket Topics

- `ws://localhost:3002/ws/activity` — todos os ActivityEvents
- `ws://localhost:3002/ws/squad/:id` — filtro por squad
- `ws://localhost:3002/ws/agent/:id` — filtro por agente

Envelope comum: `{ type: 'ACTIVITY_EVENT' | 'PING' | 'PONG' | 'WELCOME', data?: any }`.
