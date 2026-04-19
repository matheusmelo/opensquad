# Contexto para IAs — Orquestrador Orion

> **Leia este arquivo PRIMEIRO** se você é uma IA (Claude, GPT, Gemini, Cursor, Copilot, Lovable AI, etc.) trabalhando neste repo.

## 1. Quem você é neste projeto

Você é a IA responsável por **construir e manter o dashboard / cockpit visual da operação OpenSquad**. Este repo (`orquestrador-orion`) **não é um projeto isolado** — é um dos componentes de um sistema maior:

```
┌─────────────────────────────────────────────────────────────┐
│  OpenSquad — plataforma de squads de agentes IA              │
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────────┐ │
│  │  matheusmelo/        │      │  matheusmelo/            │ │
│  │    opensquad         │◄────►│    orquestrador-orion    │ │
│  │  (engine + skills    │ sync │  (DASHBOARD — você está  │ │
│  │   + squad-registry)  │      │   AQUI)                  │ │
│  └──────────────────────┘      └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 2. O que este repo entrega

A **central de operações e monitoramento**:

1. **Comando** (`/command`) — entrada por texto e voz (Web Speech API PT-BR) que dispara pipelines de squads.
2. **Squads** (`/squads`, `/squads/:code`) — visualização de squads, pipeline, agentes, triggers WhatsApp.
3. **Agentes** (`/agents`, `/agents/:id`) — perfis individuais, status (idle/working/delivering/done/checkpoint).
4. **Skills** (`/skills`) — catálogo de capacidades reutilizáveis (apify, blotato, canva, resend, whatsapp-integration, etc.).
5. **Execuções** (`/runs`) — timeline real de runs com handoffs entre agentes.
6. **Custos** (`/costs`) — tracking real de tokens × preço por modelo, agregado por dia/squad/agente.
7. **Fila** (`/tasks`) — comandos pendentes vindos do WhatsApp.
8. **Overview** (`/`) — KPIs (squads ativos, runs em execução, handoffs 24h, custo do dia).

## 3. Stack — não confunda

- **NÃO é Next.js**, NÃO é Angular, NÃO é Vue. É **React 18 + Vite 5**.
- **Backend é Lovable Cloud** (= Supabase gerenciado pela Lovable). Para o usuário final, sempre fale "backend" ou "Lovable Cloud", nunca "Supabase".
- **AI calls** vão pelo **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`) com header `Authorization: Bearer ${LOVABLE_API_KEY}`. Não use OpenAI/Google SDK direto.
- **Voz** = Web Speech API nativa do navegador (só Chromium).

## 4. Modelo de dados (resumo)

Tabelas principais (ver `src/integrations/supabase/types.ts` para schema completo):

- `squads` — id, code, name, triggers[], pipeline_file, response_max_chars, auto_run, status
- `agents` — id, squad_id, name, role, model, system_prompt, status (enum), desk_col, desk_row
- `skills` — catálogo (10 skills do OpenSquad real pré-populadas)
- `agent_skills` — N:N agentes ↔ skills
- `runs` — id, squad_id, agent_id, status, step_current/step_total, step_label, cost, tokens_in/out
- `handoffs` — run_id, from_agent, to_agent, message, completed_at, step_index
- `run_logs` — debug/info/warn/error por run
- `tasks` — fila de trabalho (vinda de WhatsApp ou manual)
- `profiles`, `user_roles` — auth + RBAC (admin/member via `has_role()` security definer)

**Regras críticas**:
- RLS habilitado em **todas** as tabelas.
- **Nunca** armazenar role na tabela `profiles` — sempre em `user_roles`.
- **Nunca** editar `src/integrations/supabase/types.ts`, `src/integrations/supabase/client.ts`, `.env` — são auto-gerados.

## 5. Edge Functions

- `supabase/functions/orchestrate/index.ts` — recebe `{ squadId, prompt }`, busca agentes do squad, executa sequencialmente via Lovable AI Gateway, registra `handoffs`, atualiza `agent.status` e `runs.step_current` em tempo real, calcula `cost` por token via `src/lib/aiModels.ts`.

Cada nova edge function precisa ser declarada implicitamente — o deploy é automático no Lovable. **Nunca peça ao usuário para deployar manualmente.**

## 6. Convenções de código que você DEVE seguir

- **Design tokens semânticos** (HSL) em `src/index.css` e `tailwind.config.ts`. **Nunca** `text-white`, `bg-black` em componentes — sempre `text-foreground`, `bg-background`, `bg-primary`, etc.
- **Tema dark** estilo Linear/Vercel já configurado.
- **Português (PT-BR)** na UI. Nomes técnicos em inglês.
- **Componentes pequenos** e focados. Quando arquivo passa de ~250 linhas, refatorar.
- **shadcn/ui** para todo componente de UI. `npx shadcn add` se precisar de algo novo.

## 7. Termos do domínio OpenSquad (não confunda)

- **Squad** = time de agentes que executa um pipeline (ex: `shlomo-engineering`, `gestao-pessoal`).
- **Agente** = membro de um squad com role específica (ex: "PDF Parser Engineer").
- **Skill** = capacidade reutilizável (apify, canva, resend, whatsapp-integration, etc.).
- **Pipeline** = sequência de steps que o squad executa, cada step entregue por um agente para o próximo.
- **Handoff** = entrega entre dois agentes consecutivos no pipeline.
- **Trigger** = palavra-gatilho (ex: "shlomo", "agenda") que dispara um squad via WhatsApp ou `/command`.
- **Run** = uma execução concreta de um pipeline.

## 8. Sincronização com o repo original

Veja [`SYNC_GITHUB.md`](./SYNC_GITHUB.md). TL;DR: existe GitHub Action `.github/workflows/mirror-to-opensquad.yml` que espelha este repo para `matheusmelo/opensquad/dashboard/` em cada push na `main`. Requer secret `OPENSQUAD_PUSH_TOKEN`.

## 9. O que NÃO fazer

- ❌ Não introduza outro framework (Next, Remix, etc).
- ❌ Não chame OpenAI/Anthropic/Google direto — use Lovable AI Gateway.
- ❌ Não adicione backend Node/Python no repo — só edge functions Deno.
- ❌ Não exponha `service_role` key, nem PATs no código. Use `Deno.env.get()` em edge functions.
- ❌ Não mencione "Supabase dashboard" para o usuário — ele só vê "Lovable Cloud".
- ❌ Não mexa em `auth`, `storage`, `realtime`, `vault` schemas do Supabase.
- ❌ Não duplique a engine do `opensquad` aqui — este repo só **comanda e observa**.

## 10. Quando estiver na dúvida

1. Leia [`ARCHITECTURE.md`](./ARCHITECTURE.md) para fluxos detalhados.
2. Leia [`AGENTS_GLOSSARY.md`](./AGENTS_GLOSSARY.md) para terminologia.
3. Consulte o repo `matheusmelo/opensquad` via API do GitHub para entender squads/skills reais.
4. Se for mudar schema do banco, **sempre** via migration SQL — nunca edite `types.ts`.
