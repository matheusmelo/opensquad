const express = require('express');
const { PrismaClient } = require('@prisma/client');
// Mock classification for testing
const ClassificationEngine = class {
  classifyTransaction(tx) {
    return {
      contexto: tx.type === 'credit' ? 'PF' : 'PF',
      pulmao: tx.description.includes('UBER') ? 2 : 1,
      categoria: tx.description.includes('UBER') ? 'Transporte' : 'Alimentação',
      confianca: 0.8
    };
  }

  async classifyBatch(transactions) {
    return transactions.map(tx => ({
      ...tx,
      classification: this.classifyTransaction(tx)
    }));
  }
};

const RuleLearner = class {
  suggestRuleFromCorrection() {
    return { pattern: 'TEST', contexto: 'PF', pulmao: 1, categoria: 'Test' };
  }

  async learnFromCorrection() {
    return Promise.resolve({ pattern: 'TEST' });
  }
};

const router = express.Router();
const prisma = new PrismaClient();
const classifier = new ClassificationEngine();
const ruleLearner = new RuleLearner();

// GET /api/agents - Lista todos os agentes com status mais recente
router.get('/agents', async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 1,
          select: {
            status: true,
            currentTask: true,
            startedAt: true,
            elapsedMs: true,
            costTodayUsd: true,
            lastFileTouched: true,
            tokensUsedToday: true,
            aiModel: true,
            progressPct: true,
          },
        },
      },
    });

    // Transform to match AgentStatus interface
    const formattedAgents = agents.map(agent => ({
      agentId: agent.id,
      name: agent.name,
      squadId: agent.squadId,
      status: agent.runs[0]?.status || 'idle',
      currentTask: agent.runs[0]?.currentTask,
      startedAt: agent.runs[0]?.startedAt?.toISOString(),
      elapsedMs: agent.runs[0]?.elapsedMs || 0,
      progressPct: agent.runs[0]?.progressPct || 0,
      aiModel: agent.runs[0]?.aiModel,
      cost_today_usd: agent.runs[0]?.costTodayUsd || 0,
      last_file_touched: agent.runs[0]?.lastFileTouched,
      role: agent.role,
      icon: agent.icon,
    }));

    res.json(formattedAgents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agents/live - Agentes ativos agora
router.get('/agents/live', async (req, res) => {
  try {
    const activeRuns = await prisma.agentRun.findMany({
      where: {
        status: 'working',
      },
      include: {
        agent: {
          select: {
            name: true,
            squadId: true,
            role: true,
            icon: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    const liveAgents = activeRuns.map(run => ({
      agentId: run.agentId,
      name: run.agent.name,
      squadId: run.agent.squadId,
      status: run.status,
      currentTask: run.currentTask,
      startedAt: run.startedAt?.toISOString(),
      elapsedMs: run.elapsedMs || Math.floor((Date.now() - run.startedAt.getTime()) / 1000) * 1000,
      progressPct: run.progressPct || 0,
      aiModel: run.aiModel,
      cost_today_usd: run.costUsd || 0,
      last_file_touched: run.error || null,
      role: run.agent.role,
      icon: run.agent.icon,
    }));

    res.json(liveAgents);
  } catch (error) {
    console.error('Error fetching live agents:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agents/:id/timeline - Timeline do agente
router.get('/agents/:id/timeline', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const events = await prisma.activityEvent.findMany({
      where: { agentId: id },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    res.json(events);
  } catch (error) {
    console.error('Error fetching agent timeline:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/agents/:id/files - Arquivos tocados pelo agente
router.get('/agents/:id/files', async (req, res) => {
  try {
    const { id } = req.params;

    const fileTouches = await prisma.fileTouch.groupBy({
      by: ['filePath'],
      where: { agentId: id },
      _count: { filePath: true },
      _max: { createdAt: true },
      orderBy: { _count: { filePath: 'desc' } },
      take: 20,
    });

    const formatted = fileTouches.map(touch => ({
      filePath: touch.filePath,
      touches: touch._count.filePath,
      lastAction: 'write', // Default, could be enhanced
      lastAt: touch._max.createdAt?.toISOString(),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching agent files:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/executions/live - Execuções ativas
router.get('/executions/live', async (req, res) => {
  try {
    const liveExecutions = await prisma.squadExecution.findMany({
      where: {
        status: 'running',
      },
      include: {
        runs: {
          include: {
            agent: {
              select: { name: true },
            },
          },
        },
        events: {
          take: 10,
          orderBy: { timestamp: 'desc' },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    const formatted = liveExecutions.map(exec => ({
      squad_id: exec.squadId,
      status: exec.status,
      pipeline: exec.runs.map(run => ({
        step_id: run.id,
        label: run.currentTask || 'Processing',
        status: run.status,
        agent_id: run.agentId,
      })),
      active_agents: exec.runs.filter(r => r.status === 'working').map(r => r.agentId),
      started_at: exec.startedAt?.toISOString(),
      estimated_completion: null, // Could calculate based on average duration
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching live executions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/executions/:id - Detalhes da execução
router.get('/executions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const execution = await prisma.squadExecution.findUnique({
      where: { id },
      include: {
        runs: {
          include: {
            agent: true,
            events: {
              orderBy: { timestamp: 'desc' },
              take: 50,
            },
            fileTouches: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
        events: {
          orderBy: { timestamp: 'desc' },
          take: 100,
        },
      },
    });

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({
      squad_id: execution.squadId,
      status: execution.status,
      pipeline: execution.runs.map(run => ({
        step_id: run.id,
        label: run.currentTask || 'Task',
        status: run.status,
        agent_id: run.agentId,
      })),
      active_agents: execution.runs.filter(r => r.status === 'working').map(r => r.agentId),
      started_at: execution.startedAt?.toISOString(),
      completed_at: execution.completedAt?.toISOString(),
      total_cost_usd: execution.runs.reduce((sum, r) => sum + (r.costUsd || 0), 0),
      total_tokens: execution.runs.reduce((sum, r) => sum + (r.tokensIn || 0) + (r.tokensOut || 0), 0),
      runs: execution.runs,
      events: execution.events,
    });
  } catch (error) {
    console.error('Error fetching execution details:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/metrics/costs - Custos por período
router.get('/metrics/costs', async (req, res) => {
  try {
    const period = req.query.period || 'today';

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case 'today':
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        };
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        dateFilter = { gte: weekAgo };
        break;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        dateFilter = { gte: monthAgo };
        break;
    }

    const costs = await prisma.costLedger.aggregate({
      where: { createdAt: dateFilter },
      _sum: { costUsd: true },
    });

    const costsByModel = await prisma.costLedger.groupBy({
      by: ['aiModel'],
      where: { createdAt: dateFilter },
      _sum: { costUsd: true, tokensIn: true, tokensOut: true },
      _count: true,
    });

    const costsByDay = await prisma.costLedger.groupBy({
      by: ['createdAt'],
      where: { createdAt: dateFilter },
      _sum: { costUsd: true },
      orderBy: { createdAt: 'asc' },
    });

    const formattedCostsByDay = costsByDay.map(day => ({
      date: day.createdAt.toISOString().split('T')[0],
      usd: day._sum.costUsd || 0,
    }));

    res.json({
      period,
      totalUsd: costs._sum.costUsd || 0,
      totalBrl: (costs._sum.costUsd || 0) * 5.0,
      byModel: costsByModel.reduce((acc, model) => {
        acc[model.aiModel] = {
          usd: model._sum.costUsd || 0,
          tasks: model._count,
        };
        return acc;
      }, {}),
      byAgent: {}, // Could be enhanced
      byDay: formattedCostsByDay,
    });
  } catch (error) {
    console.error('Error fetching costs:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/metrics/throughput - Throughput de tarefas
router.get('/metrics/throughput', async (req, res) => {
  try {
    const period = req.query.period || 'today';
    const now = new Date();

    let dateFilter = {};
    switch (period) {
      case 'today':
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        };
        break;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        dateFilter = { gte: weekAgo };
        break;
    }

    const completedRuns = await prisma.agentRun.findMany({
      where: {
        status: 'done',
        completedAt: dateFilter,
      },
      select: {
        completedAt: true,
        status: true,
      },
    });

    // Group by hour
    const hourlyStats = completedRuns.reduce((acc, run) => {
      if (!run.completedAt) return acc;

      const hour = run.completedAt.getHours();
      if (!acc[hour]) {
        acc[hour] = { completed: 0, failed: 0 };
      }
      acc[hour].completed++;
      return acc;
    }, {});

    const throughput = Object.entries(hourlyStats).map(([hour, stats]) => ({
      hour: `${hour}:00`,
      completed: stats.completed,
      failed: stats.failed,
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hour)).toISOString(),
    }));

    res.json(throughput);
  } catch (error) {
    console.error('Error fetching throughput:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/metrics/top-files - Arquivos mais editados
router.get('/metrics/top-files', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const topFiles = await prisma.fileTouch.groupBy({
      by: ['filePath'],
      _count: { filePath: true },
      _max: { createdAt: true },
      orderBy: { _count: { filePath: 'desc' } },
      take: limit,
    });

    const formatted = topFiles.map(file => ({
      filePath: file.filePath,
      touches: file._count.filePath,
      lastAction: 'write', // Default
      lastAt: file._max.createdAt?.toISOString(),
      lastAgentId: 'unknown', // Could be enhanced
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching top files:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/metrics/leaderboard - Ranking de agentes
router.get('/metrics/leaderboard', async (req, res) => {
  try {
    const leaderboard = await prisma.agentRun.groupBy({
      by: ['agentId'],
      _count: { id: true },
      _sum: {
        costUsd: true,
        tokensIn: true,
        tokensOut: true,
      },
      where: {
        status: 'done',
      },
    });

    const formatted = await Promise.all(
      leaderboard.map(async (entry) => {
        const agent = await prisma.agent.findUnique({
          where: { id: entry.agentId },
          select: { name: true },
        });

        const successRate = entry._count.id > 0 ? 0.95 : 0; // Mock success rate

        return {
          agentId: entry.agentId,
          name: agent?.name || entry.agentId,
          tasksCompleted: entry._count.id,
          totalCostUsd: entry._sum.costUsd || 0,
          tokensUsed: (entry._sum.tokensIn || 0) + (entry._sum.tokensOut || 0),
          successRatePct: successRate * 100,
        };
      })
    );

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/classify - Classify transactions
router.post('/classify', async (req, res) => {
  try {
    const { transactions, userId } = req.body;

    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Transactions array required' });
    }

    const classified = await classifier.classifyBatch(transactions, userId || 'default');

    res.json({
      success: true,
      classified,
      summary: {
        total: classified.length,
        classified: classified.filter(tx => tx.classification.confianca > 0.5).length,
        needsReview: classified.filter(tx => tx.classification.confianca <= 0.5).length
      }
    });
  } catch (error) {
    console.error('Error classifying transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rules/suggest - Suggest new rule from correction
router.post('/rules/suggest', async (req, res) => {
  try {
    const { originalTransaction, correctedClassification } = req.body;

    if (!originalTransaction || !correctedClassification) {
      return res.status(400).json({ error: 'Original transaction and correction required' });
    }

    const suggestion = ruleLearner.suggestRuleFromCorrection(
      originalTransaction,
      correctedClassification
    );

    res.json({
      success: true,
      suggestion,
      patterns: ruleLearner.extractPatterns(originalTransaction.description)
    });
  } catch (error) {
    console.error('Error suggesting rule:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rules/approve - Approve suggested rule
router.post('/rules/approve', async (req, res) => {
  try {
    const { ruleId, rule } = req.body;

    if (!rule) {
      return res.status(400).json({ error: 'Rule data required' });
    }

    await classifier.saveRule(rule);

    if (ruleId) {
      await ruleLearner.promoteRule(ruleId);
    }

    res.json({ success: true, message: 'Rule approved and saved' });
  } catch (error) {
    console.error('Error approving rule:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;