const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logEvent } = require('../../../orchestrator/services/activity-logger');

class MonthlyForecaster {
  async forecastMonth(userId, month) {
    const startTime = Date.now();

    await logEvent({
      type: 'TOOL_CALL',
      squadId: 'shlomo-engineering',
      agentId: 'forecaster',
      payload: { message: `Iniciando forecast para mês ${month}`, userId, month }
    });

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const currentTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        data: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const currentSpent = currentTransactions.reduce((sum, tx) => sum + (tx.valor > 0 ? tx.valor : 0), 0);

    const lastMonth = new Date(year, monthNum - 2, 1);
    const lastMonthTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        data: {
          gte: lastMonth,
          lt: startDate
        }
      }
    });

    const lastMonthSpent = lastMonthTransactions.reduce((sum, tx) => sum + (tx.valor > 0 ? tx.valor : 0), 0);

    const recurringTransactions = this.identifyRecurringTransactions([...currentTransactions, ...lastMonthTransactions]);
    const recurringTotal = recurringTransactions.reduce((sum, tx) => sum + tx.averageValue, 0);

    const today = new Date();
    const daysPassed = Math.min(Math.max(Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)), 1), endDate.getDate());
    const totalDays = endDate.getDate();
    const projected = currentSpent + ((currentSpent / daysPassed) * (totalDays - daysPassed)) + recurringTotal * (totalDays - daysPassed) / totalDays;

    const byPulmao = {
      1: currentTransactions.filter(tx => tx.pulmao === 1).reduce((sum, tx) => sum + tx.valor, 0),
      2: currentTransactions.filter(tx => tx.pulmao === 2).reduce((sum, tx) => sum + tx.valor, 0),
      3: currentTransactions.filter(tx => tx.pulmao === 3).reduce((sum, tx) => sum + tx.valor, 0),
    };

    const byCategoria = {};
    currentTransactions.forEach(tx => {
      if (!byCategoria[tx.categoria]) byCategoria[tx.categoria] = 0;
      byCategoria[tx.categoria] += tx.valor;
    });

    const trendVsLastMonth = lastMonthSpent > 0 ? ((currentSpent - lastMonthSpent) / lastMonthSpent) * 100 : 0;

    const warnings = [];
    if (projected > lastMonthSpent * 1.2) {
      warnings.push(`Projeção ${Math.round(trendVsLastMonth)}% acima do mês anterior`);
    }
    if (byPulmao[3] > byPulmao[1]) {
      warnings.push('Gastos de pulmão 3 estão acima do pulmão 1');
    }

    const duration = Date.now() - startTime;
    await logEvent({
      type: 'TASK_COMPLETED',
      squadId: 'shlomo-engineering',
      agentId: 'forecaster',
      payload: { message: `Forecast concluído em ${duration}ms`, durationMs: duration, projected, currentSpent }
    });

    return {
      currentSpent,
      projected,
      byPulmao,
      byCategoria,
      trendVsLastMonth,
      recurringCount: recurringTransactions.length,
      daysPassed,
      totalDays,
      warnings
    };
  }

  identifyRecurringTransactions(transactions) {
    const groups = {};

    transactions.forEach(tx => {
      const key = tx.descricao.substring(0, 20).toLowerCase().replace(/\d+/g, '').trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });

    const recurring = [];
    Object.entries(groups).forEach(([key, txs]) => {
      if (txs.length >= 2) {
        recurring.push({
          description: txs[0].descricao,
          count: txs.length,
          averageValue: txs.reduce((sum, tx) => sum + tx.valor, 0) / txs.length,
          dates: txs.map(tx => tx.data)
        });
      }
    });

    return recurring;
  }
}

module.exports = MonthlyForecaster;
