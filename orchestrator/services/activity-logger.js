const { PrismaClient } = require('@prisma/client');
const { EventEmitter } = require('events');
const logger = require('./logger');

const prisma = new PrismaClient();
const activityBus = new EventEmitter();

// Configuração
const ACTIVITY_CONFIG = {
  max_events_per_run: 1000,
  retention_days: 30,
  broadcast_enabled: true
};

/**
 * Loga um evento de atividade
 * @param {Object} event
 * @param {string} event.type - TASK_STARTED|FILE_READ|FILE_WRITE|TOOL_CALL|AI_CALL|TASK_COMPLETED|TASK_FAILED|MESSAGE
 * @param {string} event.squadId
 * @param {string} event.agentId
 * @param {string} event.runId
 * @param {Object} event.payload
 */
async function logEvent(event) {
  try {
    const activityEvent = await prisma.activityEvent.create({
      data: {
        timestamp: event.timestamp || new Date(),
        executionId: event.executionId,
        runId: event.runId,
        agentId: event.agentId,
        squadId: event.squadId,
        type: event.type,
        filePath: event.payload?.filePath,
        toolName: event.payload?.toolName,
        aiModel: event.payload?.aiModel,
        tokensIn: event.payload?.tokensIn,
        tokensOut: event.payload?.tokensOut,
        costUsd: event.payload?.costUsd,
        durationMs: event.payload?.durationMs,
        message: event.payload?.message,
        payloadJson: event.payload ? JSON.stringify(event.payload) : null
      }
    });

    // Emitir para WebSocket broadcast
    if (ACTIVITY_CONFIG.broadcast_enabled) {
      activityBus.emit('activity', activityEvent);
    }

    return activityEvent;
  } catch (error) {
    logger.error('Erro logando activity event:', error);
    throw error;
  }
}

/**
 * Loga acesso a arquivo
 */
async function logFileTouch({ runId, agentId, filePath, action, linesAdded, linesRemoved, diffPreview }) {
  try {
    return await prisma.fileTouch.create({
      data: {
        runId,
        agentId,
        filePath,
        action,
        linesAdded,
        linesRemoved,
        diffPreview
      }
    });
  } catch (error) {
    console.error('Erro logando file touch:', error);
    throw error;
  }
}

/**
 * Inicia execução de agente
 */
async function startAgentRun({ executionId, agentId, aiModel, currentTask }) {
  try {
    const run = await prisma.agentRun.create({
      data: {
        executionId,
        agentId,
        aiModel,
        currentTask,
        status: 'working'
      }
    });

    // Log event
    await logEvent({
      type: 'TASK_STARTED',
      squadId: await getSquadIdFromExecution(executionId),
      agentId,
      runId: run.id,
      executionId,
      payload: { message: `Task started: ${currentTask}` }
    });

    return run.id;
  } catch (error) {
    console.error('Erro iniciando agent run:', error);
    throw error;
  }
}

/**
 * Finaliza execução de agente
 */
async function finishAgentRun(runId, { status, tokensIn, tokensOut, costUsd }) {
  try {
    const run = await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status,
        completedAt: new Date(),
        tokensIn,
        tokensOut,
        costUsd
      }
    });

    // Log event
    await logEvent({
      type: status === 'done' ? 'TASK_COMPLETED' : 'TASK_FAILED',
      squadId: await getSquadIdFromRun(runId),
      agentId: run.agentId,
      runId: run.id,
      executionId: run.executionId,
      payload: {
        message: `Task ${status}`,
        tokensIn,
        tokensOut,
        costUsd
      }
    });

    return run;
  } catch (error) {
    console.error('Erro finalizando agent run:', error);
    throw error;
  }
}

/**
 * Loga chamada de IA
 */
async function logAiCall({ runId, aiModel, tokensIn, tokensOut, costUsd, taskType }) {
  try {
    // Salva em CostLedger
    await prisma.costLedger.create({
      data: {
        agentId: await getAgentIdFromRun(runId),
        aiModel,
        tokensIn,
        tokensOut,
        costUsd,
        taskType
      }
    });

    // Log event
    await logEvent({
      type: 'AI_CALL',
      squadId: await getSquadIdFromRun(runId),
      agentId: await getAgentIdFromRun(runId),
      runId,
      payload: { aiModel, tokensIn, tokensOut, costUsd, taskType }
    });

  } catch (error) {
    console.error('Erro logando AI call:', error);
    throw error;
  }
}

/**
 * Helpers
 */
async function getSquadIdFromExecution(executionId) {
  const exec = await prisma.squadExecution.findUnique({
    where: { id: executionId }
  });
  return exec?.squadId;
}

async function getSquadIdFromRun(runId) {
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    include: { execution: true }
  });
  return run?.execution?.squadId;
}

async function getAgentIdFromRun(runId) {
  const run = await prisma.agentRun.findUnique({
    where: { id: runId }
  });
  return run?.agentId;
}

/**
 * Cleanup de eventos antigos
 */
async function cleanupOldEvents() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ACTIVITY_CONFIG.retention_days);

    const deleted = await prisma.activityEvent.deleteMany({
      where: { timestamp: { lt: cutoff } }
    });

    console.log(`🧹 Cleanup: ${deleted.count} activity events removed`);
  } catch (error) {
    console.error('Erro no cleanup:', error);
  }
}

module.exports = {
  logEvent,
  logFileTouch,
  startAgentRun,
  finishAgentRun,
  logAiCall,
  cleanupOldEvents,
  activityBus,
  ACTIVITY_CONFIG
};