const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const { logEvent } = require('../services/activity-logger');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/exports/transactions.csv - Export transactions as CSV
router.get('/transactions.csv', async (req, res) => {
  try {
    const { month, contexto, pulmao, search, from, to } = req.query;

    // Build where clause
    const where = { deletedAt: null };

    if (contexto) where.contexto = contexto;
    if (pulmao) where.pulmao = parseInt(pulmao);

    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0);
      where.data = { gte: startDate, lte: endDate };
    } else {
      if (from) where.data = { ...where.data, gte: new Date(from) };
      if (to) where.data = { ...where.data, lte: new Date(to) };
    }

    if (search) {
      where.OR = [
        { descricao: { contains: search, mode: 'insensitive' } },
        { categoria: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { data: 'desc' },
      include: { user: { select: { whatsappNumber: true } } },
    });

    // Convert to CSV
    const fields = [
      'id', 'data', 'descricao', 'valor', 'contexto', 'pulmao', 'categoria',
      'confianca', 'user.whatsappNumber'
    ];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(transactions);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${month || 'export'}.csv`);

    // Log activity
    await logEvent({
      type: 'MESSAGE',
      squadId: 'system',
      agentId: 'export-service',
      payload: {
        message: `Transactions exported as CSV: ${transactions.length} records`,
        exportType: 'csv',
        filters: { month, contexto, pulmao, search },
      },
    });

    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/exports/report.pdf - Generate PDF report
router.get('/report.pdf', async (req, res) => {
  try {
    const { month } = req.query;
    const reportMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM

    // Fetch data for the report
    const [transactions, costs, leaderboard] = await Promise.all([
      // Transactions summary
      prisma.transaction.findMany({
        where: {
          deletedAt: null,
          data: {
            gte: new Date(reportMonth + '-01'),
            lt: new Date(reportMonth + '-01'),
          },
        },
      }),
      // Costs for the month
      prisma.costLedger.findMany({
        where: {
          createdAt: {
            gte: new Date(reportMonth + '-01'),
            lt: new Date(reportMonth + '-01'),
          },
        },
      }),
      // Leaderboard
      prisma.agentRun.groupBy({
        by: ['agentId'],
        _count: { id: true },
        _sum: { costUsd: true },
        where: {
          completedAt: {
            gte: new Date(reportMonth + '-01'),
            lt: new Date(reportMonth + '-01'),
          },
        },
      }),
    ]);

    // Create PDF
    const doc = new PDFDocument();
    const filename = `report-${reportMonth}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('OpenSquad Monthly Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Period: ${reportMonth}`, { align: 'center' });
    doc.moveDown(2);

    // Financial Summary
    const totalValue = transactions.reduce((sum, t) => sum + t.valor, 0);
    const totalCosts = costs.reduce((sum, c) => sum + c.costUsd, 0);

    doc.fontSize(16).text('Financial Summary');
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Total Transactions: ${transactions.length}`);
    doc.text(`Total Value: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    doc.text(`Total AI Costs: $${totalCosts.toFixed(2)}`);
    doc.moveDown();

    // Top Categories
    const categories = {};
    transactions.forEach(t => {
      categories[t.categoria] = (categories[t.categoria] || 0) + t.valor;
    });

    const topCategories = Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    doc.fontSize(16).text('Top Categories');
    doc.moveDown();
    doc.fontSize(12);
    topCategories.forEach(([cat, value]) => {
      doc.text(`${cat}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    });
    doc.moveDown();

    // Agent Performance
    doc.fontSize(16).text('Agent Performance');
    doc.moveDown();
    doc.fontSize(12);
    leaderboard.slice(0, 5).forEach(entry => {
      doc.text(`${entry.agentId}: ${entry._count.id} tasks, $${(entry._sum.costUsd || 0).toFixed(2)}`);
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).text(`Generated on ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });

    doc.end();

    // Log activity
    await logEvent({
      type: 'MESSAGE',
      squadId: 'system',
      agentId: 'export-service',
      payload: {
        message: `Monthly report generated: ${reportMonth}`,
        exportType: 'pdf',
        transactionsCount: transactions.length,
        totalValue,
        totalCosts,
      },
    });

  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/exports/activity.csv - Export activity events
router.get('/activity.csv', async (req, res) => {
  try {
    const { from, to } = req.query;

    const where = {};
    if (from) where.timestamp = { gte: new Date(from) };
    if (to) where.timestamp = { ...where.timestamp, lte: new Date(to) };

    const events = await prisma.activityEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 10000, // Limit for performance
    });

    const fields = [
      'id', 'timestamp', 'squadId', 'agentId', 'runId', 'executionId',
      'type', 'filePath', 'toolName', 'aiModel', 'tokensIn', 'tokensOut',
      'costUsd', 'durationMs', 'message'
    ];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(events);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=activity-export.csv`);

    // Log activity
    await logEvent({
      type: 'MESSAGE',
      squadId: 'system',
      agentId: 'export-service',
      payload: {
        message: `Activity events exported: ${events.length} records`,
        exportType: 'activity-csv',
      },
    });

    res.send(csv);
  } catch (error) {
    console.error('Error exporting activity CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;