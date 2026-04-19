const express = require('express');
const { getQueueStatus, getJobStatus, cancelJob } = require('../services/queue');

const router = express.Router();

// GET /api/queue/status - Get queue statistics
router.get('/status', async (req, res) => {
  try {
    const status = await getQueueStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/queue/jobs/:id - Get job status
router.get('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const status = await getJobStatus(id);
    res.json(status);
  } catch (error) {
    console.error('Error getting job status:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/queue/jobs/:id - Cancel job
router.delete('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await cancelJob(id);
    if (success) {
      res.json({ message: 'Job cancelled successfully' });
    } else {
      res.status(404).json({ error: 'Job not found' });
    }
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;