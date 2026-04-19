const { PrismaClient } = require('@prisma/client');
const { logEvent } = require('./activity-logger');

const prisma = new PrismaClient();

// Alert types and their thresholds
const ALERT_CONFIG = {
  BUDGET_EXCEEDED: {
    threshold: parseFloat(process.env.DAILY_BUDGET_USD) || 5.0,
    severity: 'HIGH',
    checkInterval: 5 * 60 * 1000, // 5 minutes
  },
  SQUAD_FAILED: {
    severity: 'MEDIUM',
    checkInterval: 10 * 60 * 1000, // 10 minutes
  },
  QUEUE_BACKLOG: {
    threshold: 20, // Jobs waiting
    severity: 'MEDIUM',
    checkInterval: 2 * 60 * 1000, // 2 minutes
  },
  AGENT_STUCK: {
    threshold: 30 * 60 * 1000, // 30 minutes
    severity: 'HIGH',
    checkInterval: 15 * 60 * 1000, // 15 minutes
  },
};

// Notification channels
const channels = {
  console: async (alert) => {
    console.warn(`🚨 ALERT [${alert.severity}]: ${alert.title}`);
    console.warn(`   ${alert.message}`);
  },

  webhook: async (alert) => {
    const webhookUrl = process.env.ALERT_WEBHOOK;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          metadata: alert.metadataJson ? JSON.parse(alert.metadataJson) : null,
          triggered_at: alert.triggeredAt,
        }),
      });
    } catch (error) {
      console.error('Webhook notification failed:', error);
    }
  },

  whatsapp: async (alert) => {
    // Integration with WhatsApp MCP server
    const whatsappUrl = 'http://localhost:3003/send';
    try {
      const message = `🚨 *ALERTA ${alert.severity}*\n\n*${alert.title}*\n${alert.message}`;

      await fetch(whatsappUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: process.env.ADMIN_PHONE || '5511999999999',
          text: message,
        }),
      });
    } catch (error) {
      console.error('WhatsApp notification failed:', error);
    }
  },
};

/**
 * Create a new alert
 */
async function createAlert(type, severity, title, message, metadata = {}) {
  try {
    // Check for duplicate active alerts (same type, not resolved)
    const existing = await prisma.alert.findFirst({
      where: {
        type,
        resolvedAt: null,
        triggeredAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    if (existing) {
      console.log(`Alert ${type} already exists, skipping`);
      return existing;
    }

    const alert = await prisma.alert.create({
      data: {
        type,
        severity,
        title,
        message,
        metadataJson: JSON.stringify(metadata),
      },
    });

    // Send notifications
    await notifyChannels(alert);

    // Log activity event
    await logEvent({
      type: 'MESSAGE',
      squadId: 'system',
      agentId: 'alert-system',
      payload: {
        message: `Alert triggered: ${title}`,
        alertType: type,
        severity,
      },
    });

    return alert;
  } catch (error) {
    console.error('Error creating alert:', error);
    throw error;
  }
}

/**
 * Send alert to all configured channels
 */
async function notifyChannels(alert) {
  const enabledChannels = process.env.ALERT_CHANNELS ?
    process.env.ALERT_CHANNELS.split(',') :
    ['console']; // Default to console only

  for (const channelName of enabledChannels) {
    if (channels[channelName]) {
      try {
        await channels[channelName](alert);
      } catch (error) {
        console.error(`Failed to send alert via ${channelName}:`, error);
      }
    }
  }
}

/**
 * Check budget usage
 */
async function checkBudget() {
  const config = ALERT_CONFIG.BUDGET_EXCEEDED;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const todayCost = await prisma.costLedger.aggregate({
      where: {
        createdAt: { gte: today },
      },
      _sum: { costUsd: true },
    });

    const totalCost = todayCost._sum.costUsd || 0;

    if (totalCost > config.threshold) {
      await createAlert(
        'BUDGET_EXCEEDED',
        config.severity,
        `Orçamento Diário Excedido: $${totalCost.toFixed(2)}`,
        `O custo diário excedeu o limite de $${config.threshold}. Total gasto hoje: $${totalCost.toFixed(2)}`,
        { totalCost, threshold: config.threshold, date: today.toISOString() }
      );
    }
  } catch (error) {
    console.error('Error checking budget:', error);
  }
}

/**
 * Check for squad failures
 */
async function checkSquadFailures() {
  try {
    // Look for executions that failed in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const failedExecutions = await prisma.squadExecution.findMany({
      where: {
        status: 'failed',
        completedAt: { gte: oneHourAgo },
      },
    });

    for (const execution of failedExecutions) {
      await createAlert(
        'SQUAD_FAILED',
        ALERT_CONFIG.SQUAD_FAILED.severity,
        `Squad ${execution.squadId} Falhou`,
        `Execução ${execution.id} da squad ${execution.squadId} falhou. Tipo: ${execution.taskType}`,
        {
          executionId: execution.id,
          squadId: execution.squadId,
          taskType: execution.taskType,
          error: execution.error,
        }
      );
    }
  } catch (error) {
    console.error('Error checking squad failures:', error);
  }
}

