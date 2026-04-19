# Orquestrador Orion — OpenSquad Dashboard

Central de operações, comando e monitoramento da plataforma **OpenSquad**.
Este repositório é o **dashboard / cockpit visual** que controla, observa e dispara os squads de agentes definidos no monorepo principal `matheusmelo/opensquad`.

> Repo deste dashboard: [`matheusmelo/orquestrador-orion`](https://github.com/matheusmelo/orquestrador-orion)
> Monorepo principal (engine + skills + agentes): [`matheusmelo/opensquad`](https://github.com/matheusmelo/opensquad)

---

## 🧭 Para quê serve este projeto

`orquestrador-orion` é a **camada de UI + orquestração visual** sobre o `opensquad`. Ele:

- Lista squads, agentes e skills cadastrados.
- Recebe **comandos por texto e voz** (página `/command`) e dispara pipelines.
- Mostra **execuções em tempo real** com handoffs entre agentes.
- Acompanha **custos reais** por modelo (token in/out × preço).
- Apresenta um **office view** dos agentes (status idle/working/delivering/done).
- Persiste tudo em **Lovable Cloud (Supabase)** com RLS.

A **execução real** dos agentes hoje é feita pela edge function `supabase/functions/orchestrate/index.ts` usando o **Lovable AI Gateway** (sem precisar de API key OpenAI/Google direta).

---

## 🏗️ Stack

- **Frontend**: React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui
- **Backend**: Lovable Cloud (Supabase Postgres + Edge Functions Deno)
- **AI**: Lovable AI Gateway (`google/gemini-2.5-flash`, `openai/gpt-5-mini`, etc.)
- **Voz**: Web Speech API nativa (PT-BR)
- **Realtime**: Supabase Realtime (canal `command-runs`)

---

## 🔌 Relação com o repo original `opensquad`

| Aspecto | `opensquad` (monorepo) | `orquestrador-orion` (este) |
|---|---|---|
| Papel | Engine + skills + definição de agentes | Dashboard / cockpit visual |
| Linguagem principal | Python / Node | TypeScript / React |
| Onde rodam os pipelines | CLI / WhatsApp trigger | Edge function `orchestrate` |
| Catálogo de skills | `_opensquad/skills/*` | Tabela `skills` (espelho) |
| Catálogo de squads | `_opensquad/squad-registry.json` | Tabela `squads` (espelho) |

**Fluxo desejado**: `opensquad` é a fonte de verdade de skills/agentes/pipelines.
Este dashboard **lê e dispara** esses pipelines. Eventualmente queremos sincronizar o `squad-registry.json` automaticamente (botão "Sincronizar com repo").

---

## 🔄 Sincronização entre os dois repos

A Lovable só sincroniza com **um** repo: `matheusmelo/orquestrador-orion`.
Para refletir mudanças no `opensquad` original, há 3 opções:

### Opção 1 — GitHub Action de mirror (semi-automática) ✅ recomendada
Workflow `.github/workflows/mirror-to-opensquad.yml` (já incluído neste repo) sincroniza automaticamente uma subpasta `dashboard/` do `opensquad` original toda vez que há push na `main` daqui.

**Setup necessário (uma vez):**
1. Crie um Personal Access Token (PAT) no GitHub com escopo `repo`.
2. Em `matheusmelo/orquestrador-orion` → Settings → Secrets and variables → Actions → New repository secret:
   - Nome: `OPENSQUAD_PUSH_TOKEN`
   - Valor: o PAT criado.
3. Pronto. A cada push na `main` deste repo, o workflow copia o conteúdo para `opensquad/dashboard/` via PR ou commit direto.

### Opção 2 — git remote duplo (manual, controle total)
No seu clone local do `orquestrador-orion`:
```bash
git remote add opensquad git@github.com:matheusmelo/opensquad.git
git subtree push --prefix=. opensquad main:dashboard-sync
```
Cria/atualiza branch `dashboard-sync` no `opensquad` com o conteúdo deste repo. Você abre PR manualmente.

### Opção 3 — git submodule (avançado)
Adicionar `orquestrador-orion` como submodule dentro de `opensquad/dashboard/`. Requer `git submodule update` em cada checkout. Não recomendado pela complexidade.

> **Recomendação:** comece pela **Opção 1**. Configure o secret e deixe a Action cuidar de tudo.

---

## 📁 Documentos internos para IAs

Outras IAs (Cursor, Claude Code, Codex, Copilot Workspace) que abrirem este repo devem ler:

- [`docs/AI_CONTEXT.md`](./docs/AI_CONTEXT.md) — visão geral, papel deste repo, como tudo se conecta.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — schema do banco, edge functions, fluxos.
- [`docs/AGENTS_GLOSSARY.md`](./docs/AGENTS_GLOSSARY.md) — terminologia OpenSquad (squad, agente, handoff, pipeline).
- [`docs/SYNC_GITHUB.md`](./docs/SYNC_GITHUB.md) — detalhes operacionais do mirror.

---

## 🚀 Rodando localmente

```bash
npm install
npm run dev
```

Variáveis de ambiente são geridas pela Lovable Cloud (`.env` auto-gerado).
Não edite `.env`, `src/integrations/supabase/client.ts` ou `src/integrations/supabase/types.ts`.

---

## 📜 Licença

Mesma do projeto OpenSquad principal.
