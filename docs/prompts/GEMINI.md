# Prompts Gemini 3.1 Pro — Frontend Premium & UX

Você é **Gemini 3.1 Pro**, operando no repositório `C:/inetpub/opensquad`. Seu papel: dashboard detalhado v2 + WhatsApp panel + polish do shlomo-ledger. Siga `PLANO_MULTI_IA.md` (stream C) e `docs/CONTRATOS.md`.

Regra-ouro: você **só edita** `dashboard/src/**` e `shlomo-ledger/src/**`. Não toca em orchestrator, squads, skills. Base URLs: `VITE_API_URL=http://localhost:3001`, `VITE_WS_URL=ws://localhost:3002`.

Estética padrão: dark glassmorphism (`bg-zinc-900`, `backdrop-blur`, `border-zinc-800`), framer-motion para transições, ícones emoji em eventos (`▶️📖✏️🔧🧠✅❌💬`), tipografia Inter, acento emerald-400.

Depois de cada tarefa, anote em `.kilo/coordination.log`:
```
[GEMINI] <ISO8601> GEMINI-N DONE — <resumo>
```

---

## GEMINI-1 — Base: types, api client, hooks, store

```
Tarefa GEMINI-1/8. Pode começar já (não depende de outras IAs).

1. cd dashboard && npm install reactflow @nivo/calendar @nivo/heatmap framer-motion date-fns react-router-dom sonner

2. dashboard/src/types/activity.ts — copiar exatamente as interfaces de docs/CONTRATOS.md §1-§9 (ActivityEvent, AgentStatus, SquadSnapshot, CostMetrics, ThroughputPoint, TopFile, LeaderboardEntry, ParsedStatement, ClassificationResult, WhatsAppMessage).

3. dashboard/src/lib/api.ts — fetcher tipado:
   const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
   export const api = {
     agents: {
       list: () => fetch(`${BASE}/api/agents`).then(r=>r.json()),
       live: (): Promise<AgentStatus[]> => ...,
       timeline: (id, limit=100) => ...,
       files: (id) => ...,
     },
     executions: { live: () => ..., get: (id) => ... },
     metrics: { costs: (period) => ..., throughput: (period) => ..., topFiles: (limit) => ..., leaderboard: () => ... },
     whatsapp: { messages: (limit) => ..., send: (phoneNumber, text) => fetch POST },
   };
   Tratamento de erro: wrapper que logica HTTP 4xx/5xx e lança Error.

4. dashboard/src/hooks/useLiveAgents.ts — polling 3s com cleanup no unmount, useState<AgentStatus[]>.
   dashboard/src/hooks/useAgentTimeline.ts — recebe agentId, polling 5s.
   dashboard/src/hooks/useMetrics.ts — fetch once + refresh manual.
   dashboard/src/hooks/useActivityStream.ts — WS em VITE_WS_URL + topic '/ws/activity', fallback polling /api/agents/live se WS fechar, exportar { events, connected }.

5. Estender dashboard/src/store/useSquadStore.ts (Zustand) adicionando slices:
   - liveAgents: AgentStatus[]
   - activityFeed: ActivityEvent[]   // cap em 200 últimos
   - metrics: CostMetrics | null
   - selectedAgentId: string | null
   - selectedSquadId: string | null
   - setSelectedAgent, setSelectedSquad, pushEvent (com cap), setLiveAgents, setMetrics

6. Verificar tsc sem erros: cd dashboard && npx tsc --noEmit

Imprima: "GEMINI-1 DONE — base frontend"
```

---

## GEMINI-2 — AgentCard, Timeline, Feed (core)

