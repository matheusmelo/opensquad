const express = require('express');
const router = express.Router();

// Stubs seguros — dependências das squads não têm o prisma local resolvido
// Só expõe os endpoints sem travar o orchestrator

router.post('/classify', async (req, res) => {
  try {
    const { transactions = [] } = req.body;
    const classified = transactions.map(tx => ({
      ...tx,
      classification: { contexto: 'PF', pulmao: 1, categoria: 'Geral', confianca: 0.7 }
    }));
    res.json({ success: true, classified });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/classify/preview', (req, res) => {
  res.json({ description: req.query.description, suggestion: 'Alimentação', pulmao: 1 });
});

router.get('/forecast', (req, res) => {
  res.json({ month: req.query.month, forecastedExpenses: 0, confidence: 0.5 });
});

router.get('/anomalies', (req, res) => {
  res.json({ anomalies: [], checked: true });
});

router.post('/squads/generate', (req, res) => {
  res.json({ success: true, message: 'Squad generation queued', description: req.body.description });
});

module.exports = router;
