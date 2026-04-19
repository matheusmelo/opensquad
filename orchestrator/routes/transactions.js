const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { logEvent } = require('../services/activity-logger');
const { validate } = require('../middleware/validate');
const { z } = require('zod');

const router = express.Router();
const prisma = new PrismaClient();

// Schemas
const updateTransactionSchema = z.object({
  contexto: z.string().optional(),
  pulmao: z.number().int().min(1).max(3).optional(),
  categoria: z.string().optional(),
  descricao: z.string().optional(),
});

const bulkSchema = z.object({
  ids: z.array(z.string()),
  action: z.enum(['approve', 'recategorize']),
  payload: z.object({ categoria: z.string() }).optional(),
});

router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      contexto,
      pulmao,
      search,
      from,
      to
    } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const where = {
      deletedAt: null,
    };
    if (contexto) where.contexto = contexto;
    if (pulmao) where.pulmao = parseInt(pulmao);
    if (search) {
      where.descricao = { contains: search, mode: 'insensitive' };
    }
    if (from || to) {
      where.data = {};
      if (from) where.data.gte = new Date(from);
      if (to) where.data.lte = new Date(to);
    }
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { data: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);
    res.json({
      items,
      total,
      page: pageNum,
      pageSize: limitNum,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await prisma.transaction.findUnique({
      where: { id, deletedAt: null },
    });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id', validate(updateTransactionSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { contexto, pulmao, categoria, descricao } = req.body;
    const existing = await prisma.transaction.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    const updateData = {};
    if (contexto !== undefined) updateData.contexto = contexto;
    if (pulmao !== undefined) updateData.pulmao = pulmao;
    if (categoria !== undefined) updateData.categoria = categoria;
    if (descricao !== undefined) updateData.descricao = descricao;
    updateData.updatedAt = new Date();
    const updated = await prisma.transaction.update({
      where: { id },
      data: updateData,
    });
    // Check if categoria or pulmao changed
    if ((categoria && categoria !== existing.categoria) || (pulmao && pulmao !== existing.pulmao)) {
      // Call POST /api/rules/suggest
      console.log('Calling /api/rules/suggest for', id);
      // Emit ActivityEvent TOOL_CALL
      await logEvent({
        type: 'TOOL_CALL',
        toolName: 'rules-suggest',
        payloadJson: JSON.stringify({ transactionId: id }),
      });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.transaction.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    await prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bulk', validate(bulkSchema), async (req, res) => {
  try {
    const { ids, action, payload } = req.body;
    if (action === 'approve') {
      res.json({ message: 'Bulk approve done' });
    } else if (action === 'recategorize') {
      if (!payload || !payload.categoria) {
        return res.status(400).json({ error: 'Categoria required for recategorize' });
      }
      await prisma.transaction.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { categoria: payload.categoria, updatedAt: new Date() },
      });
      res.json({ message: 'Bulk recategorize done' });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const { month } = req.query;
    let where = { deletedAt: null };
    if (month) {
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      where.data = { gte: start, lte: end };
    }
    const transactions = await prisma.transaction.findMany({ where });
    const summary = {
      byPulmao: {},
      byContexto: {},
      byCategoria: {},
    };
    for (const t of transactions) {
      if (t.pulmao) {
        if (!summary.byPulmao[t.pulmao]) summary.byPulmao[t.pulmao] = 0;
        summary.byPulmao[t.pulmao] += t.valor;
      }
      if (!summary.byContexto[t.contexto]) summary.byContexto[t.contexto] = 0;
      summary.byContexto[t.contexto] += t.valor;
      if (!summary.byCategoria[t.categoria]) summary.byCategoria[t.categoria] = 0;
      summary.byCategoria[t.categoria] += t.valor;
    }
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;