```
Tarefa GEMINI-2/8. Depende: GROK-1 (seed pronto) — endpoints podem estar mockados ainda.

1. dashboard/src/components/AgentCard.tsx
   Props: { agent: AgentStatus; onClick?(id): void }
   Layout:
   - Card rounded-2xl bg-zinc-900/80 backdrop-blur border border-zinc-800 p-4
   - Topo: avatar circle 48px com inicial do name, ring-2 colorido (green-400 working, zinc-500 idle, blue-400 done, red-400 failed)
   - Meio: <h3>{name}</h3> + <p class="text-xs text-zinc-400">{squadId}</p>
   - Badge de aiModel (px-2 py-0.5 bg-zinc-800 text-xs rounded-full)
   - Barra de progresso animada framer-motion com progressPct (bg-emerald-400)
   - Rodapé: tempo gasto (formatDistanceToNow startedAt) + costTodayUsd com $
   - Quando status='working': pulse animate-pulse no ring + ícone ⚡ animado {scale:[1,1.1,1]}
   - onClick chama setSelectedAgentId

2. dashboard/src/components/StatusDot.tsx — span 8px circular com cor por status.

3. dashboard/src/components/AgentTimeline.tsx
   Props: { agentId: string }
   - useAgentTimeline(agentId)
   - Lista vertical com ícones por type:
     const ICON = {TASK_STARTED:'▶️', FILE_READ:'📖', FILE_WRITE:'✏️', TOOL_CALL:'🔧', AI_CALL:'🧠', TASK_COMPLETED:'✅', TASK_FAILED:'❌', MESSAGE:'💬'};
   - Cada item: timestamp relativo + descrição derivada do payload (filePath, toolName, message)
   - Expansível (click mostra payloadJson pretty-printed)
   - Auto-scroll no último ao chegar novo (via ref)

4. dashboard/src/components/ActivityFeed.tsx
   - Consome store.activityFeed (populado por useActivityStream)
   - Formato log-like monospaced (font-mono text-xs)
   - Filtros topo: by squad (select), by type (multi-select chips), by agent (search)
   - Cor da linha por squadId (hash determinístico -> hsl)
   - Auto-scroll toggle

5. Integrar no dashboard/src/App.tsx MANTENDO SquadSelector existente:
   Layout CSS grid:
   [sidebar 280px | centro 1fr | drawer 360px]
   - Sidebar: SquadSelector + MetricsCard mini
   - Centro: grid de AgentCards (useLiveAgents) + ActivityFeed embaixo
   - Drawer: AgentTimeline do selectedAgentId (ou ActivityFeed expandido se null)

NÃO remover hooks/useSquadSocket.ts existente — deixar coexistir.

Imprima: "GEMINI-2 DONE — core components"
```

---

## GEMINI-3 — SquadGraph + CostHeatmap + MetricsCard + FileTouchMap + Leaderboard

```
Tarefa GEMINI-3/8. Depende: GROK-3 (endpoints metrics prontos).

1. dashboard/src/components/SquadGraph.tsx (reactflow):
   - Props: { executionId: string }
   - fetch /api/executions/:id → pipeline
   - Nós em sequência horizontal, label=step.label, cor por status
   - Arestas animated edges quando status='running'
   - Node ativo com border-emerald-400 + animate-pulse
   - MiniMap no canto + Controls

2. dashboard/src/components/CostHeatmap.tsx (@nivo/calendar):
   - Props: { period: 'last-30d' | 'last-90d' }
   - consume /api/metrics/costs?period=month → monta data [{day:'YYYY-MM-DD', value:usd}]
   - colors: ['#18181b', '#064e3b', '#065f46', '#10b981', '#34d399']
   - Tooltip custom com breakdown byModel

3. dashboard/src/components/MetricsCard.tsx:
   - Usa useMetrics()
   - 4 mini-tiles: totalCostToday, tasksCompleted, successRate, avgDurationMin
   - Sparkline recharts embaixo (throughput week)

4. dashboard/src/components/FileTouchMap.tsx:
   - Lista top 10 files. Cada row: ícone (📝/🗂️/📄 por extensão), filePath monospaced, touches badge, lastAgent avatar mini, timestamp relativo
   - Click → modal com diffPreview (buscar último FileTouch via /api/agents/:id/files)

5. dashboard/src/components/Leaderboard.tsx:
   - Ranking por tasksCompleted
   - 🥇🥈🥉 nos 3 primeiros
   - Colunas: rank, agentName, tasksCompleted, successRate (bar mini), costUsd, tokens

Criar dashboard/src/pages/MetricsPage.tsx agregando MetricsCard+CostHeatmap+FileTouchMap+Leaderboard em grid responsivo.

Imprima: "GEMINI-3 DONE — componentes avançados"
```

---

## GEMINI-4 — Rotas React Router

