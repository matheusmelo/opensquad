# Task: Gerar CSV Classificado Final

## Descrição
Produzir arquivo final de transações classificadas pronto para o Dashboard Builder consumir.

## Input
- `squads/shlomo-engineering/output/{run_id}/classified-transactions.csv`
- `squads/shlomo-engineering/output/{run_id}/lung-analysis.yaml`

## Processo

1. **Merge de dados**
   - Unir transações classificadas com análise de pulmões
   - Adicionar coluna `status_pulmao` (OK/ALERTA/CRITICO) baseado na análise

2. **Enriquecer com metadados**
   Adicionar colunas:
   - `mes_referencia`: extraído da data (ex: "2026-03")
   - `dia_semana`: calcularจาก date (ex: "Segunda-feira")
   - `recorrencia`: identificar se é gasto recorrente (appears todo mês)

3. **Ordenar e formatar**
   - Ordenar por data decrescente (mais recente primeiro)
   - Formatar valores como string legível: "R$ -45,90"
   - Truncar descrições muito longas (max 50 chars)

4. **Gerar versão JSON para dashboard**
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
     "transacoes": [
       {
         "id": "tx_001",
         "data": "2026-03-15",
         "descricao": "UBER *VIAGEM",
         "valor": -45.90,
         "contexto": "PF",
         "pulmao": "Pulmao 1",
         "categoria": "Transporte",
         "confianca": 0.95,
         "recorrencia": "alta"
       }
     ]
   }
   ```

## Output

1. **CSV final**: `squads/shlomo-engineering/output/{run_id}/final-classified.csv`
   - Pronto para revisão manual no Excel/Google Sheets

2. **JSON para dashboard**: `squads/shlomo-engineering/output/{run_id}/dashboard-data.json`
   - Estrutura completa para React component consumir

3. **README do output**: `squads/shlomo-engineering/output/{run_id}/README.md`
   ```markdown
   # Output da Execução - Shlomo Engineering
   
   **Data de processamento:** 2026-04-17
   **Fatura processada:** Nubank Março/2026
   **Total de transações:** 68
   **Classificação automática:** 76.5%
   
   ## Arquivos gerados
   - `final-classified.csv`: Versão CSV para revisão
   - `dashboard-data.json`: Dados estruturados para UI
   - `lung-analysis.yaml`: Análise financeira detalhada
   
   ## Próximos passos
   1. Revisar transações marcadas como "REVISAO MANUAL"
   2. Validar classification com usuário
   3. Enviar para Dashboard Builder construir visualização
   ```

## Critérios de Qualidade
- JSON deve ser válido e parseável
- CSV deve manter todas as colunas originais
- README deve documentar claramente o conteúdo
- Dados devem estar consistentes entre os 3 arquivos

## Validação Final
Antes de marcar como completo:
```bash
# Validar JSON
cat dashboard-data.json | python -m json.tool > /dev/null && echo "JSON VÁLIDO" || echo "JSON INVÁLIDO"

# Contar transações
wc -l final-classified.csv  # deve ter header + N transações

# Verificar integridade
grep -c "REVISAO MANUAL" final-classified.csv  # reportar quantas precisam revisão
```
