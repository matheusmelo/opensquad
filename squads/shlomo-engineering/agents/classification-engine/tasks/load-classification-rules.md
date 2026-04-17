# Task: Carregar Regras de Classificação

## Descrição
Carregar regras de classificação existentes da memória da squad ou criar regras iniciais baseadas no método dos 3 Pulmões.

## Input
- Arquivo `squads/shlomo-engineering/_memory/classification-rules.yaml` (se existir)
- Contexto do método dos 3 Pulmões (definido no agent.md)

## Processo

1. **Verificar existência de regras prévias**
   ```bash
   test -f squads/shlomo-engineering/_memory/classification-rules.yaml && echo "EXISTS" || echo "MISSING"
   ```

2. **Se MISSING, criar regras base do método dos 3 Pulmões**
   
   Usar como base o CONTEXTO_ENGENHEIRO.md:
   ```yaml
   rules:
     PF-Pulmao1-Essenciais:
       patterns:
         - "UBER|99|TAXI|TRANSPORTE"
         - "CONDOMINIO|ALUGUEL|IPTU"
         - "SUPERMERCADO|MERCADONA|ASSAI|FEIRA"
         - "LUZ|ENERGIA|SABESP|COMGAS|INTERNET|CELULAR"
       contexto: "PF"
       pulmao: "Pulmao 1"
       confianca_minima: 0.85
     
     PF-Pulmao2-Eventuais:
       patterns:
         - "FARMACIA|DROGARIA|MEDICO"
         - "ZARA|RENNER|AMAZON.*MODA"
         - "MANUTENCAO|REPARO|CONSERTO"
       contexto: "PF"
       pulmao: "Pulmao 2"
       confianca_minima: 0.80
     
     PF-Pulmao3-Lazer:
       patterns:
         - "NETFLIX|SPOTIFY|PRIME|DISNEY"
         - "IFOOD|RAPPPI|RESTAURANTE|BAR|CAFE"
         - "AIRBNB|DECOLAR|CVC|PASSAGEM"
       contexto: "PF"
       pulmao: "Pulmao 3"
       confianca_minima: 0.85
     
     PJ-Orion:
       patterns:
         - "FACEBOOK ADS|GOOGLE ADS|TIKTOK ADS"
         - "HOSTINGER|AWS|VERCEL|NETLIFY"
         - "HOTMART|EDUZZ|KIWIFY|MONETIZZE"
       contexto: "PJ"
       pulmao: null
       confianca_minima: 0.90
   ```

3. **Salvar regras em memória**
   - Path: `squads/shlomo-engineering/_memory/classification-rules.yaml`
   - Formato: YAML estruturado com patterns, contextos e thresholds

4. **Calcular estatísticas das regras**
   - Total de patterns por pulmão
   - Cobertura estimada (% de transações que devem ser classificadas automaticamente)

## Output

Arquivo: `squads/shlomo-engineering/output/{run_id}/loaded-rules.yaml`

Com estrutura:
```yaml
regras_carregadas: 4
total_patterns: 24
cobertura_estimada: 0.75
rules:
  # ... regras completas
```

## Critérios de Qualidade
- Rules file deve ser válido YAML
- Cada regra deve ter: patterns, contexto, pulmao (ou null para PJ), confianca_minima
- Patterns devem ser case-insensitive
- Documentar origem de cada regra (referência externa ou inferida)