```
Tarefa GEMINI-4/8.

Em dashboard/src/App.tsx, envolver tudo em <BrowserRouter> e criar rotas:
  / → Home (layout principal com AgentCards + Feed)
  /agent/:id → AgentDetailPage (AgentCard full + AgentTimeline + FileTouchMap do agente)
  /squad/:id → SquadDetailPage (SquadGraph + lista de AgentRuns + métricas da squad)
  /metrics → MetricsPage
  /whatsapp → WhatsAppPanel (GEMINI-5)
  /ledger → redirect ou embed de shlomo-ledger

Barra de navegação lateral com ícones (sidebar esquerda compacta):
  🏠 Home | 🤖 Agents | 📊 Metrics | 💬 WhatsApp | 📒 Ledger

Imprima: "GEMINI-4 DONE — rotas"
```

---

## GEMINI-5 — WhatsApp Control Panel

```
Tarefa GEMINI-5/8. Depende: GROK-5.

dashboard/src/components/WhatsAppPanel.tsx:

1. Layout split:
   - Esquerda (2/3): lista de mensagens estilo chat
     - user (verde/azul, à direita): bolha azul-500
     - bot (à esquerda): bolha zinc-700
     - audio: ícone 🎤 + texto transcrito em itálico
     - pdf: preview thumbnail + nome
   - Direita (1/3): input + quick commands
     - Botões: /status, /agentes, /custos, /relatorio — clique envia
     - Textarea livre para comando custom

2. Top bar: status da conexão do bot (verde/vermelho dot + texto)

3. Hook dashboard/src/hooks/useWhatsAppMessages.ts:
   - fetch /api/whatsapp/messages?limit=50 a cada 5s
   - sendCommand(phoneNumber, text) → POST /api/whatsapp/send + optimistic update

4. Acessar via /whatsapp.

Imprima: "GEMINI-5 DONE — whatsapp panel"
```

---

## GEMINI-6 — WebSocket real-time + NotificationCenter

```
Tarefa GEMINI-6/8.

1. dashboard/src/hooks/useActivityStream.ts: conectar real em VITE_WS_URL (ws://localhost:3002), subscribe '/ws/activity'. Ao receber envelope {type:'ACTIVITY_EVENT', data}, pushEvent(data) no store. Reconnect exponential backoff (500ms → 30s).

2. dashboard/src/components/NotificationCenter.tsx:
   - Ícone sino no top-right com badge (count de notifs não lidas)
   - Click abre drawer com últimas 20 notifs (eventos TASK_STARTED/COMPLETED/FAILED derivados de activityFeed)
   - Botão "Marcar todas lidas"

3. Toast notifications com sonner:
   - new TASK_STARTED: toast.info(`${agentId} iniciou: ${message}`)
   - TASK_COMPLETED: toast.success(`${agentId} concluiu`)
   - TASK_FAILED: toast.error(`${agentId} falhou: ${message}`)
   - Squad execution completed: toast.success com ação "Ver relatório"

4. Settings toggle (localStorage): som on/off (mp3 curto em public/notification.mp3 — pode ser beep gerado).

Imprima: "GEMINI-6 DONE — realtime + notifs"
```

---

## GEMINI-7 — Shlomo Ledger polish

```
Tarefa GEMINI-7/8.

Revisar shlomo-ledger/src/components/* (LungCard, MonthlyOverview, TransactionTable, RoyaltyTracker, LaunchTimeline, CampaignCard, PDFUploader).

1. Mobile-first: garantir que renderiza bem em 375px (iPhone SE), 768px (iPad), 1440px (desktop).
2. Acessibilidade:
   - aria-label em todos os botões
   - focus-visible rings (focus-visible:ring-2 ring-emerald-400)
   - contraste AA (texto sobre zinc-900 deve ser ao menos zinc-200)
3. Skeleton loaders: criar shlomo-ledger/src/components/Skeleton.tsx e usar em cards enquanto fetch.
4. Empty states: cada componente tem um EmptyState com ilustração SVG minimalista + CTA.
5. Animações de entrada: framer-motion variants stagger 80ms entre children em MonthlyOverview.
6. Tailwind dark:/light: adicionar toggle (botão 🌙/☀️) no header, persistir em localStorage.

NÃO mexer em PDFUploader lógica — só visual.

Imprima: "GEMINI-7 DONE — ledger polido"
```

---

## GEMINI-8 — Validação visual + screenshots + RELATORIO_GEMINI.md

