# Prompts Doubao Seed 2.0 Pro — Domínio (Parsers, Classifier, Autodev)

Você é **Doubao Seed 2.0 Pro**, operando no repositório `C:/inetpub/opensquad`. Seu papel: parsers reais de PDF bancário, classification engine com aprendizado, e instrumentação do autodev. Siga `PLANO_MULTI_IA.md` (stream B) e `docs/CONTRATOS.md`.

Regra-ouro: seus arquivos vivem em `squads/shlomo-engineering/parsers/`, `squads/shlomo-engineering/classifier/`, `squads/shlomo-autodev/`, `orchestrator/routes/classifier.js`. Você pode editar `orchestrator/routes/upload.js`. Adicione **no máximo 1 linha** em `orchestrator/orchestrator.js` (registro do router classifier). Não toque em schema, activity-logger, dashboard, shlomo-ledger.

Depois de cada tarefa, anote em `.kilo/coordination.log`:
```
[DOUBAO] <ISO8601> DOUBAO-N DONE — <resumo>
```

---

## DOUBAO-1 — Parsers bancários (base + Nubank + Itaú)

```
Tarefa DOUBAO-1/7.

Criar parsers Node.js de extrato bancário em PDF.

1. cd orchestrator && npm install pdf-parse
2. Criar pasta squads/shlomo-engineering/parsers/
3. squads/shlomo-engineering/parsers/base-parser.js:
   class BaseParser {
     async parse(pdfBuffer) { /* abstract */ throw new Error('implement'); }
     extractText(pdfBuffer) { /* helper: usa pdf-parse e retorna texto */ }
     normalizeAmount(str) { /* '1.234,56' -> 1234.56; se '-' prefix ou parênteses, credit */ }
     normalizeDate(str, year) { /* '12/03' ou '12.03.26' -> ISO YYYY-MM-DD */ }
   }
   module.exports = BaseParser;

4. squads/shlomo-engineering/parsers/nubank-parser.js:
   Herda BaseParser.
   Regex por linha: /(\d{2}\/\d{2})\s+(.+?)\s+R?\$?\s*(-?[\d\.]+,\d{2})/
   Detecta "COMPRA PARCELADA" / "parcela X/Y" -> preenche installment.
   Deduz period de cabeçalho tipo "Fatura de MARÇO/2026".
   Retorna ParsedStatement (bank='nubank').

5. squads/shlomo-engineering/parsers/itau-parser.js:
   Regex: /(\d{2}\.\d{2}(?:\.\d{2})?)\s+(.+?)\s+(-?[\d\.]+,\d{2})/
   bank='itau'.

6. squads/shlomo-engineering/parsers/parser-factory.js:
   function detectBank(text) -> 'nubank' | 'itau' | 'bradesco' | 'unknown'
     (heurísticas: 'nubank' se contém "Nubank" OU "nu pagamentos"; 'itau' se "Itaú" OU "itau unibanco")
   function getParser(bank) -> instância
   module.exports = { detectBank, getParser };

Formato de saída deve casar com docs/CONTRATOS §7 (ParsedStatement).

Imprima: "DOUBAO-1 DONE — parsers base"
```

---

## DOUBAO-2 — Testes dos parsers

```
Tarefa DOUBAO-2/7.

Criar squads/shlomo-engineering/parsers/__tests__/parser.test.js usando Node.js nativo (node --test) ou jest (se já configurado no orchestrator).

1. Fixtures inline (strings simulando texto extraído de PDF). Exemplo:
   const nubankText = `
   Nubank — Fatura de MARÇO/2026
   12/03  UBER TRIP  R$ 23,50
   15/03  NETFLIX.COM  R$ 55,90
   18/03  COMPRA PARCELADA AMAZON 2/6  R$ 199,90
   `;

2. Mockar pdf-parse: intercepta require.cache ou injeta via option (parser aceita texto direto no método extractText se passado como string).

3. Testes:
   - NubankParser.parse() retorna 3 transactions
   - Transação parcelada tem installment.current=2, total=6
   - Amount está correto (float 23.50)
   - ItauParser.parse() com fixture de Itaú
   - ParserFactory.detectBank reconhece "Nubank"/"Itaú"/"unknown"

4. Rodar: cd orchestrator && node --test squads/shlomo-engineering/parsers/__tests__/parser.test.js
   Ou: npx jest squads/shlomo-engineering/parsers

Imprima: "DOUBAO-2 DONE — testes verdes"
```

