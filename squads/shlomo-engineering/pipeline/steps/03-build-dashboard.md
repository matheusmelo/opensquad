---
id: classify-transactions
name: "Classificação de Transações"
agent: classification-engine
execution: subagent
model_tier: powerful
inputFile: squads/shlomo-engineering/output/{run_id}/transactions.csv
outputFile: squads/shlomo-engineering/output/{run_id}/dashboard-data.json
format: financial-classification
---

# Instruções do Passo 2: Classificação Inteligente

## Objetivo
Aplicar o método dos 3 Pulmões para classificar automaticamente todas as transações extraídas em contextos PF (Pulmão 1/2/3) ou PJ (Orion).

## Contexto
Método Shlomo Ledger:
- **Pulmão 1 (Essenciais)**: Habitação, transporte, educação, serviços, alimentação básica - Teto: R$ 7.700
- **Pulmão 2 (Eventuais)**: Saúde, manutenções, vestuário, reservas - Teto: R$ 3.080
- **Pulmão 3 (Lazer)**: Viagens, restaurantes, entretenimento - Teto: R$ 4.620
- **PJ Orion**: Tráfego pago, infraestrutura, plataformas de infoproduto

## Processo

1. **Carregar regras** de `squads/shlomo-engineering/_memory/classification-rules.yaml`
2. **Ler transactions.csv** do Parser Engineer
3. **Para cada transação**:
   - Aplicar regex patterns por pulmão
   - Calcular confiança do match (0.0 a 1.0)
   - Se confiança < 0.80 → marcar como "REVISAO MANUAL"
   - Extrair categoria específica (ex: "Transporte", "Entretenimento")
4. **Analisar saúde financeira**:
   - Calcular % de uso de cada pulmão
   - Identificar alertas (> 90% do teto)
   - Gerar recomendações
5. **Gerar output estruturado** em JSON para dashboard

## Output Esperado

`dashboard-data.json`:
```json
{
  "metadata": {
    "mes": "2026-03",
    "total_transacoes": 68,
    "saldo_livre": 4700.00
  },
  "pulmoes": {
    "Pulmao 1": {"gasto": 5800, "teto": 7700, "status": "OK"},
    "Pulmao 2": {"gasto": 1500, "teto": 3080, "status": "OK"},
    "Pulmao 3": {"gasto": 3400, "teto": 4620, "status": "OK"}
  },
  "transacoes": [...],
  "alertas": [],
  "recomendacoes": []
}
```

## Critérios de Sucesso
- ≥ 75% classificadas automaticamente (confiança > 0.80)
- Nenhuma transação sem contexto
- Confiança média > 0.80

## Veto Conditions
- Menos de 70% classificadas → RETRY (adicionar mais regras)
- Transações PF classificadas como PJ → REJEITAR (erro crítico)
- JSON inválido ou mal formatado → RETRY