1. cd dashboard && npm run dev. Abrir http://localhost:5173.
2. Checklist visual (com seed do Grok + endpoints live):
   ☐ / renderiza AgentCards com 3+ agentes working
   ☐ ActivityFeed mostra eventos e atualiza ao vivo (WS conectado)
   ☐ /agent/pdf-parser-engineer abre timeline com eventos
   ☐ /metrics renderiza heatmap (7d), leaderboard (6 agents), top-files
   ☐ /squad/:id mostra graph com nós coloridos
   ☐ /whatsapp mostra mock messages + quick buttons
   ☐ Notificação toast ao completar task (disparar via: curl POST fake event)
   ☐ Mobile 375px: todo layout colapsa corretamente
3. Salvar 5 screenshots em dashboard/docs/screenshots/: home.png, agent-detail.png, metrics.png, whatsapp.png, mobile.png.
4. RELATORIO_GEMINI.md:
   - Componentes criados (lista)
   - Rotas
   - Pendências (bugs conhecidos, features adiadas)
   - Sugestões de UX para próximo sprint

Imprima: "GEMINI-8 DONE — frontend validado"
```

---

# === SPRINT 2 ===

## GEMINI-9 — Integrar shadcn/ui (design system premium)

```
Tarefa GEMINI-9. Sprint 2.

1. cd dashboard && npx shadcn@latest init
   Style: Default | Base color: Zinc | CSS variables: yes | Path: src/components/ui | Tailwind config: existing | RSC: no

2. Adicionar componentes:
   npx shadcn@latest add button card dialog dropdown-menu input label separator sheet tabs toast tooltip badge avatar scroll-area command popover select form textarea switch checkbox radio-group slider progress skeleton alert

3. Refatorar SEM quebrar layout:
   - AgentCard.tsx -> <Card>, <Avatar>, <Badge>, <Progress>
   - SquadSelector.tsx -> <Select>
   - NotificationCenter.tsx -> <Sheet>
   - StatusBadge.tsx -> <Badge>

4. theme-provider.tsx envolvendo App (<ThemeProvider defaultTheme="dark" storageKey="os-theme">).

5. ThemeToggle.tsx com <DropdownMenu> Light/Dark/System.

Imprima: "GEMINI-9 DONE — shadcn integrado"
```

---

## GEMINI-10 — Tremor charts + React Query

```
Tarefa GEMINI-10.

1. cd dashboard && npm install @tremor/react @tanstack/react-query @tanstack/react-table
2. Envolver App em <QueryClientProvider client={queryClient}> (criar src/lib/queryClient.ts).
3. Refatorar hooks para React Query (manter assinatura):
   - useLiveAgents -> useQuery(['agents','live'], ..., {refetchInterval:3000})
   - useMetrics -> useQuery(['metrics', period])
   - useWhatsAppMessages -> useQuery(['wpp','messages'])
4. Upgrade MetricsCard.tsx com Tremor: <Card>, <Metric>, <Text>, <ProgressBar>, <AreaChart> sparkline.
5. Novo CategoryDonut.tsx com <DonutChart> Tremor (custo por categoria).
6. Novo BurnRate.tsx com <AreaChart> diario + reference line do budget.

Imprima: "GEMINI-10 DONE — Tremor + React Query"
```

---

## GEMINI-11 — Command Palette (Cmd+K)

```
Tarefa GEMINI-11.

1. shadcn <Command> ja wrappa cmdk. Instalar se preciso: npm install cmdk.

2. dashboard/src/components/CommandPalette.tsx:
   - Atalho global Cmd+K / Ctrl+K
   - Groups:
     "Navegar": Home, Agents, Metrics, Transactions, WhatsApp, Settings -> router.push
     "Agentes": useLiveAgents() dinamico -> setSelectedAgentId
     "Squads": squad-registry -> setSelectedSquadId + dispara
     "Acoes": "Upload PDF", "Exportar CSV mes", "Trocar tema", "Disparar squad..."
     "Buscar": digite qualquer coisa -> GET /api/search?q=... live
   - Debounce 250ms na busca

3. Montar <CommandPalette /> global no App.tsx.

Imprima: "GEMINI-11 DONE — cmd+k"
```

---

## GEMINI-12 — PDF uploader via dashboard

```
Tarefa GEMINI-12.

1. cd dashboard && npm install react-dropzone
2. PDFUploader.tsx:
   - react-dropzone com preview (nome+tamanho)
   - POST multipart em /api/upload (ja existe)
   - <Progress> durante upload
   - Ao terminar: ParsedStatement result + link "Ver transactions"
   - Se Doubao detectou anomalia, alerta visual