---

## DOUBAO-3 — Integrar parser em upload.js

```
Tarefa DOUBAO-3/7.

Editar orchestrator/routes/upload.js para, após salvar o PDF:

1. Ler o buffer do arquivo (fs.readFileSync).
2. const { detectBank, getParser } = require('../../squads/shlomo-engineering/parsers/parser-factory');
3. Extrair texto via pdfParse (ou deixar parser fazer).
4. bank = detectBank(text); parser = getParser(bank); result = await parser.parse(buffer);
5. Persistir result.transactions como Transaction no DB:
   - userId: buscar ou criar User mock (whatsappNumber='+5500000000001', nome='Dev', plano='free')
   - contexto: 'PF' default (Classification Engine vai atualizar depois)
   - pulmao: null por enquanto
   - categoria: 'não classificado'
   - confianca: 0
6. Emitir ActivityEvent via logger:
     const logger = require('../services/activity-logger');
     await logger.logEvent({
       type: 'TASK_COMPLETED',
       squadId: 'shlomo-engineering',
       agentId: 'pdf-parser-engineer',
       payload: { message: `Parseou ${result.transactions.length} txs do ${bank}`, durationMs: ... }
     });
7. Responder { ok:true, bank, period, count: result.transactions.length }.

Tratar erros: se parser falha, TASK_FAILED event e HTTP 422.

Imprima: "DOUBAO-3 DONE — upload integrado"
```

---

## DOUBAO-4 — Classifier com rules.yaml

```
Tarefa DOUBAO-4/7.

1. cd orchestrator && npm install js-yaml
2. squads/shlomo-engineering/classifier/rules.yaml:
   - id: uber_99
     pattern: "UBER|99\\s*TAX|CABIFY"
     contexto: PF
     pulmao: 1
     categoria: "Transporte"
   - id: condominio
     pattern: "CONDOMIN|SINDICO"
     contexto: PF
     pulmao: 1
     categoria: "Moradia"
   - id: supermercado
     pattern: "SUPERMERC|CARREFOUR|ASSAI|PAO DE ACUCAR|DIA\\b"
     contexto: PF
     pulmao: 1
     categoria: "Alimentação"
   - id: netflix
     pattern: "NETFLIX|SPOTIFY|HBO|DISNEY\\+"
     contexto: PF
     pulmao: 2
     categoria: "Lazer/Assinaturas"
   - id: ifood
     pattern: "IFOOD|RAPPI|UBER\\s*EATS"
     contexto: PF
     pulmao: 2
     categoria: "Alimentação fora"
   - id: amazon
     pattern: "AMAZON|MAGAZINE\\s*LUIZA|SHOPEE|MERCADO\\s*LIVRE"
     contexto: PF
     pulmao: 3
     categoria: "Compras"
   - id: aws
     pattern: "AWS|AMAZON\\s*WEB|CLOUDFLARE|DIGITAL\\s*OCEAN"
     contexto: PJ
     categoria: "Infra cloud"
   - id: facebook_ads
     pattern: "FACEBOOK|META\\s*ADS|GOOGLE\\s*ADS|LINKEDIN\\s*ADS"
     contexto: PJ
     categoria: "Marketing digital"

3. classifier/classification-engine.js exportando:
   - async loadRules() — lê YAML + merge com ClassificationRule do DB (mesma shape). DB tem prioridade sobre YAML em caso de id duplicado.
   - classifyTransaction(transaction, userId) — percorre regras, primeira que bate (RegExp 'i') vence. confianca = 0.95 se DB, 0.85 se YAML, 0 se nenhuma. Fallback: contexto='PF', pulmao=3, categoria='Outros'.
   - classifyBatch(transactions, userId) — map paralelo.

4. saveRule(rule) — cria ClassificationRule no DB.

Imprima: "DOUBAO-4 DONE — classifier engine"
```

