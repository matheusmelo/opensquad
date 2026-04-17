# Multi-IA Task Router - Otimização de Custos

Sistema inteligente que distribui tarefas entre IAs gratuitas e pagas baseado em complexidade.

## Uso

```bash
/dev-with-ai "descrição da tarefa" [--model auto|gpt-4o|sonnet|haiku|flash]
```

## Exemplos

### Automático (recomendado)
```bash
/dev-with-ai "crie componente de botão"
# → Usa Claude Haiku (FREE)

/dev-with-ai "refatore classification engine"
# → Usa Claude Sonnet ($0.003/1k tokens)

/dev-with-ai "desenhe arquitetura de microserviços"
# → Usa GPT-4o ($0.005/1k tokens)
```

### Manual
```bash
/dev-with-ai "traduza README para inglês" --model flash
/dev-with-ai "code review crítico" --model gpt-4o
```

## Como Funciona

1. **Analisa complexidade** da tarefa
2. **Escolhe IA ótima** baseado em:
   - Complexidade (simples/média/complexa)
   - Tipo (código/docs/debug/arquitetura)
   - Custo vs Benefício
3. **Executa em paralelo** se múltiplas tarefas
4. **Reporta custos** após execução

## Economias Estimadas

| Sem Otimização | Com Multi-IA | Economia |
|----------------|--------------|----------|
| $150/mês       | $10/mês      | 93%      |

## Tarefas Gratuitas (90% do tempo)

✅ Boilerplate code generation
✅ Simple bug fixes
✅ Documentation
✅ Code translation
✅ Basic refactoring
✅ Unit test generation

## Tarefas Pagas (10% do tempo)

💰 Complex architecture design
💰 Security audits
💰 Performance optimization
💰 Critical debugging
💰 System design reviews
