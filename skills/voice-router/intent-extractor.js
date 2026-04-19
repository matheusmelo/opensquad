class IntentExtractor {
  extractIntent(transcriptText) {
    const text = transcriptText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const patterns = [
      {
        intent: 'query_balance',
        keywords: ['saldo', 'gastei', 'gastou', 'quanto', 'balanco', 'balanço', 'mes', 'até agora', 'hoje'],
        confidence: 0.9
      },
      {
        intent: 'upload_statement',
        keywords: ['fatura', 'extrato', 'nubank', 'itau', 'bradesco', 'santander', 'inter', 'envia', 'manda'],
        confidence: 0.85
      },
      {
        intent: 'approve_rule',
        keywords: ['aprova', 'aceita', 'regra', 'classifica', 'categoria', 'pulmao'],
        confidence: 0.8
      },
      {
        intent: 'list_agents',
        keywords: ['agentes', 'status', 'rodando', 'trabalhando', 'squads', 'online'],
        confidence: 0.95
      },
      {
        intent: 'run_squad',
        keywords: ['roda', 'executa', 'squad', 'shlomo', 'engenharia', 'autodev', 'inicia'],
        confidence: 0.85
      },
      {
        intent: 'forecast',
        keywords: ['projetado', 'projecao', 'previsao', 'vou gastar', 'quanto vou', 'fim do mes'],
        confidence: 0.8
      },
      {
        intent: 'anomalies',
        keywords: ['anomalias', 'suspeito', 'estranho', 'duplicado', 'fraude'],
        confidence: 0.75
      }
    ];

    let bestMatch = null;
    let bestConfidence = 0;

    patterns.forEach(pattern => {
      const matches = pattern.keywords.filter(k => text.includes(k));
      if (matches.length > 0) {
        const confidence = pattern.confidence * (matches.length / pattern.keywords.length + 0.5);
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = pattern;
        }
      }
    });

    if (bestMatch && bestConfidence > 0.6) {
      return {
        intent: bestMatch.intent,
        confidence: bestConfidence,
        entities: this.extractEntities(text),
        suggestedCommand: this.getSuggestedCommand(bestMatch.intent, text),
        originalText: transcriptText
      };
    }

    return {
      intent: 'other',
      confidence: 0.0,
      entities: {},
      suggestedCommand: null,
      originalText: transcriptText
    };
  }

  extractEntities(text) {
    const entities = {};

    const bankMatch = text.match(/nubank|itau|bradesco|santander|inter/);
    if (bankMatch) entities.bank = bankMatch[0];

    const monthMatch = text.match(/janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/);
    if (monthMatch) entities.month = monthMatch[0];

    const squadMatch = text.match(/shlomo|engenharia|autodev|builder/);
    if (squadMatch) entities.squadId = `shlomo-${squadMatch[0]}`;

    return entities;
  }

  getSuggestedCommand(intent, text) {
    switch (intent) {
      case 'query_balance':
        return 'GET /api/transactions/monthly';
      case 'upload_statement':
        return 'POST /api/upload/fatura';
      case 'approve_rule':
        return 'POST /api/rules/approve';
      case 'list_agents':
        return 'GET /api/monitor/executions';
      case 'run_squad':
        return 'POST /api/execute';
      case 'forecast':
        return 'GET /api/forecast';
      case 'anomalies':
        return 'GET /api/anomalies';
      default:
        return null;
    }
  }
}

module.exports = IntentExtractor;
