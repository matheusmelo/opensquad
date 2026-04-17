# Pipeline Shlomo Engineering - Desenvolvimento Autônomo

Este pipeline orquestra os agentes para processar faturas financeiras, classificar transações e construir dashboards automaticamente.

## Passo 1: Parser de Faturas PDF
**Agente:** PDF Parser Engineer  
**Input:** PDFs de faturas bancárias (Nubank, Itaú, etc.)  
**Output:** `transactions.csv` com dados brutos extraídos  
**Execution:** subagent  
**Model tier:** powerful  

O parser analisa a estrutura do PDF, extrai todas as transações e gera CSV padronizado.

---

## Passo 2: Classificação Inteligente
**Agente:** Classification Engine  
**Input:** `transactions.csv` + regras de classificação  
**Output:** `classified-transactions.csv` com contexto (PF/PJ) e pulmões  
**Execution:** subagent  
**Model tier:** powerful  

Aplica o método dos 3 Pulmões para classificar automaticamente cada transação.

---

## Passo 3: Análise Financeira
**Agente:** Classification Engine  
**Input:** Transações classificadas  
**Output:** `lung-analysis.yaml` com saúde financeira  
**Execution:** inline  

Calcula percentual de uso de cada pulmão, identifica alertas e gera recomendações.

---

## Passo 4: Validação de Qualidade
**Agente:** QA Validator  
**Input:** Todos os outputs anteriores  
**Output:** Relatório de aprovação/rejeição  
**Execution:** inline  
**On reject:** retry (max 2 vezes)  

Valida integridade dos dados, checksums e qualidade da classificação.

---

## Passo 5: Construção do Dashboard
**Agente:** Dashboard Builder  
**Input:** `dashboard-data.json` + `lung-analysis.yaml`  
**Output:** Componentes React `.tsx` atualizados  
**Execution:** subagent  
**Model tier:** powerful  

Constrói/atualiza interface visual com cards dos pulmões e gráficos.

---

## Passo 6: Checkpoint de Revisão
**Tipo:** checkpoint  
**Input:** Dashboard gerado + dados classificados  
**Output:** Aprovação do usuário ou feedback  
**Type:** checkpoint  

Apresenta resultado parcial e solicita aprovação antes de prosseguir.

---

## Passo 7: Geração de Regras Aprendidas
**Agente:** Classification Engine  
**Input:** Feedback do usuário sobre classificações manuais  
**Output:** `classification-rules.yaml` atualizado  
**Execution:** inline  

Aprende correções do usuário e cria novas regras para automação futura.

---

## Passo 8: Deploy Local
**Agente:** Dashboard Builder  
**Input:** Componentes React aprovados  
**Output:** Build otimizado em `shlomo-ledger/dist/`  
**Execution:** inline  

Executa build do projeto e serve localmente para preview.

---

## Fluxo de Handoff

```
PDF Parser → Classification Engine → QA Validator → Dashboard Builder → Usuário
     ↑                                                                  |
     └────────────────← Aprender correções ←────────────────────────────┘
```

Cada agente passa o bastão para o próximo com contexto completo.
