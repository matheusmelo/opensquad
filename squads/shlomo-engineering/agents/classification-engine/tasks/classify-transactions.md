# Task: Classificar Transações por Pulmão

## Descrição
Aplicar regras de classificação em CSV de transações para categorizar cada uma no contexto e pulmão corretos.

## Input
- `squads/shlomo-engineering/output/{run_id}/transactions.csv` (output do Parser Engineer)
- `squads/shlomo-engineering/output/{run_id}/loaded-rules.yaml` (regras carregadas)

## Processo

1. **Carregar transações e regras**
   ```python
   import csv
   import yaml
   import re
   
   with open('transactions.csv') as f:
       transactions = list(csv.DictReader(f))
   
   with open('loaded-rules.yaml') as f:
       rules = yaml.safe_load(f)['rules']
   ```

2. **Para cada transação, aplicar matching**
   ```python
   def classify_transaction(transacao, rules):
       descricao_upper = transacao['descricao'].upper()
       
       melhor_match = {
           'contexto': 'REVISAO MANUAL',
           'pulmao': None,
           'categoria': None,
           'confianca': 0.0
       }
       
       for rule_name, rule in rules.items():
           for pattern in rule['patterns']:
               if re.search(pattern, descricao_upper, re.IGNORECASE):
                   confianca = calcular_confianca(descricao_upper, pattern)
                   
                   if confianca > melhor_match['confianca']:
                       melhor_match = {
                           'contexto': rule['contexto'],
                           'pulmao': rule.get('pulmao'),
                           'categoria': extrair_categoria(pattern),
                           'confianca': confianca
                       }
       
       return melhor_match
   ```

3. **Calcular confiança do match**
   - Match exato de palavra-chave: 0.95
   - Match parcial (substring): 0.80
   - Múltiplos patterns da mesma regra: +0.05 por match adicional
   - Se confiança < 0.80 → marcar como `REVISAO MANUAL`

4. **Extrair categoria específica**
   - Mapear pattern para categoria legível:
     - `"UBER|99|TAXI"` → "Transporte"
     - `"SUPERMERCADO|MERCADONA"` → "Alimentação Básica"
     - `"NETFLIX|SPOTIFY"` → "Entretenimento"

5. **Gerar CSV classificado**
   Adicionar colunas ao output:
   ```csv
   data,descricao,valor,tipo,contexto,pulmao,categoria,confianca
   2026-03-15,UBER *VIAGEM,-45.90,debito,PF,Pulmao 1,Transporte,0.95
   2026-03-15,NETFLIX.COM,-55.90,debito,PF,Pulmao 3,Entretenimento,0.98
   2026-03-10,COMPRA DESCONHECIA XYZ,-120.00,debito,REVISAO MANUAL,,0.45
   ```

## Output

Arquivo: `squads/shlomo-engineering/output/{run_id}/classified-transactions.csv`

Estatísticas: `squads/shlomo-engineering/output/{run_id}/classification-stats.yaml`
```yaml
total_transacoes: 68
classificadas_automaticamente: 52
revisao_manual: 16
por_pulmao:
  Pulmao 1: 28
  Pulmao 2: 8
  Pulmao 3: 16
  REVISAO MANUAL: 16
confianca_media: 0.87
```

## Critérios de Qualidade
- ≥ 75% das transações classificadas automaticamente (confiança > 0.80)
- Nenhuma transação sem contexto definido (exceto REVISAO MANUAL)
- Confiança média acima de 0.80
- Todas as transações PJ identificadas corretamente (não misturar com PF)

## Anti-Patterns
- NUNCA classifique com confiança < 0.80 — prefira REVISAO MANUAL
- NUNCA ignore transações — todas devem estar no output
- Não classifique PF como PJ ou vice-versa sem evidência clara
