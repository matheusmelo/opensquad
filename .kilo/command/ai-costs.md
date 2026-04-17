# /ai-costs

Mostra estatísticas de uso e custos do sistema Multi-IA.

## Uso

```
/ai-costs [--period days]
```

## Exemplos

```
/ai-costs              # Mostra custos totais
/ai-costs --period 7   # Últimos 7 dias
/ai-costs --model      # Detalhado por modelo
```

## Output Exemplo

```
💰 AI Usage Statistics

Total Gasto (30 dias): $2.45
Total de Tarefas: 127

Por Modelo:
┌─────────────────┬───────┬────────┐
│ Modelo          │ Tasks │ Custo  │
├─────────────────┼───────┼────────┤
│ Claude Haiku    │ 89    │ $0.00  │
│ Gemini Flash    │ 23    │ $0.00  │
│ Claude Sonnet   │ 12    │ $1.80  │
│ GPT-4o Mini     │ 3     │ $0.65  │
└─────────────────┴───────┴────────┘

Economia vs GPT-4 padrão: $142.30 (98%)

Tarefas Gratuitas: 88%
Tarefas Pagas: 12%
```
