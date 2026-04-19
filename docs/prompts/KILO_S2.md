# KILO — Preparação Sprint 2 (infra + env)

Tarefas que Kilo executa ANTES de liberar as 3 IAs, para remover atritos.

## KILO-S2-1 — ENV template

Criar `.env.example` na raiz com TODAS as variáveis que serão usadas no Sprint 2:

```
# Orchestrator
ORCHESTRATOR_PORT=3001
ORCHESTRATOR_WS_PORT=3002
OPENSQUAD_BASE_PATH=C:/inetpub/opensquad
MAX_CONCURRENT_SQUADS=3

# AI
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
GROK_API_KEY=
DEEPGRAM_API_KEY=

# Auth (GROK-7)
JWT_SECRET=change-me-in-prod
API_KEY=dev-key-change-in-production

# Queue (GROK-9)
REDIS_URL=redis://localhost:6379

# Alerts (GROK-10)
DAILY_BUDGET_USD=5.0
ALERT_WEBHOOK=

# Observability (GROK-14)
SENTRY_DSN=
LOG_LEVEL=debug

# Frontend (Gemini)
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3002
VITE_SENTRY_DSN=
```

## KILO-S2-2 — Redis container

Atualizar `docker-compose.yml` com serviço Redis:
```yaml
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [redis-data:/data]
    restart: unless-stopped
```

Criar `docker-compose.prod.yml` com perfis de produção.

## KILO-S2-3 — Atualizar CONTRATOS

Após DOUBAO-8 entregar 5 parsers, atualizar `docs/CONTRATOS.md §7`:
```ts
bank: 'nubank' | 'itau' | 'bradesco' | 'santander' | 'inter' | 'unknown';
```

## KILO-S2-4 — CI/CD

`.github/workflows/deploy.yml`: Railway deploy no push pra main após testes.

## KILO-S2-5 — Merge & Smoke test final

Depois que as 3 IAs entregarem RELATORIO_*_S2.md:
1. Merge branches `feat/grok/*`, `feat/doubao/*`, `feat/gemini/*` em `main`
2. Rodar stack completa local (docker-compose up)
3. Checklist §6 do SPRINT_2.md (16 itens)
4. Deploy em Railway/Render
5. Smoke test em produção
6. Redigir `RELATORIO_SPRINT_2.md`
