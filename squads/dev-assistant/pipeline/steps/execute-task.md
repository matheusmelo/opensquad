---
id: execute-task
name: "Executar Tarefa de Desenvolvimento"
agent: senior-dev
execution: subagent
model_tier: powerful
inputFile: null
outputFile: squads/dev-assistant/output/{run_id}/task-result.md
---

# Instruções do Passo Único: Executar Tarefa

## Objetivo
Receber uma tarefa de desenvolvimento do usuário e executá-la de forma autônoma, com validação de qualidade inclusa.

## Fluxo de Execução

1. **Senior Dev** recebe o prompt do usuário
2. Analisa requisito e planeja implementação
3. Implementa solução nos arquivos apropriados
4. **QA Tester** valida código (lint, tests, build)
5. **Tech Writer** atualiza documentação
6. Output final consolidado

## Validação Automática

Após implementação, executar automaticamente:
```bash
npm run lint
npm test
npx tsc --noEmit
npm run build
```

## Critérios de Sucesso
- Zero TypeScript errors
- Zero lint errors
- Todos os testes passando
- Build completa sem errors
- Documentação atualizada

## Veto Conditions
- Lint com errors → RETRY
- Testes falhando → RETRY
- Build quebrado → RETRY
- Código não tipado (any) → RETRY