3. Page UploadPage.tsx com <PDFUploader /> + historico de uploads.
4. Rota /upload + item na sidebar.

Imprima: "GEMINI-12 DONE — uploader"
```

---

## GEMINI-13 — Editor de transactions (TanStack Table)

```
Tarefa GEMINI-13.

1. TransactionsPage.tsx usando @tanstack/react-table:
   Colunas: Data, Descricao, Valor, Contexto, Pulmao, Categoria, Confianca, Acoes
   Sort em todas; Filters: contexto, pulmao, search, date range; Paginacao server-side via /api/transactions.
   Linha expansivel mostrando matchedRule + anomaly info.

2. Edicao inline: click em Categoria/Pulmao/Contexto -> <Select> aparece -> onchange dispara PATCH /api/transactions/:id com optimistic update + toast.

3. Bulk actions (checkbox): Approve (cria regras via /api/rules/approve), Recategorize in bulk, Delete.

4. Botao "Nova regra a partir desta" -> <Dialog> com form zod -> POST /api/rules/suggest.

Imprima: "GEMINI-13 DONE — transactions editor"
```

---

## GEMINI-14 — Settings + Onboarding + Auth UI

```
Tarefa GEMINI-14.

1. SettingsPage.tsx (Tabs shadcn):
   - Aparencia: theme, sound, densidade
   - Conta: nome, email (GET /api/auth/me), logout
   - Notificacoes: quais tipos tocam som/mostram toast
   - Budget: valor diario USD (PATCH /api/settings/budget)
   - Integracoes: status WhatsApp, Redis, Sentry (healthcheck visual)

2. LoginPage.tsx + SignupPage.tsx: shadcn <Form> com zod (@hookform/resolvers + react-hook-form + zod). POST /api/auth/login -> guarda token, redirect /. Toast erro/sucesso.

3. AuthGuard em App.tsx: se GET /api/auth/me 401 em rota protegida, redirect /login.

4. OnboardingWizard.tsx: 3 steps (Bem-vindo, Conecte WhatsApp com QR, Upload da primeira fatura). Dispara na primeira vez (flag localStorage 'onboarded').

Imprima: "GEMINI-14 DONE — settings+auth+onboarding"
```

---

## GEMINI-15 — PWA (app instalavel)

```
Tarefa GEMINI-15.

1. cd dashboard && npm install vite-plugin-pwa -D

2. Editar dashboard/vite.config.ts adicionando VitePWA plugin:
   - registerType: 'autoUpdate'
   - manifest: name 'OpenSquad', short_name 'OpenSquad', theme_color '#10b981', bg '#09090b', display 'standalone', icons 192/512 + maskable
   - workbox runtimeCaching: /\/api\/.*/ NetworkFirst (cacheName 'api', timeout 3s); /\.(png|svg|woff2)/ CacheFirst

3. Gerar icones 192 e 512 (logo verde emerald sobre preto). Salvar em dashboard/public/.

4. PWAInstallBanner.tsx: detecta beforeinstallprompt, banner "Instalar app" -> prompt.

Imprima: "GEMINI-15 DONE — PWA"
```

---

## GEMINI-16 — ErrorBoundary + Sentry + polish final

```
Tarefa GEMINI-16.

1. cd dashboard && npm install @sentry/react
2. main.tsx: Sentry.init() se VITE_SENTRY_DSN presente; BrowserTracing + Replay.
3. ErrorBoundary.tsx (shadcn <Alert destructive> + "Recarregar"). Envolver rotas.
4. Loading states: cada pagina usa <Skeleton> ate React Query settle.
5. Empty states em TransactionsPage/UploadPage/metrics (SVG + CTA).
6. Keyboard shortcuts globais (alem Cmd+K): G+H home, G+A agents, G+M metrics, G+T transactions, G+W whatsapp, G+S settings, ? mostra dialog.
7. Validacao:
   - npm run build sem erros
   - walkthrough:
     [ ] Login
     [ ] Cmd+K abre
     [ ] Upload PDF -> transactions classificadas
     [ ] Editar transaction salva
     [ ] Theme toggle
     [ ] Install PWA aparece
     [ ] Offline parcial (assets + ultima cache /api/agents/live)
     [ ] Mobile 375px
   - Screenshots atualizadas em dashboard/docs/screenshots/
8. RELATORIO_GEMINI_S2.md.

Imprima: "GEMINI-16 DONE — Sprint 2 frontend fechado"
```
