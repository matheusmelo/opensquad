const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { scheduleJob, stopJob, getScheduledJobs } = require('../services/scheduler');
const { addSquadJob } = require('../services/queue');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/schedules - List all scheduled jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await getScheduledJobs();
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching scheduled jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schedules - Create new scheduled job
router.post('/', async (req, res) => {
  try {
    const { name, description, cron, squadId, payload, enabled } = req.body;

    if (!name || !cron || !squadId) {
      return res.status(400).json({
        error: 'name, cron, and squadId are required'
      });
    }

    const job = await scheduleJob({
      name,
      description,
      cron,
      squadId,
      payload,
      enabled,
    });

    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating scheduled job:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/schedules/:name - Get specific job
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const job = await prisma.scheduledJob.findUnique({
      where: { name },
    });

    if (!job) {
      return res.status(404).json({ error: 'Scheduled job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching scheduled job:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/schedules/:name - Update job
router.patch('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const updates = req.body;

    // Stop existing job if cron changed
    if (updates.cron) {
      await stopJob(name);
    }

    // Update in database
    const job = await prisma.scheduledJob.update({
      where: { name },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });

    // Reschedule if enabled
    if (job.enabled && updates.cron) {
      const payload = job.payloadJson ? JSON.parse(job.payloadJson) : {};
      await scheduleJob({
        name: job.name,
        description: job.description,
        cron: job.cron,
        squadId: job.squadId,
        payload,
        enabled: job.enabled,
      });
    }

    res.json(job);
  } catch (error) {
    console.error('Error updating scheduled job:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/schedules/:name - Delete job
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;

    // Stop the job first
    await stopJob(name);

    // Delete from database
    await prisma.scheduledJob.delete({
      where: { name },
    });

    res.json({ message: 'Scheduled job deleted successfully' });
  } catch (error) {
    console.error('Error deleting scheduled job:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/schedules/:name/run-now - Execute job immediately
router.post('/:name/run-now', async (req, res) => {
  try {
    const { name } = req.params;

    const job = await prisma.scheduledJob.findUnique({
      where: { name },
    });

    if (!job) {
      return res.status(404).json({ error: 'Scheduled job not found' });
    }

    // Execute immediately
    const payload = job.payloadJson ? JSON.parse(job.payloadJson) : {};
    const jobResult = await addSquadJob(job.squadId, {
      taskType: payload.taskType || 'manual_run',
      userMessage: `Manual execution of scheduled job: ${job.name}`,
      scheduledJob: job.name,
      ...payload,
    });

    res.json({
      message: 'Job executed immediately',
      jobId: jobResult.jobId,
      scheduledJob: job.name,
    });
  } catch (error) {
    console.error('Error running job immediately:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;