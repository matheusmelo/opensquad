# Prompt para Claude Code (local) — Mesclar `orquestrador-orion` em `opensquad`

> Cole o bloco abaixo no Claude Code rodando dentro do seu clone local do `matheusmelo/opensquad`.
> Antes de colar: garanta que você tem **os dois repos clonados lado a lado** e a working tree do `opensquad` está **limpa** (`git status` sem nada pendente, na branch `main` atualizada).

---

## Contexto que o Claude precisa

Você está em `~/code/opensquad` (monorepo principal: engine Python/Node + skills + squad-registry).
Existe um segundo repo em `~/code/orquestrador-orion` (dashboard React + Vite + Lovable Cloud) que precisa virar a subpasta `dashboard/` deste monorepo, **preservando histórico** quando possível e **sem quebrar** nada que já existe em `opensquad`.

O dashboard:
- É **React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui**
- Usa **Lovable Cloud** (Supabase gerenciado) — `.env`, `src/integrations/supabase/client.ts` e `src/integrations/supabase/types.ts` são auto-gerados pela Lovable e **não devem ser editados manualmente**
- Tem edge function em `supabase/functions/orchestrate/index.ts` que chama o Lovable AI Gateway
- Tem GitHub Action em `.github/workflows/mirror-to-opensquad.yml` que (depois desse merge) vai espelhar o repo `orquestrador-orion` para `opensquad/dashboard/` automaticamente em cada push

## Tarefa

### 1. Pré-checks
```bash
cd ~/code/opensquad
git status                    # deve estar limpo
git checkout main && git pull
git checkout -b feat/dashboard-merge
ls dashboard/ 2>/dev/null || echo "pasta dashboard não existe ainda — ok"
```

### 2. Trazer o conteúdo do `orquestrador-orion` para `dashboard/`

Use **git subtree** (preserva histórico). Se já existir conteúdo conflitante em `dashboard/`, faça backup primeiro:

```bash
# se já existe algo em dashboard/, mover pra backup
[ -d dashboard ] && mv dashboard dashboard.bak.$(date +%s)

# adicionar o orquestrador-orion como remote temporário
git remote add orion https://github.com/matheusmelo/orquestrador-orion.git
git fetch orion main

# trazer como subtree
git subtree add --prefix=dashboard orion main --squash
```

Se `git subtree` falhar (ex: histórico divergente), fallback manual:
```bash
rm -rf dashboard
mkdir dashboard
rsync -av --exclude='.git' --exclude='node_modules' --exclude='dist' \
  ~/code/orquestrador-orion/ dashboard/
git add dashboard
git commit -m "feat(dashboard): import orquestrador-orion as dashboard/"
```

### 3. Ajustes pós-merge

a) **Verifique conflitos com `.gitignore` raiz** do `opensquad`:
```bash
cat .gitignore | grep -E 'node_modules|dist|\.env'
```
Se faltar, adicione regras para `dashboard/node_modules`, `dashboard/dist`, `dashboard/.env`.

b) **Não commit o `.env` do dashboard** — ele tem chaves do Supabase específicas do projeto Lovable:
```bash
[ -f dashboard/.env ] && echo "dashboard/.env" >> .gitignore && git rm --cached dashboard/.env 2>/dev/null
```

c) **Workspace tooling**: se o `opensquad` usa pnpm/bun workspaces, o dashboard tem `package.json` próprio — decida se vira workspace member ou continua isolado. Default recomendado: **isolado** (cada um com seu lockfile), porque o dashboard é gerenciado pela Lovable e mexer no lockfile dele pode quebrar o sync.

d) **Conflitos de scripts**: se a raiz tem `package.json` com scripts, garanta que o `dashboard/` não vai ser pego por scripts de lint/test do monorepo sem necessidade. Adicione `dashboard` em ignores de ESLint/Prettier raiz se aplicável.

### 4. Documentação no monorepo

Crie `dashboard/README.md` (se não veio do subtree, copie de `~/code/orquestrador-orion/README.md`) e adicione no README raiz do `opensquad` uma seção:

```markdown
## Dashboard / Cockpit Visual

A pasta [`dashboard/`](./dashboard) contém o frontend de operações (React + Vite, Lovable Cloud).
É espelhada automaticamente do repo [`matheusmelo/orquestrador-orion`](https://github.com/matheusmelo/orquestrador-orion) via GitHub Action.
**Não edite `dashboard/` diretamente neste monorepo** — faça as mudanças no `orquestrador-orion` (ou via Lovable) e elas serão sincronizadas.
```

### 5. Validação

```bash
cd dashboard
npm install         # ou bun install — o que estiver no lockfile
npm run build       # garante que builda no ambiente fora da Lovable
cd ..
git status
```

Se buildou OK e não há arquivos espúrios, abra PR:
```bash
git push -u origin feat/dashboard-merge
gh pr create --base main --title "feat: import dashboard from orquestrador-orion" \
  --body "Importa o dashboard React (orquestrador-orion) como subpasta dashboard/. Sync futuro via GitHub Action."
```

### 6. Decisão sobre o mirror automático

Depois do merge, o workflow `.github/workflows/mirror-to-opensquad.yml` (que vive **dentro** de `dashboard/.github/workflows/` após o merge — ou copie para a raiz do `opensquad` se quiser que ele rode lá) vai precisar do secret `OPENSQUAD_PUSH_TOKEN`.

Recomendação: **mantenha o workflow só no `orquestrador-orion`** (origem), não duplique no `opensquad`. Assim:
- Mudanças no Lovable → push em `orquestrador-orion/main` → Action espelha para `opensquad/dashboard-sync` → você abre PR no `opensquad`.

## Checklist final para o Claude reportar

- [ ] Branch `feat/dashboard-merge` criada
- [ ] `dashboard/` populado (via subtree ou rsync)
- [ ] `.gitignore` ajustado, `.env` não commitado
- [ ] `npm install && npm run build` passou em `dashboard/`
- [ ] README raiz atualizado com seção sobre dashboard
- [ ] PR aberto
- [ ] Quaisquer arquivos conflitantes ou decisões manuais documentadas no corpo do PR

---

**Importante**: não toque em `dashboard/src/integrations/supabase/types.ts`, `dashboard/src/integrations/supabase/client.ts` nem `dashboard/.env` — todos auto-gerados pela Lovable.
