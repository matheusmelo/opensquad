const express = require('express');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Rate limiting: 30 requests per minute per IP
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    error: 'Too many search requests, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to search endpoint
router.use('/search', searchLimiter);

// GET /api/search - Global search across multiple entities
router.get('/search', async (req, res) => {
  try {
    const { q: query, types = 'transactions,agents,files,events', limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters long'
      });
    }

    const searchLimit = Math.min(parseInt(limit), 50); // Max 50 results per type
    const searchTypes = types.split(',').map(t => t.trim());
    const results = {};

    // Search transactions
    if (searchTypes.includes('transactions')) {
      results.transactions = await prisma.transaction.findMany({
        where: {
          deletedAt: null,
          OR: [
            { descricao: { contains: query, mode: 'insensitive' } },
            { categoria: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          data: true,
          descricao: true,
          valor: true,
          categoria: true,
          contexto: true,
          pulmao: true,
        },
        orderBy: { data: 'desc' },
        take: searchLimit,
      });
    }

    // Search agents (by name/id)
    if (searchTypes.includes('agents')) {
      const agents = await prisma.agent.findMany({
        where: {
          OR: [
            { id: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
            { role: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          role: true,
          squadId: true,
          icon: true,
        },
        take: searchLimit,
      });

      // Also search agent runs for more context
      const agentRuns = await prisma.agentRun.findMany({
        where: {
          currentTask: { contains: query, mode: 'insensitive' },
          status: 'working', // Only active runs
        },
        include: {
          agent: {
            select: { id: true, name: true, role: true, squadId: true },
          },
        },
        take: searchLimit,
      });

      results.agents = [
        ...agents,
        ...agentRuns.map(run => ({
          id: run.agent.id,
          name: run.agent.name,
          role: run.agent.role,
          squadId: run.agent.squadId,
          currentTask: run.currentTask,
          status: run.status,
        })),
      ].filter((agent, index, self) =>
        // Remove duplicates by id
        index === self.findIndex(a => a.id === agent.id)
      );
    }

    // Search files (by path)
    if (searchTypes.includes('files')) {
      const fileTouches = await prisma.fileTouch.findMany({
        where: {
          filePath: { contains: query, mode: 'insensitive' },
        },
        select: {
          filePath: true,
          action: true,
          linesAdded: true,
          linesRemoved: true,
          createdAt: true,
          agentId: true,
        },
        orderBy: { createdAt: 'desc' },
        take: searchLimit,
      });

      // Group by file path
      const fileMap = new Map();
      fileTouches.forEach(touch => {
        if (!fileMap.has(touch.filePath)) {
          fileMap.set(touch.filePath, {
            filePath: touch.filePath,
            lastAction: touch.action,
            lastModified: touch.createdAt,
            agentId: touch.agentId,
            touches: 0,
          });
        }
        fileMap.get(touch.filePath).touches++;
      });

      results.files = Array.from(fileMap.values());
    }

    // Search activity events
    if (searchTypes.includes('events')) {
      results.events = await prisma.activityEvent.findMany({
        where: {
          OR: [
            { message: { contains: query, mode: 'insensitive' } },
            { squadId: { contains: query, mode: 'insensitive' } },
            { agentId: { contains: query, mode: 'insensitive' } },
            { type: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          timestamp: true,
          squadId: true,
          agentId: true,
          type: true,
          message: true,
        },
        orderBy: { timestamp: 'desc' },
        take: searchLimit,
      });
    }

    // Add metadata
    const metadata = {
      query,
      types: searchTypes,
      limit: searchLimit,
      timestamp: new Date().toISOString(),
      totalResults: Object.values(results).reduce((sum, arr) => sum + arr.length, 0),
    };

    res.json({
      ...results,
      _metadata: metadata,
    });

  } catch (error) {
    console.error('Error performing global search:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;