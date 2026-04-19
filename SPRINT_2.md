# Sprint 2 — Polimento, Interatividade & Produção

**Data:** 2026-04-17
**Sprint 1:** ✅ Backend + Domínio + Frontend base (Kilo/Grok/Doubao/Gemini)
**Sprint 2:** Fazer o sistema ficar "redondo" — UX profissional, interatividade real, pronto para produção.

---

## 0. O que já está em pé (Sprint 1)

- Orchestrator + WebSocket :3002 + activity-logger + schema Prisma
- 11 endpoints REST (`/api/agents/*`, `/api/executions/*`, `/api/metrics/*`, `/api/classify`, `/api/rules/*`)
- Parsers Nubank + Itaú + Classifier com YAML + aprendizado
- Dashboard completo: AgentCard, Timeline, Feed, SquadGraph, CostHeatmap, MetricsCard, FileTouchMap, Leaderboard, NotificationCenter, WhatsAppPanel
- Rotas React Router (`/`, `/agent/:id`, `/squad/:id`, `/metrics`, `/whatsapp`)
- Shlomo Ledger polido (mobile, a11y, skeletons)

---

## 1. Lacunas identificadas (para deixar redondo)

### Experiência
- ❌ Upload de PDF via dashboard (só via WhatsApp hoje)
- ❌ Editor de transações (recategorizar, corrigir, aprender com correção)
- ❌ Command palette (Cmd+K) — navegação/ação rápida
- ❌ Busca global (transactions, agents, files)
- ❌ Filtros e ordenação nas tabelas
- ❌ Dark/light toggle de verdade funcionando
- ❌ PWA (app instalável, offline-first leve)
- ❌ Onboarding / first-run wizard

### Backend/Ops
- ❌ Autenticação (qualquer um com a URL acessa tudo)
- ❌ Queue para squads longos (BullMQ) — hoje bloqueia
- ❌ Cron scheduler para squads recorrentes
- ❌ Alertas de budget (custo acima de X → WhatsApp/webhook)
- ❌ Export CSV/PDF de relatórios
- ❌ Logging estruturado (pino) + Sentry
- ❌ Docker Compose production-ready
- ❌ Deploy real em Railway/Render

### Domínio
- ❌ Parser Bradesco + Santander + Inter
- ❌ Forecast mensal (projeção de gastos)
- ❌ Detecção de anomalias (transação fora do padrão)
- ❌ Squad builder via prompt ("crie uma squad que faça X")
- ❌ Voice command router (áudio livre → intent estruturado)

---

## 2. Integrações GitHub (plug-and-play)

Ao invés de reinventar, vamos instalar libs maduras.

### Frontend
| Pacote | Para que | Link |
|---|---|---|
| **shadcn/ui** | Base de componentes (botão, dialog, dropdown, toast, command, input, form) | github.com/shadcn-ui/ui |
| **@tremor/react** | Componentes analytics (Card, BarChart, DonutChart, Tracker, ProgressBar) | github.com/tremorlabs/tremor |
| **@tanstack/react-query** | Cache + refetch + optimistic updates | github.com/TanStack/query |
| **@tanstack/react-table** | Tabela de transactions com sort/filter/pagination | github.com/TanStack/table |
| **cmdk** | Command palette Cmd+K | github.com/pacocoursey/cmdk |
| **react-dropzone** | Upload drag-drop para PDFs | github.com/react-dropzone/react-dropzone |
| **vaul** | Drawers bonitos (mobile) | github.com/emilkowalski/vaul |
| **vite-plugin-pwa** | PWA com manifest + service worker | github.com/vite-pwa/vite-plugin-pwa |
| **@sentry/react** | Error tracking | sentry.io |
| **next-themes** (com wrapper) | Dark/light toggle | github.com/pacocoursey/next-themes |
| **fuse.js** | Busca fuzzy client-side | github.com/krisk/Fuse |

### Backend
| Pacote | Para que | Link |
|---|---|---|
| **zod** | Validação de inputs/outputs | github.com/colinhacks/zod |
| **pino** + **pino-pretty** | Logging estruturado | github.com/pinojs/pino |
| **bullmq** | Queue para squads | github.com/taskforcesh/bullmq |
| **node-cron** | Agendamento | github.com/node-cron/node-cron |
| **jsonwebtoken** + **bcrypt** | Auth simples | github.com/auth0/node-jsonwebtoken |
| **json2csv** | Export CSV | github.com/juanjoDiaz/json2csv |
| **pdfkit** | Gerar PDFs de relatório | github.com/foliojs/pdfkit |
| **express-rate-limit** | Proteção contra abuse | github.com/express-rate-limit |
| **@sentry/node** | Error tracking backend | sentry.io |

### DevOps
| Ferramenta | Para que |
|---|---|
| **Uptime Kuma** (self-host) | Monitoramento |
| **Plausible** ou **Umami** | Analytics dashboard |
| **dotenv-vault** | Gestão de secrets |

---

## 3. Alocação do Sprint 2

| Modelo | Foco | Tarefas |
|---|---|---|
| **Grok Code Fast 1** | Backend, infra, auth, queue, cron | GROK-7 a GROK-14 |
| **Doubao Seed 2.0 Pro** | Domínio, forecasting, parsers novos, voice | DOUBAO-8 a DOUBAO-14 |
| **Gemini 3.1 Pro** | shadcn/ui + Tremor + interatividade + PWA | GEMINI-9 a GEMINI-16 |
| **Kilo (Claude)** | Prep de infra (init shadcn), merge final, deploy | KILO-S2 |

