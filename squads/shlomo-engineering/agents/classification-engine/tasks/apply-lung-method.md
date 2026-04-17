# Task: Aplicar Método dos Pulmões

## Descrição
Validar e ajustar a distribuição de gastos pelos 3 Pulmões baseado nos tetes definidos no método Shlomo Ledger.

## Input
- `squads/shlomo-engineering/output/{run_id}/classified-transactions.csv`
- Tetes dos pulmões (definidos em CONTEXTO_ENGENHEIRO.md):
  - Pulmão 1 (Essenciais): R$ 7.700,00
  - Pulmão 2 (Eventuais): R$ 3.080,00
  - Pulmão 3 (Lazer): R$ 4.620,00

## Processo

1. **Agrupar gastos por pulmão**
   ```python
   from collections import defaultdict
   
   gastos_por_pulmao = defaultdict(float)
   
   for transacao in classified:
       if transacao['pulmao']:
           gastos_por_pulmao[transacao['pulmao']] += abs(float(transacao['valor']))
   ```

2. **Calcular percentual de uso de cada pulmão**
   ```python
   tetes = {
       'Pulmao 1': 7700.00,
       'Pulmao 2': 3080.00,
       'Pulmao 3': 4620.00
   }
   
   for pulmao, gasto in gastos_por_pulmao.items():
       teto = tetes[pulmao]
       percentual = (gasto / teto) * 100
       status = "OK" if percentual <= 100 else "EXCEDIDO"
       
       print(f"{pulmao}: R$ {gasto:.2f} / R$ {teto:.2f} ({percentual:.1f}%) [{status}]")
   ```

3. **Identificar alertas financeiros**
   - Pulmão com gasto > 90% do teto → ALERTA
   - Pulmão com gasto > 100% do teto → CRÍTICO
   - Saldo livre negativo → CRÍTICO

4. **Gerar recomendações automáticas**
   Se um pulmão está excedido:
   ```yaml
   recomendacoes:
     - pulmao: "Pulmao 3"
       problema: "Gasto de R$ 5.200 excede teto de R$ 4.620 em 12.5%"
       acao_sugerida: "Reduzir gastos com restaurantes e viagens no próximo mês"
       categorias_problematicas: ["Restaurantes", "Viagens"]
   ```

## Output

Arquivo: `squads/shlomo-engineering/output/{run_id}/lung-analysis.yaml`

```yaml
resumo_financeiro:
  receita_total: 15400.00
  total_despesas: 10700.00
  saldo_livre: 4700.00
  
pulmoes:
  Pulmao 1:
    gasto: 5800.00
    teto: 7700.00
    percentual_uso: 75.3
    status: OK
    
  Pulmao 2:
    gasto: 1500.00
    teto: 3080.00
    percentual_uso: 48.7
    status: OK
    
  Pulmao 3:
    gasto: 3400.00
    teto: 4620.00
    percentual_uso: 73.6
    status: OK

alertas: []

recomendacoes: []
```

## Critérios de Qualidade
- Cálculos devem bater com CSV original (checksum)
- Alertas devem ser acionados corretamente
- Recomendações devem ser acionáveis e específicas

## Visualização Sugerida (para Dashboard Builder)
- Gauge chart mostrando % de cada pulmão usado
- Cores: verde (< 80%), amarelo (80-100%), vermelho (> 100%)
