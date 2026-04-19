const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logEvent } = require('../../../orchestrator/services/activity-logger');
const { createAlert } = require('../../../orchestrator/services/alerts');

class AnomalyDetector {
  detectAnomalies(transactions) {
    const results = [];
    const seen = new Map();

    transactions.forEach(tx => {
      const anomalies = [];
      let totalScore = 0;

      // 1. Valor z-score
      const values = transactions.map(t => t.valor || t.amount);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
      const zScore = std > 0 ? Math.abs((tx.valor || tx.amount) - mean) / std : 0;

      if (zScore > 2.5) {
        anomalies.push(`Valor fora do normal (z-score: ${zScore.toFixed(2)})`);
        totalScore += 0.4;
      }

      // 2. Transação duplicada
      const key = `${tx.descricao || tx.description}-${tx.valor || tx.amount}`;
      if (seen.has(key)) {
        const lastSeen = seen.get(key);
        const diffSeconds = (new Date(tx.data || tx.date) - lastSeen) / 1000;
        if (diffSeconds < 60) {
          anomalies.push('Transação duplicada em menos de 60 segundos');
          totalScore += 0.6;
        }
      }
      seen.set(key, new Date(tx.data || tx.date));

      // 3. Valor redondo suspeito
      const val = tx.valor || tx.amount;
      if (val >= 900 && val <= 1000 || val >= 9900 && val <= 10000) {
        anomalies.push('Valor redondo suspeito');
        totalScore += 0.3;
      }

      // 4. Horário fora do padrão
      const hour = new Date(tx.data || tx.date).getHours();
      if (hour >= 22 || hour < 6) {
        anomalies.push('Transação em horário incomum (22h-06h)');
        totalScore += 0.2;
      }

      if (anomalies.length > 0) {
        const score = Math.min(totalScore, 1);
        results.push({
          ...tx,
          anomaly: {
            score,
            reasons: anomalies
          }
        });

        // Disparar alerta se score > 0.8
        if (score > 0.8) {
          createAlert(
            'ANOMALY_DETECTED',
            'HIGH',
            `Anomalia detectada na transação`,
            `Transação de R$ ${(tx.valor || tx.amount).toFixed(2)} com score ${score.toFixed(2)}. Razões: ${anomalies.join(', ')}`,
            { 
              transactionId: tx.id,
              userId: tx.userId,
              score,
              reasons: anomalies 
            }
          ).catch(err => console.error('Erro ao criar alerta de anomalia:', err));
        }
      } else {
        results.push({ ...tx, anomaly: null });
      }
    });

    return results;
  }

  async detectAnomaliesForUser(userId, month) {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        data: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    return this.detectAnomalies(transactions);
  }
}

module.exports = AnomalyDetector;