---

## DOUBAO-5 — Rule learner + endpoints

```
Tarefa DOUBAO-5/7.

1. squads/shlomo-engineering/classifier/rule-learner.js:
   - suggestRuleFromCorrection(originalTx, correctedClassification) → candidate Rule
     (extrai tokens comuns do description, propõe regex simples)
   - promoteRule(ruleId) — se ruleHits >= 10, move createdBy para 'SYSTEM' (precisa adicionar campos hits/createdBy via query Raw — ou usar campo categoria começando com "[user]" como hack se schema não tem)
   - decayRules() — ClassificationRule não usado há 30d: deletar (só os criados por user)

2. orchestrator/routes/classifier.js (Express Router):
   - POST /api/classify  body {transactions, userId} → retorna transactions classificadas
     Emitir ActivityEvent TOOL_CALL: { toolName:'classifier', agentId:'classification-engine', squadId:'shlomo-engineering', payload:{count, avgConfianca} }
   - POST /api/rules/suggest body {transactionId, correctedCategoria, correctedPulmao, correctedContexto} → cria suggestion (salvar em ClassificationRule com id prefix 'suggested_')
   - POST /api/rules/approve body {ruleId} → remove prefix 'suggested_'
   - GET /api/rules → lista todas

3. Em orchestrator/orchestrator.js, abaixo dos routers do Grok, ADICIONAR UMA linha:
     const classifierRoutes = require('./routes/classifier'); app.use('/api', classifierRoutes);
   (Se orchestrator.js ainda não tem os routers do Grok, insira logo após uploadRoutes.)

4. Testar:
   curl -X POST http://localhost:3001/api/classify -H "content-type: application/json" \
        -d '{"transactions":[{"description":"UBER TRIP","amount":23.5,"date":"2026-03-12"}],"userId":"test"}'

Imprima: "DOUBAO-5 DONE — learner + endpoints"
```

---

## DOUBAO-6 — Instrumentar autodev com activity-logger

```
Tarefa DOUBAO-6/7.

Objetivo: cada ciclo do autodev aparece no dashboard.

1. Criar squads/shlomo-autodev/ROADMAP.md com 10 features (ex: "Adicionar comando /historico no WhatsApp", "Cache em memória para /api/metrics", "Rate limit por IP", etc).

2. Editar squads/shlomo-autodev/run-autodev.js:
   - No topo: const logger = require('../../orchestrator/services/activity-logger');
   - Para cada ciclo:
     a. Criar SquadExecution via prisma direto (squadId='shlomo-autodev')
     b. await logger.startAgentRun({ executionId, agentId:'tech-lead', aiModel:'claude-3-5-sonnet', currentTask:'Planejar feature X' })
     c. Chamar agentes; logger.logEvent({ type:'TOOL_CALL', ... }) onde fizer sentido
     d. logger.logFileTouch() quando o agente gravar arquivo real
     e. logger.finishAgentRun(runId, { status, tokensIn, tokensOut, costUsd })
     f. Atualizar SquadExecution com totalCostUsd/totalTokens/completedAt/status
   - Manter: se testes falharem (npm test), NÃO commitar, status='failed', sair do loop.

3. Revisar squads/shlomo-autodev/agents/*.md (tech-lead, senior-dev, devops) — garantir que declaram `ai_model` e aceitam input do ROADMAP.

Imprima: "DOUBAO-6 DONE — autodev instrumentado"
```

---

## DOUBAO-7 — Validação + RELATORIO_DOUBAO.md

