# Task: Rodar Testes

## Descrição
Executar suite de testes e garantir que tudo está passando antes de finalizar a tarefa.

## Input
Código implementado pelo Senior Dev

## Processo

1. **TypeScript Check:**
   ```bash
   # Shlomo Ledger
   cd shlomo-ledger && npx tsc --noEmit
   
   # Orchestrator
   cd orchestrator && npx tsc --noEmit
   ```

2. **Lint:**
   ```bash
   npm run lint
   # Se errors auto-fixable:
   npm run lint -- --fix
   ```

3. **Unit Tests:**
   ```bash
   # React (Vitest/Jest)
   cd shlomo-ledger && npm test
   
   # Node.js
   cd orchestrator && npm test
   
   # Python (pytest)
   cd squads/shlomo-engineering && pytest
   ```

4. **Build:**
   ```bash
   npm run build
   # Verificar bundle size
   ls -lh dist/
   ```

5. **E2E Tests (se aplicável):**
   ```bash
   npx playwright test
   # Ver relatórios em test-results/
   ```

## Output

Relatório de testes:

```markdown
## 🧪 Resultados de Testes

**TypeScript:**
- [x] shlomo-ledger: 0 errors
- [x] orchestrator: 0 errors

**Lint:**
- [x] Passed (ou X warnings, 0 errors)

**Unit Tests:**
- shlomo-ledger: 12/12 passing
- orchestrator: 8/8 passing
- parsers: 5/5 passing

**Build:**
- [x] Success (bundle: 245KB gzipped)

**E2E:**
- [ ] Pendente (requer servidor rodando)
```

## Critérios de Aprovação

- TypeScript: 0 errors obrigatório
- Lint: 0 errors obrigatório
- Unit Tests: 100% passing obrigatório
- Build: deve completar sem errors
- E2E: recomendado para features críticas