/**
 * Check queue backlog
 */
async function checkQueueBacklog() {
  const config = ALERT_CONFIG.QUEUE_BACKLOG;

  try {
    // This would need integration with BullMQ queue status
    // For now, check execution queue in memory
    const waitingCount = executionQueue?.length || 0;

    if (waitingCount > config.threshold) {
      await createAlert(
        'QUEUE_BACKLOG',
        config.severity,
        `Fila de Execução Cheia: ${waitingCount} jobs`,
        `${waitingCount} squads aguardando processamento. Limite: ${config.threshold}`,
        { waitingCount, threshold: config.threshold }
      );
    }
  } catch (error) {
    console.error('Error checking queue backlog:', error);
  }
}

/**
 * Check for stuck agents
 */
async function checkStuckAgents() {
  const config = ALERT_CONFIG.AGENT_STUCK;

  try {
    const stuckThreshold = new Date(Date.now() - config.threshold);

    const stuckRuns = await prisma.agentRun.findMany({
      where: {
        status: 'working',
        startedAt: { lt: stuckThreshold },
      },
      include: {
        agent: true,
      },
    });

    for (const run of stuckRuns) {
      const duration = Date.now() - run.startedAt.getTime();
      const hours = Math.floor(duration / (60 * 60 * 1000));

      await createAlert(
        'AGENT_STUCK',
        config.severity,
        `Agent Travado: ${run.agent.name}`,
        `Agent ${run.agent.name} está executando há ${hours} horas. Task: ${run.currentTask}`,
        {
          agentId: run.agentId,
          agentName: run.agent.name,
          runId: run.id,
          currentTask: run.currentTask,
          startedAt: run.startedAt,
          durationMs: duration,
        }
      );
    }
  } catch (error) {
    console.error('Error checking stuck agents:', error);
  }
}

/**
 * Mark alert as resolved
 */
async function resolveAlert(alertId) {
  try {
    await prisma.alert.update({
      where: { id: alertId },
      data: { resolvedAt: new Date() },
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    throw error;
  }
}

/**
 * Get active alerts
 */
async function getActiveAlerts(limit = 50) {
  try {
    return await prisma.alert.findMany({
      where: { resolvedAt: null },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
    });
  } catch (error) {
    console.error('Error getting active alerts:', error);
    throw error;
  }
}

// Start periodic checks
function startMonitoring() {
  // Budget check every 5 minutes
  setInterval(checkBudget, ALERT_CONFIG.BUDGET_EXCEEDED.checkInterval);

  // Squad failures check every 10 minutes
  setInterval(checkSquadFailures, ALERT_CONFIG.SQUAD_FAILED.checkInterval);

  // Queue backlog check every 2 minutes
  setInterval(checkQueueBacklog, ALERT_CONFIG.QUEUE_BACKLOG.checkInterval);

  // Stuck agents check every 15 minutes
  setInterval(checkStuckAgents, ALERT_CONFIG.AGENT_STUCK.checkInterval);

  console.log('🚨 Alert monitoring started');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🚨 Shutting down alert system...');
  await prisma.$disconnect();
});

module.exports = {
  createAlert,
  checkBudget,
  checkSquadFailures,
  checkQueueBacklog,
  checkStuckAgents,
  resolveAlert,
  getActiveAlerts,
  startMonitoring,
  ALERT_CONFIG,
};