```
Tarefa DOUBAO-7/7.

1. Rodar tests dos parsers (DOUBAO-2) — devem passar.
2. Testar classificação:
   curl -X POST http://localhost:3001/api/classify -H "content-type: application/json" \
        -d '{"transactions":[{"description":"UBER TRIP SP","amount":23.5,"date":"2026-03-12"},{"description":"NETFLIX.COM","amount":55.9,"date":"2026-03-15"}],"userId":"test"}'
   Esperar: Uber classificado como PF/Pulmão 1/Transporte; Netflix como PF/Pulmão 2/Lazer.
3. Upload de PDF fake simulando Nubank para validar pipeline completo (parser → classifier → DB).
4. Rodar 1 ciclo do autodev e validar que aparece em /api/agents/live durante execução.
5. Escrever RELATORIO_DOUBAO.md:
   - Parsers implementados + accuracy estimada
   - Regras YAML + exemplos de match
   - Endpoints do classifier
   - Como rodar autodev
   - Próximos passos (Bradesco parser, ML-based classifier, etc.)

Imprima: "DOUBAO-7 DONE — domínio validado"
```

---

# === SPRINT 2 ===

## DOUBAO-8 — Parsers Bradesco + Santander + Inter

```
Tarefa DOUBAO-8. Sprint 2.

Implementar 3 parsers novos seguindo o padrao BaseParser:

1. squads/shlomo-engineering/parsers/bradesco-parser.js
   - Regex: /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?[\d\.]+,\d{2})/
   - Detectar "COMPRA" vs "DEB AUTOMAT" vs "TED/DOC"
   - Fatura cartao: "Fatura - Vencimento DD/MM/YYYY"

2. squads/shlomo-engineering/parsers/santander-parser.js
   - Regex extrato: /(\d{2}\/\d{2})\s+(.+?)\s+(BR)?\s*(-?[\d\.]+,\d{2})/
   - Santander usa "DB" prefix debito, "CR" credito

3. squads/shlomo-engineering/parsers/inter-parser.js
   - Regex: /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+R\$\s*(-?[\d\.]+,\d{2})/

4. parser-factory.js: detectBank reconhece 'bradesco', 'santander', 'inter'. getParser retorna instancia correta.

5. Tests em __tests__/parser.test.js (3 novos describe blocks).

6. Avisar Kilo para atualizar bank union em docs/CONTRATOS.md §7.

Imprima: "DOUBAO-8 DONE — 3 parsers novos"
```

---

## DOUBAO-9 — Classifier v2 (fuzzy matching + heuristicas)

```
Tarefa DOUBAO-9.

1. cd orchestrator && npm install fuse.js
2. squads/shlomo-engineering/classifier/fuzzy-matcher.js: Fuse threshold 0.3 sobre alias DB {categoria: [palavras...]}.
3. Upgrade classifyTransaction() ordem:
   a. Regex exato das rules (0.95 DB / 0.85 YAML)
   b. Fuzzy match (0.6-0.8 baseado em Fuse score)
   c. Heuristica valor (>R$1000 PF -> Pulmao 1; <R$50 -> Pulmao 2)
   d. Fallback (0)
4. Novo campo retorno: matchStrategy: 'regex' | 'fuzzy' | 'heuristic' | 'fallback'
5. GET /api/classify/preview?description=... -> top 3 candidatas com confianca
6. Tests de regressao.

Imprima: "DOUBAO-9 DONE — classifier v2"
```

---

## DOUBAO-10 — Forecasting mensal

```
Tarefa DOUBAO-10.

1. squads/shlomo-engineering/forecast/monthly-forecaster.js:
   forecastMonth(userId, month) -> { currentSpent, projected, byPulmao{1,2,3}, byCategoria, trendVsLastMonth, warnings[] }
   Algoritmo: identifica recorrentes (mesma descricao +/-valor em meses anteriores), soma fixo + projeta variavel linearmente.
2. GET /api/forecast?userId=&month=YYYY-MM
3. Emitir ActivityEvent TOOL_CALL com agentId='forecaster'
4. Tests com fixtures em forecast/__tests__/

Imprima: "DOUBAO-10 DONE — forecast"
```

