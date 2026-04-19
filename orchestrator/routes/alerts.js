const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { resolveAlert, getActiveAlerts } = require('../services/alerts');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/alerts - List active alerts
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = await getActiveAlerts(limit);
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/alerts/:id - Get specific alert
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/alerts/:id/resolve - Mark alert as resolved
router.post('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    await resolveAlert(id);
    res.json({ message: 'Alert marked as resolved' });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/alerts/history - Get alert history
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const alerts = await prisma.alert.findMany({
      orderBy: { triggeredAt: 'desc' },
      take: limit,
    });
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alert history:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/alerts/stats - Get alert statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await prisma.alert.groupBy({
      by: ['type', 'severity'],
      _count: {
        id: true,
      },
      where: {
        triggeredAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    const total = await prisma.alert.count({
      where: {
        triggeredAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const active = await prisma.alert.count({
      where: {
        resolvedAt: null,
      },
    });

    res.json({
      total,
      active,
      byType: stats.reduce((acc, stat) => {
        acc[stat.type] = (acc[stat.type] || 0) + stat._count.id;
        return acc;
      }, {}),
      bySeverity: stats.reduce((acc, stat) => {
        acc[stat.severity] = (acc[stat.severity] || 0) + stat._count.id;
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;