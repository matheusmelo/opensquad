const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { addSquadJob } = require('./queue');
const { logEvent } = require('./activity-logger');

const prisma = new PrismaClient();

// Store active cron jobs
const activeJobs = new Map();

/**
 * Schedule a job with cron expression
 */
async function scheduleJob(jobData) {
  try {
    // Validate cron expression
    if (!cron.validate(jobData.cron)) {
      throw new Error(`Invalid cron expression: ${jobData.cron}`);
    }

    // Create or update in database
    const job = await prisma.scheduledJob.upsert({
      where: { name: jobData.name },
      update: {
        description: jobData.description,
        cron: jobData.cron,
        squadId: jobData.squadId,
        payloadJson: JSON.stringify(jobData.payload || {}),
        enabled: jobData.enabled !== false,
        updatedAt: new Date(),
      },
      create: {
        name: jobData.name,
        description: jobData.description,
        cron: jobData.cron,
        squadId: jobData.squadId,
        payloadJson: JSON.stringify(jobData.payload || {}),
        enabled: jobData.enabled !== false,
      },
    });

    // Stop existing cron job if running
    if (activeJobs.has(jobData.name)) {
      activeJobs.get(jobData.name).stop();
      activeJobs.delete(jobData.name);
    }

    // Schedule new cron job if enabled
    if (job.enabled) {
      const cronJob = cron.schedule(jobData.cron, async () => {
        await executeScheduledJob(job);
      });

      activeJobs.set(jobData.name, cronJob);

      // Calculate next run time
      await updateNextRunTime(job.name);
    }

    return job;
  } catch (error) {
    console.error('Error scheduling job:', error);
    throw error;
  }
}

/**
 * Execute a scheduled job
 */
async function executeScheduledJob(job) {
  try {
    console.log(`[Scheduler] Executing job: ${job.name}`);

    // Update last run time
    await prisma.scheduledJob.update({
      where: { name: job.name },
      data: { lastRunAt: new Date() },
    });

    // Parse payload
    const payload = job.payloadJson ? JSON.parse(job.payloadJson) : {};

    // Add to queue
    const jobResult = await addSquadJob(job.squadId, {
      taskType: payload.taskType || 'scheduled',
      userMessage: payload.message || `Scheduled job: ${job.name}`,
      scheduledJob: job.name,
      ...payload,
    });

    // Log activity
    await logEvent({
      type: 'MESSAGE',
      squadId: 'scheduler',
      agentId: 'cron-scheduler',
      payload: {
        message: `Scheduled job executed: ${job.name}`,
        jobId: jobResult.jobId,
        squadId: job.squadId,
      },
    });

    // Update next run time
    await updateNextRunTime(job.name);

    console.log(`[Scheduler] Job ${job.name} queued with ID: ${jobResult.jobId}`);
  } catch (error) {
    console.error(`[Scheduler] Error executing job ${job.name}:`, error);

    await logEvent({
      type: 'MESSAGE',
      squadId: 'scheduler',
      agentId: 'cron-scheduler',
      payload: {
        message: `Scheduled job failed: ${job.name}`,
        error: error.message,
      },
    });
  }
}

/**
 * Update next run time for a job
 */
async function updateNextRunTime(jobName) {
  try {
    const job = await prisma.scheduledJob.findUnique({
      where: { name: jobName },
    });

    if (!job) return;

    // Calculate next run time (simplified - would need proper cron parsing)
    const nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000); // Next day as approximation

    await prisma.scheduledJob.update({
      where: { name: jobName },
      data: { nextRunAt: nextRun },
    });
  } catch (error) {
    console.error('Error updating next run time:', error);
  }
}

/**
 * Stop a scheduled job
 */
async function stopJob(jobName) {
  try {
    if (activeJobs.has(jobName)) {
      activeJobs.get(jobName).stop();
      activeJobs.delete(jobName);
    }

    await prisma.scheduledJob.update({
      where: { name: jobName },
      data: { enabled: false },
    });
  } catch (error) {
    console.error('Error stopping job:', error);
    throw error;
  }
}

/**
 * Get all scheduled jobs
 */
async function getScheduledJobs() {
  try {
    return await prisma.scheduledJob.findMany({
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error getting scheduled jobs:', error);
    throw error;
  }
}

/**
 * Initialize scheduler on startup
 */
async function initializeScheduler() {
  try {
    console.log('[Scheduler] Initializing...');

    const jobs = await prisma.scheduledJob.findMany({
      where: { enabled: true },
    });

    for (const job of jobs) {
      try {
        const payload = job.payloadJson ? JSON.parse(job.payloadJson) : {};
        await scheduleJob({
          name: job.name,
          description: job.description,
          cron: job.cron,
          squadId: job.squadId,
          payload,
          enabled: job.enabled,
        });
        console.log(`[Scheduler] Job ${job.name} scheduled`);
      } catch (error) {
        console.error(`[Scheduler] Failed to schedule job ${job.name}:`, error);
      }
    }

    console.log(`[Scheduler] Initialized with ${activeJobs.size} active jobs`);
  } catch (error) {
    console.error('Error initializing scheduler:', error);
  }
}

/**
 * Create default scheduled jobs
 */
async function createDefaultJobs() {
  const defaultJobs = [
    {
      name: 'relatorio-diario',
      description: 'Gera relatório diário de atividades',
      cron: '0 9 * * *', // Every day at 9 AM
      squadId: 'shlomo-engineering',
      payload: {
        taskType: 'daily_report',
        message: 'Generate daily activity report'
      },
    },
    {
      name: 'limpeza-semanal',
      description: 'Limpa dados antigos semanalmente',
      cron: '0 2 * * 0', // Every Sunday at 2 AM
      squadId: 'shlomo-engineering',
      payload: {
        taskType: 'cleanup',
        message: 'Clean old data and logs'
      },
    },
    {
      name: 'backup-diario',
      description: 'Faz backup diário do banco',
      cron: '0 1 * * *', // Every day at 1 AM
      squadId: 'shlomo-engineering',
      payload: {
        taskType: 'backup',
        message: 'Create database backup'
      },
    },
  ];

  for (const jobData of defaultJobs) {
    try {
      await scheduleJob(jobData);
      console.log(`[Scheduler] Default job created: ${jobData.name}`);
    } catch (error) {
      console.error(`[Scheduler] Failed to create default job ${jobData.name}:`, error);
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Scheduler] Shutting down...');
  for (const [name, job] of activeJobs) {
    job.stop();
  }
  await prisma.$disconnect();
});

module.exports = {
  scheduleJob,
  stopJob,
  getScheduledJobs,
  initializeScheduler,
  createDefaultJobs,
};