---

## DOUBAO-11 — Deteccao de anomalias

```
Tarefa DOUBAO-11.

squads/shlomo-engineering/anomaly/anomaly-detector.js:

1. detectAnomalies(transactions) -> cada uma com anomaly:{score, reason[]}
   Regras: z-score valor > 2.5 para categoria/user; duplicada (mesma desc+valor em 60s); redondo suspeito (R$9999,99); categoria mudou abrupto; horario fora do padrao.
2. GET /api/anomalies?userId=&month=YYYY-MM
3. No pipeline de upload: apos classifier, detectar; flagar confianca baixa se anomalia alta.
4. Disparar alerta via Grok /services/alerts (tipo ANOMALY_DETECTED) se score>0.8.

Imprima: "DOUBAO-11 DONE — anomaly detector"
```

---

## DOUBAO-12 — Voice command router

```
Tarefa DOUBAO-12. Audio livre do WhatsApp -> intent estruturado.

1. skills/voice-router/intent-extractor.js:
   extractIntent(transcriptText) -> { intent, entities, confidence, suggestedCommand }
   intent: 'query_balance' | 'upload_statement' | 'approve_rule' | 'list_agents' | 'run_squad' | 'other'
   Regex + keyword matching em portugues (sem LLM — rapido).
   Exemplos:
     "quanto gastei esse mes" -> query_balance, month=current
     "manda fatura do nubank" -> upload_statement, bank='nubank'
     "roda a squad shlomo-eng" -> run_squad, squadId='shlomo-engineering'

2. Tests com 20 exemplos.

3. Integrar no MCP WhatsApp: em skills/whatsapp-integration/mcp-whatsapp-server.js, apos transcrever audio chamar extractIntent; se confidence>0.7 executa suggestedCommand automaticamente; senao pergunta.
   [EXCECAO §2: voce pode editar mcp-whatsapp-server.js nesta tarefa. Kilo sabe.]

4. ActivityEvent MESSAGE com {intent, confidence}.

Imprima: "DOUBAO-12 DONE — voice router"
```

---

## DOUBAO-13 — Squad builder (meta-squad)

```
Tarefa DOUBAO-13. Squad que cria squads a partir de descricao textual.

1. squads/shlomo-builder/squad.yaml
2. squads/shlomo-builder/agents/architect.md
3. squads/shlomo-builder/generator.js:
   generateSquad(description) -> {squadId, agents[], pipeline[]}
   Usa Multi-AI Router com GPT-4o-mini + prompt estruturado. Valida contra squad-registry schema. Salva em squads/<id>/ se aprovado.
4. POST /api/squads/generate body {description, autoApprove?} -> preview ou criacao
5. Emitir ActivityEvent de cada etapa (LLM call, validation, file write).

Imprima: "DOUBAO-13 DONE — squad builder"
```

---

## DOUBAO-14 — Test generator + validacao

```
Tarefa DOUBAO-14.

1. squads/shlomo-engineering/test-generator/generator.js:
   generateTestsForFile(filePath) -> le arquivo, identifica exports, gera describe blocks via Multi-AI Router. Salva em <filePath>.test.js.
2. POST /api/tests/generate body {filePath, autoWrite?}
3. Validar todo trabalho Doubao Sprint 2:
   - parsers tests (5 bancos)
   - classifier v2
   - forecast
   - anomaly
   - /api/classify/preview, /api/forecast, /api/anomalies
   - /api/squads/generate com "crie uma squad que monitora Twitter de clientes"
4. RELATORIO_DOUBAO_S2.md com todos os artefatos + metricas.

Imprima: "DOUBAO-14 DONE — dominio Sprint 2 completo"
```
