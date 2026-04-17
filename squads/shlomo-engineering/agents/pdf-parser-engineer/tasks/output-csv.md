# Task: Gerar CSV de Transações

## Descrição
Converter transações extraídas do PDF em arquivo CSV padronizado para o próximo agente.

## Input
- Lista de transações extraídas (output da task `build-parser-rules`)
- Formato: array de objetos `{data, descricao, valor}`

## Processo

1. **Normalizar dados**
   - Converter datas para formato ISO: `YYYY-MM-DD`
   - Padronizar descrições (uppercase, remover acentos opcionais)
   - Garantir valores numéricos com 2 casas decimais
   - Identificar tipo (debito vs credito) baseado no sinal do valor

2. **Aplicar schema CSV**
   ```csv
   data,descricao,valor,tipo,categoria_original
   2026-03-15,UBER *VIAGEM,-45.90,debito,TRANSPORTE
   2026-03-15,MERCADO LIVRE,-234.50,debito,COMPRAS
   2026-03-10,SALARIO EMPRESA X,8500.00,credito,RECEITA
   ```

3. **Validar integridade**
   - Verificar se todas as linhas têm 5 colunas
   - Confirmar que soma de valores bate com total da fatura
   - Marcar transações duplicadas (mesma data + descrição + valor)

4. **Gerar estatísticas**
   - Total de transações debitadas
   - Total de transações creditadas
   - Saldo líquido do período

## Output

Arquivo CSV em: `squads/shlomo-engineering/output/{run_id}/transactions.csv`

Com header:
```csv
data,descricao,valor,tipo,categoria_original
```

E arquivo de stats: `squads/shlomo-engineering/output/{run_id}/transaction-stats.yaml`
```yaml
total_transacoes: 68
total_debitos: -5432.10
total_creditos: 8500.00
saldo_liquido: 3067.90
transacoes_duplicadas: 0
```

## Critérios de Qualidade
- CSV deve ser parseável por qualquer biblioteca standard
- Valores devem somar exatamente ao total da fatura original
- Encoding UTF-8 sem BOM
- Linhas terminadas em `\n` (Unix-style)

## Anti-Patterns
- NUNCA pule validação de checksum (soma deve bater)
- NUNCA use formato de data localizado (sempre ISO)
- NUNCA deixe campos em branco — use "DESCONHECIDO" se necessário
