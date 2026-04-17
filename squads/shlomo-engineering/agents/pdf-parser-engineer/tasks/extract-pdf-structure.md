# Task: Extrair Estrutura de PDF de Fatura Bancária

## Descrição
Analisar o PDF da fatura fornecido e identificar sua estrutura visual para extração de transações.

## Input
- Arquivo PDF de fatura (Itaú, Nubank, Bradesco, Inter, etc.)
- Caminho: `squads/shlomo-engineering/input/fatura.pdf`

## Processo

1. **Detectar banco emissor**
   - Ler cabeçalho do PDF
   - Identificar logotipo/nome do banco
   - Mapear para parser específico (cada banco tem formato diferente)

2. **Localizar tabela de transações**
   - Identificar linha inicial da tabela (ex: "Data | Descrição | Valor")
   - Identificar linha final (ex: "Total da Fatura")
   - Detectar colunas: data, descrição, valor, categoria (se existir)

3. **Extrair metadados**
   - Data de vencimento
   - Valor total da fatura
   - Período (mês/ano)
   - Nome do titular

4. **Mapear regex por banco**
   ```yaml
   Nubank:
     data_pattern: "\d{2}/\d{2}"
     descricao_pattern: "(?<=\d{2}/\d{2}\s).+?(?=\sR\$)"
     valor_pattern: "R\$\s?-?[\d,]+\.\d{2}"
   
   Itaú:
     data_pattern: "\d{2}\.\d{2}\.\d{2}"
     descricao_pattern: "(?<=\d{2}\.\d{2}\.\d{2}\s).+"
     valor_pattern: "-?[\d,]+\.\d{2}"
   ```

## Output
Arquivo YAML com estrutura mapeada:
```yaml
# squads/shlomo-engineering/output/{run_id}/pdf-structure.yaml
banco: "Nubank"
periodo: "2026-03"
vencimento: "2026-04-10"
total_fatura: 5432.10
tabela:
  inicio_linha: 15
  fim_linha: 87
  colunas: ["data", "descricao", "valor"]
regex_rules:
  data: "\d{2}/\d{2}"
  descricao: "(?<=\d{2}/\d{2}\s).+?(?=\sR\$)"
  valor: "R\$\s?-?[\d,]+\.\d{2}"
```

## Critérios de Qualidade
- Regex deve capturar ≥ 95% das transações
- Metadados extraídos corretamente
- Estrutura documentada para reuso futuro
