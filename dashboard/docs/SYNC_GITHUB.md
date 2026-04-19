# Sincronização GitHub: orquestrador-orion → opensquad

## Situação

A Lovable só sincroniza com **um** repo: `matheusmelo/orquestrador-orion`.
Você quer que mudanças aqui apareçam também em `matheusmelo/opensquad` (o monorepo principal).

## Solução: GitHub Action de mirror

O arquivo `.github/workflows/mirror-to-opensquad.yml` neste repo faz isso automaticamente.

### O que ele faz

A cada push na branch `main` deste repo:
1. Faz checkout do código atual.
2. Clona o `matheusmelo/opensquad` usando um PAT.
3. Substitui a pasta `dashboard/` lá pelo conteúdo deste repo (excluindo `.git`, `node_modules`, etc.).
4. Commita e dá push numa branch `dashboard-sync` no `opensquad`.
5. (Opcional) abre PR automático.

### Setup (uma vez)

#### Passo 1 — Criar Personal Access Token (PAT)

1. Vá em https://github.com/settings/tokens?type=beta (Fine-grained tokens) ou https://github.com/settings/tokens (Classic).
2. **Fine-grained** (recomendado):
   - Nome: `orion-to-opensquad-mirror`
   - Expiration: 1 ano
   - Repository access: **Only select repositories** → `matheusmelo/opensquad`
   - Permissions → Repository:
     - Contents: **Read and write**
     - Pull requests: **Read and write**
     - Metadata: **Read-only** (já vem)
3. Generate → **copie o token** (só aparece uma vez).

#### Passo 2 — Adicionar como secret no orquestrador-orion

1. https://github.com/matheusmelo/orquestrador-orion/settings/secrets/actions
2. **New repository secret**
3. Name: `OPENSQUAD_PUSH_TOKEN`
4. Value: cole o PAT
5. Save

#### Passo 3 — Garantir que o `opensquad` tenha pasta `dashboard/`

No clone local do `opensquad`:
```bash
mkdir -p dashboard
echo "# Dashboard sincronizado de orquestrador-orion" > dashboard/README.md
git add dashboard && git commit -m "chore: prepare dashboard folder for mirror" && git push
```

#### Passo 4 — Testar

Faça qualquer mudança aqui (até um README) → push na `main` → veja a aba Actions em https://github.com/matheusmelo/orquestrador-orion/actions.

Em ~30s deve aparecer um commit em `matheusmelo/opensquad` na branch `dashboard-sync`. Você abre PR e mergeia quando quiser.

### Modos de operação

O workflow tem dois modos (controlados por env var `MIRROR_MODE` no YAML):

- **`pr`** (padrão) — abre/atualiza PR na `dashboard-sync`. Você revisa e mergeia.
- **`direct`** — push direto na `main` do `opensquad`. Mais rápido, menos seguro.

Para mudar, edite a env var no topo do workflow.

### Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Action falha com 403 | PAT sem permissão `contents:write` no `opensquad` | Recriar PAT com escopo correto |
| Action falha com 404 | PAT sem acesso ao repo `opensquad` | Em fine-grained tokens, adicionar `opensquad` aos repos selecionados |
| PR não aparece | Modo `direct` está ligado | Veja commits diretos na `main` do `opensquad` |
| Conflitos no merge | Arquivo editado nos dois repos | Resolver manualmente no PR |

### Alternativas (sem GitHub Action)

**Manual via git subtree**:
```bash
# no clone local do orquestrador-orion
git remote add opensquad https://github.com/matheusmelo/opensquad.git
git subtree push --prefix=. opensquad dashboard-sync
```

**Manual via cherry-pick**: para casos pontuais onde você só quer levar 1-2 commits específicos.
