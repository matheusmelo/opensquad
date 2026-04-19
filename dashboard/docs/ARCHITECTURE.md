# Arquitetura — Orquestrador Orion

## Visão geral

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  Browser     │────►│  React + Vite       │────►│  Lovable Cloud       │
│  (usuário)   │     │  (este repo)        │     │  (Supabase)          │
│              │◄────│                     │◄────│                      │
└──────┬───────┘     └──────────┬──────────┘     │  ┌────────────────┐  │
       │ voz/texto              │ supabase-js    │  │ Postgres + RLS │  │
       │                        │                │  └────────────────┘  │
       │                        ▼                │  ┌────────────────┐  │
       │              ┌─────────────────────┐    │  │ Edge Functions │  │
       └─────────────►│  /command           │───►│  │  orchestrate   │  │
                      │  Web Speech API     │    │  └────────┬───────┘  │
                      └─────────────────────┘    └───────────┼──────────┘
                                                             │
                                                             ▼
                                                  ┌────────────────────┐
                                                  │  Lovable AI        │
                                                  │  Gateway           │
                                                  │  (gemini, gpt-5…)  │
                                                  └────────────────────┘
```

## Camadas

### 1. UI (`src/pages/*`, `src/components/*`)

- Roteamento via `react-router-dom` em `src/App.tsx`.
- Layout via `AppLayout` + `AppSidebar`.
- Auth gate via `ProtectedRoute` + `AuthContext`.
- Estado servidor via `@tanstack/react-query` + Supabase Realtime.

### 2. Persistência (Postgres via Supabase)

Schema completo em `src/integrations/supabase/types.ts`. Resumo:

| Tabela | Propósito | RLS |
|---|---|---|
| `squads` | Times de agentes | owner pode CRUD |
| `agents` | Membros dos squads | owner pode CRUD |
| `skills` | Catálogo de capacidades | leitura pública, write owner |
| `agent_skills` | N:N agente↔skill | herda do agent |
| `runs` | Execuções de pipeline | owner do squad |
| `handoffs` | Transições entre agentes | herda do run |
| `run_logs` | Logs por run | herda do run |
| `tasks` | Fila de trabalho | created_by |
| `profiles` | Perfil do usuário | self |
| `user_roles` | RBAC (admin/member) | self read, admin write |

### 3. Edge Functions (`supabase/functions/*`)

#### `orchestrate`
**Input**: `{ squadId: string, prompt: string }`
**Fluxo**:
1. Lê squad + agentes ordenados por `desk_col, desk_row`.
2. Cria `run` com `step_total = agents.length`.
3. Para cada agente em ordem:
   - Atualiza `agent.status = 'working'` + `run.step_current` + `run.step_label`.
   - Monta mensagem com `system_prompt` do agente + contexto do step anterior.
   - Chama `https://ai.gateway.lovable.dev/v1/chat/completions` com modelo do agente.
   - Acumula `tokens_in`, `tokens_out`, `cost` (via `src/lib/aiModels.ts`).
   - Insere `handoff` com mensagem de saída.
   - Atualiza `agent.status = 'delivering' → 'done'`.
4. Marca `run.status = 'success'` + `ended_at`.

**Erros**: gravados em `run_logs` (`level=error`) + `runs.error` + `runs.status='failed'`.

### 4. Realtime

- Canal `command-runs` em `Command.tsx` → escuta `postgres_changes` em `runs`.
- (Futuro) canal por `runId` para streaming de tokens.

## Fluxo "usuário envia comando"

```
1. Usuário digita ou fala em /command
2. Auto-detecção de squad por trigger (ex: "shlomo" → shlomo-engineering)
3. Click "Disparar pipeline"
4. supabase.functions.invoke('orchestrate', { squadId, prompt })
5. Edge function executa pipeline (ver acima)
6. Realtime atualiza /command (lista de runs), /runs (timeline), /squads (status), /costs (acumulado)
```

## Custos

- `src/lib/aiModels.ts` mantém tabela de preços por modelo (USD por 1M tokens, in/out separados).
- `cost = (tokens_in / 1e6) * price_in + (tokens_out / 1e6) * price_out`.
- Página `/costs` agrega por dia, squad, modelo.

## Auth

- Email/senha + Google OAuth.
- `ProtectedRoute` redireciona para `/auth` se não logado.
- `user_roles` define admin (futuras telas de governança).

## Migrações

- Sempre via tool `supabase--migration` (Lovable).
- **Nunca** editar `types.ts` manualmente — ele é regerado.