### Ordem de execução (paralela)
```
T+0h  Kilo: setup shadcn + Tremor + Sentry DSN + ENV vars
      Grok: GROK-7 (auth)   | Doubao: DOUBAO-8 (Bradesco)  | Gemini: GEMINI-9 (shadcn base)
T+1h  Grok: GROK-8+9        | Doubao: DOUBAO-9+10          | Gemini: GEMINI-10+11
T+2h  Grok: GROK-10+11      | Doubao: DOUBAO-11+12         | Gemini: GEMINI-12+13
T+3h  Grok: GROK-12+13+14   | Doubao: DOUBAO-13+14         | Gemini: GEMINI-14+15+16
T+4h  Kilo: merge + smoke test e2e + deploy Railway
```

---

## 4. Mapa de arquivos (Sprint 2 adições)

| Arquivo | Dono |
|---|---|
| `orchestrator/routes/auth.js` (novo) | Grok |
| `orchestrator/routes/transactions.js` (novo) | Grok |
| `orchestrator/routes/exports.js` (novo) | Grok |
| `orchestrator/routes/search.js` (novo) | Grok |
| `orchestrator/services/queue.js` (novo, BullMQ) | Grok |
| `orchestrator/services/scheduler.js` (novo, node-cron) | Grok |
| `orchestrator/services/logger.js` (novo, pino) | Grok |
| `orchestrator/services/alerts.js` (novo) | Grok |
| `orchestrator/middleware/auth.js` (novo) | Grok |
| `orchestrator/middleware/validate.js` (novo, zod) | Grok |
| `squads/shlomo-engineering/parsers/bradesco-parser.js` | Doubao |
| `squads/shlomo-engineering/parsers/santander-parser.js` | Doubao |
| `squads/shlomo-engineering/parsers/inter-parser.js` | Doubao |
| `squads/shlomo-engineering/forecast/*` (novo) | Doubao |
| `squads/shlomo-engineering/anomaly/*` (novo) | Doubao |
| `squads/shlomo-builder/*` (novo — squad que cria squads) | Doubao |
| `skills/voice-router/*` (novo) | Doubao |
| `dashboard/src/components/ui/**` (shadcn) | Gemini |
| `dashboard/src/components/CommandPalette.tsx` | Gemini |
| `dashboard/src/components/PDFUploader.tsx` | Gemini |
| `dashboard/src/components/TransactionEditor.tsx` | Gemini |
| `dashboard/src/components/SettingsPanel.tsx` | Gemini |
| `dashboard/src/components/OnboardingWizard.tsx` | Gemini |
| `dashboard/src/pages/TransactionsPage.tsx` | Gemini |
| `dashboard/src/pages/SettingsPage.tsx` | Gemini |
| `dashboard/vite.config.ts` (edit — plugin PWA) | Gemini |
| `dashboard/public/manifest.webmanifest` | Gemini |
| `docker-compose.prod.yml` | Kilo |
| `.github/workflows/deploy.yml` | Kilo |

---

## 5. Prompts prontos

- `docs/prompts/GROK.md` — tarefas GROK-7..GROK-14 (anexadas)
- `docs/prompts/DOUBAO.md` — tarefas DOUBAO-8..DOUBAO-14 (anexadas)
- `docs/prompts/GEMINI.md` — tarefas GEMINI-9..GEMINI-16 (anexadas)

Cada modelo lê `docs/CONTRATOS.md` (congelado) + seu prompt correspondente. Regras §2 (não-conflito) valem igual ao Sprint 1.

---

## 6. Definition of Done (Sprint 2)

O sprint termina quando tudo abaixo está verde:

1. **Auth:** cadastro + login + sessão persistente (JWT httpOnly cookie)
2. **Upload UI:** arrasta PDF → vê preview → confirma → squad dispara → dashboard mostra em tempo real
3. **Tabela de transactions:** lista paginada, busca, filtro por contexto/pulmão, editar inline, aprovar correção que vira regra nova
4. **Cmd+K:** abrir palette, ir para qualquer agente/squad/página, disparar squad por nome
5. **Dark/light toggle** funcionando de verdade em toda UI
6. **PWA instalável** no iPhone/Android + ícone + splash
7. **Queue BullMQ** processando squads sem bloquear requests
8. **Cron** agendando squad `shlomo-engineering` toda manhã 9h (exemplo)
9. **Alertas:** se `costToday > $5`, manda WhatsApp pro admin
10. **Export CSV/PDF** do mês atual funcionando
11. **Parsers Bradesco+Santander+Inter** com testes verdes
12. **Forecast** mostra projeção do mês atual no dashboard
13. **Anomaly detection** sinaliza transações suspeitas
14. **Logs estruturados** (pino) em stdout + Sentry capturando erros front+back
15. **Deploy Railway/Render** acessível via HTTPS público
16. **Smoke test e2e:** upload PDF no celular → app instalado como PWA → vê classificação → edita → aprova → budget atualizado → WhatsApp confirma

---

## 7. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| shadcn scaffolding muda arquivos do Gemini em lugares que quebram App.tsx | Kilo faz `shadcn init` primeiro, com config pronto; Gemini só adiciona componentes |
| BullMQ exige Redis | docker-compose já prevê Redis; se local não tem, Grok usa `BullMQ IORedis` em memória via fallback `ioredis-mock` |
| Auth quebra todos os endpoints pro frontend | Grok cria middleware opt-in: rotas protegidas explicitamente, `/api/*` públicas permanecem até Gemini consumir auth |
| PWA service worker cacheia demais | vite-plugin-pwa com estratégia `NetworkFirst` para `/api/*`, `CacheFirst` só para assets |
| Deploy falha por secrets | Kilo usa `dotenv-vault` + documenta ENV vars necessárias |

---

## 8. Kick-off

Kilo roda `KILO-S2` antes dos outros (prepara terreno do shadcn + ENV). Depois os 3 modelos recebem seus prompts simultaneamente.
