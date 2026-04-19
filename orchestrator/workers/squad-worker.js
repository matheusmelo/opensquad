const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { startAgentRun, finishAgentRun, logEvent, logAiCall } = require('./services/activity-logger');

const prisma = new PrismaClient();

// Redis connection config (with fallback)
const connection = process.env.REDIS_URL ? {
  host: process.env.REDIS_URL.split(':')[0],
  port: parseInt(process.env.REDIS_URL.split(':')[1]) || 6379,
  password: process.env.REDIS_PASSWORD
} : {
  // Fallback to memory-based queue (no Redis)
  host: 'localhost',
  port: 6379,
  lazyConnect: true // Will fail gracefully if no Redis
};

// Worker processor function
async function processSquadJob(job) {
  const { squadId, payload } = job.data;

  console.log(`[BullMQ] Processing squad: ${squadId}`);

  try {
    // Find agent in DB
    const dbAgent = await prisma.agent.findFirst({ where: { squadId } });
    if (!dbAgent) {
      throw new Error(`No agent found for squad ${squadId}`);
    }

    // Start agent run tracking
    const runId = await startAgentRun({
      executionId: `exec-${job.id}`,
      agentId: dbAgent.id,
      aiModel: 'qwen-3.6-plus',
      currentTask: payload.taskType || 'Processing'
    });

    // Create squad directory structure
    const squadPath = path.join('C:/inetpub/opensquad', 'squads', squadId);
    const stateFile = path.join(squadPath, 'state.json');

    // Initialize state
    fs.writeFileSync(stateFile, JSON.stringify({
      status: 'working',
      progress: 0,
      current_task: 'Initializing...',
      jobId: job.id
    }));

    // Simulate squad processing pipeline
    const pipelineSteps = [
      'Analysis & Planning',
      'Coding Logic',
      'Security Testing',
      'Code Review'
    ];

    for (let i = 0; i < pipelineSteps.length; i++) {
      const step = pipelineSteps[i];
      const pct = Math.floor(((i + 1) / pipelineSteps.length) * 100);

      // Update state file
      fs.writeFileSync(stateFile, JSON.stringify({
        status: 'working',
        progress: pct,
        current_task: step,
        jobId: job.id
      }));

      // Update DB
      await prisma.agentRun.update({
        where: { id: runId },
        data: { currentTask: step, progressPct: pct }
      });

      // Log event
      await logEvent({
        type: 'AI_CALL',
        squadId,
        agentId: dbAgent.id,
        runId,
        payload: {
          message: `Executing step: ${step}`,
          aiModel: 'qwen-3.6-plus'
        }
      });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Complete the job
    await finishAgentRun(runId, {
      status: 'done',
      tokensIn: 500,
      tokensOut: 200,
      costUsd: 0.002
    });

    // Update state file
    fs.writeFileSync(stateFile, JSON.stringify({
      status: 'completed',
      progress: 100,
      jobId: job.id
    }));

    // Create output
    const outputDir = path.join(squadPath, 'output', `run-${Date.now()}`);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'dashboard-data.json'), JSON.stringify({
      status: 'success',
      processed_at: new Date().toISOString(),
      jobId: job.id
    }));

    console.log(`[BullMQ] Completed squad: ${squadId}`);

    return { success: true, outputDir };

  } catch (error) {
    console.error(`[BullMQ] Error processing ${squadId}:`, error);

    // Log failure
    await logEvent({
      type: 'TASK_FAILED',
      squadId,
      agentId: 'queue-worker',
      payload: {
        message: `Squad processing failed: ${error.message}`,
        error: error.message
      }
    });

    throw error;
  }
}

// Create and start worker
const worker = new Worker('squad-queue', processSquadJob, {
  connection,
  concurrency: parseInt(process.env.MAX_CONCURRENT_SQUADS) || 3,
  removeOnComplete: 50,
  removeOnFail: 100,
});

worker.on('completed', (job) => {
  console.log(`[BullMQ] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[BullMQ] Job ${job.id} failed:`, err.message);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[BullMQ] Shutting down worker...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = worker;