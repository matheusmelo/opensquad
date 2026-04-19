const { Queue } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Redis connection config
const connection = process.env.REDIS_URL ? {
  host: process.env.REDIS_URL.split(':')[0],
  port: parseInt(process.env.REDIS_URL.split(':')[1]) || 6379,
  password: process.env.REDIS_PASSWORD
} : {
  host: 'localhost',
  port: 6379,
};

// Try to create BullMQ queue, fallback to memory
let bullQueue = null;
let useMemoryFallback = false;
const memoryQueue = [];

try {
  bullQueue = new Queue('squad-queue', { connection });
} catch (error) {
  console.warn('BullMQ not available, using memory fallback:', error.message);
  useMemoryFallback = true;
}

async function addSquadJob(squadId, payload = {}) {
  try {
    if (!useMemoryFallback && bullQueue) {
      // Use BullMQ
      const job = await bullQueue.add('process-squad', { squadId, payload }, {
        priority: payload.priority || 5,
        removeOnComplete: 50,
        removeOnFail: 100,
      });

      await prisma.squadExecution.create({
        data: {
          id: `exec-${job.id}`,
          squadId,
          status: 'queued',
          taskType: payload.taskType || 'process',
          taskPayload: JSON.stringify(payload),
          priority: payload.priority || 5,
        }
      });

      return { jobId: job.id.toString(), status: 'queued', squadId, priority: payload.priority || 5 };
    } else {
      // Memory fallback
      const job = { id: Date.now().toString(), data: { squadId, payload } };
      memoryQueue.push(job);

      await prisma.squadExecution.create({
        data: {
          id: `exec-${job.id}`,
          squadId,
          status: 'queued',
          taskType: payload.taskType || 'process',
          taskPayload: JSON.stringify(payload),
          priority: payload.priority || 5,
        }
      });

      return { jobId: job.id, status: 'queued', squadId, priority: payload.priority || 5 };
    }
  } catch (error) {
    console.error('Error adding squad job:', error);
    throw error;
  }
}

async function getQueueStatus() {
  if (!useMemoryFallback && bullQueue) {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        bullQueue.getWaiting(),
        bullQueue.getActive(),
        bullQueue.getCompleted(),
        bullQueue.getFailed(),
        bullQueue.getDelayed(),
      ]);

      return {
        active: active.length,
        waiting: waiting.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      };
    } catch (error) {
      console.error('Error getting BullMQ status:', error);
      return { active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0, total: 0 };
    }
  } else {
    return { active: 0, waiting: memoryQueue.length, completed: 0, failed: 0, delayed: 0, total: memoryQueue.length };
  }
}

async function getJobStatus(jobId) {
  if (!useMemoryFallback && bullQueue) {
    try {
      const job = await bullQueue.getJob(jobId);
      if (!job) return { error: 'Job not found' };
      return { id: job.id, status: await job.getState(), data: job.data };
    } catch (error) {
      console.error('Error getting BullMQ job status:', error);
      return { error: 'Job not found' };
    }
  } else {
    const job = memoryQueue.find(j => j.id === jobId);
    if (!job) return { error: 'Job not found' };
    return { id: job.id, status: 'queued', data: job.data };
  }
}

async function cancelJob(jobId) {
  if (!useMemoryFallback && bullQueue) {
    try {
      const job = await bullQueue.getJob(jobId);
      if (job) {
        await job.remove();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error cancelling BullMQ job:', error);
      return false;
    }
  } else {
    const index = memoryQueue.findIndex(j => j.id === jobId);
    if (index === -1) return false;
    memoryQueue.splice(index, 1);
    return true;
  }
}

module.exports = {
  addSquadJob,
  getQueueStatus,
  getJobStatus,
  cancelJob,
  memoryQueue
};