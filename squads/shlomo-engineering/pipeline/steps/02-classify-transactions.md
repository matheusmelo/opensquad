---
id: parse-financial-data
name: "Parser de Dados Financeiras"
agent: pdf-parser-engineer
execution: subagent
model_tier: powerful
inputFile: null
outputFile: squads/shlomo-engineering/output/{run_id}/transactions.csv
format: financial-parsing
---

# Instruções do Passo 1: Parser de Faturas

## Objetivo
Extrair todas as transações dos PDFs de faturas bancárias fornecidos pelo usuário e gerar CSV padronizado.

## Contexto
O usuário enviará PDFs de faturas (Nubank, Itaú, Bradesco, Inter, etc.) com dados misturados de:
- Despesas pessoais (PF) - devem ir para Pulmões 1/2/3
- Despesas corporativas (PJ Orion) - devem ir para contexto PJ

## Processo

1. **Receber PDFs** - Ler arquivos em `squads/shlomo-engineering/input/*.pdf`
2. **Detectar banco** - Identificar emissor pelo layout/logotipo
3. **Extrair estrutura** - Localizar tabela de transações no PDF
4. **Aplicar parser** - Usar regex específico do banco para extrair cada linha
5. **Normalizar dados** - Converter para formato ISO, padronizar descrições
6. **Gerar CSV** - Output com colunas: `data,descricao,valor,tipo,categoria_original`

## Validação
- Soma de valores deve bater com total da fatura
- ≥ 95% das transações devem ser extraídas
- Datas em formato YYYY-MM-DD

## Critérios de Sucesso
- CSV gerado sem campos vazios
- Transações duplicadas marcadas
- Estatísticas de extração documentadas

## Veto Conditions
- Menos de 90% das transações extraídas → RETRY
- Valores não somam ao total da fatura → RETRY
- PDF ilegível/corrompido → REPORTAR AO USUÁRIO
