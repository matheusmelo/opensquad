const express = require('express');
const { z } = require('zod');
const pluggy = require('../services/pluggy');
const { syncItem, prisma } = require('../services/pluggy-sync');
const logger = require('../services/logger');

const router = express.Router();

const contextoSchema = z.enum(['PF', 'PJ']);

function handleError(res, error) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: 'Dados inválidos', details: error.issues });
  }
  const status = error instanceof pluggy.PluggyError ? (error.status >= 400 ? error.status : 502) : 500;
  res.status(status).json({ error: error.message, details: error.details });
}

// Front usa para saber se mostra o botão ou o aviso de configuração
router.get('/status', (req, res) => {
  res.json({
    configured: pluggy.isConfigured(),
    webhook: Boolean(process.env.PLUGGY_WEBHOOK_URL),
    includeSandbox: process.env.PLUGGY_INCLUDE_SANDBOX !== 'false',
  });
});

// Token para abrir o widget Pluggy Connect (novo banco ou reconectar um item)
router.post('/connect-token', async (req, res) => {
  try {
    const { itemId } = z.object({ itemId: z.string().optional() }).parse(req.body || {});
    const accessToken = await pluggy.createConnectToken({ itemId, clientUserId: 'shlomo-ledger' });
    res.json({ accessToken });
  } catch (error) {
    handleError(res, error);
  }
});

// Chamado pelo front no onSuccess do widget: registra o item e importa os dados
router.post('/connections', async (req, res) => {
  try {
    const { itemId, contexto } = z
      .object({ itemId: z.string().min(1), contexto: contextoSchema.default('PF') })
      .parse(req.body);
    const result = await syncItem(itemId, { contexto });
    res.status(201).json(result);
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/connections', async (req, res) => {
  try {
    const connections = await prisma.bankConnection.findMany({
      include: { accounts: { orderBy: { nome: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(connections);
  } catch (error) {
    handleError(res, error);
  }
});

// Reimporta transações. ?refresh=true também pede ao Pluggy para ir no banco
// buscar dados novos (assíncrono — o resultado chega pelo webhook ou num próximo sync).
router.post('/connections/:id/sync', async (req, res) => {
  try {
    const connection = await prisma.bankConnection.findUnique({ where: { id: req.params.id } });
    if (!connection) return res.status(404).json({ error: 'Conexão não encontrada' });

    if (req.query.refresh === 'true') {
      await pluggy.refreshItem(connection.pluggyItemId);
    }
    const days = req.body?.days ? Number(req.body.days) : undefined;
    const reclassify = req.body?.reclassify === true;
    res.json(await syncItem(connection.pluggyItemId, { days, reclassify }));
  } catch (error) {
    handleError(res, error);
  }
});

router.patch('/connections/:id', async (req, res) => {
  try {
    const { contexto } = z.object({ contexto: contextoSchema }).parse(req.body);
    const connection = await prisma.bankConnection.update({
      where: { id: req.params.id },
      data: { contexto },
    });
    res.json(connection);
  } catch (error) {
    handleError(res, error);
  }
});

// Remove o consentimento no Pluggy e a conexão local. As transações já
// importadas ficam no ledger (bankAccountId vira null).
router.delete('/connections/:id', async (req, res) => {
  try {
    const connection = await prisma.bankConnection.findUnique({ where: { id: req.params.id } });
    if (!connection) return res.status(404).json({ error: 'Conexão não encontrada' });

    try {
      await pluggy.deleteItem(connection.pluggyItemId);
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    await prisma.bankConnection.delete({ where: { id: connection.id } });
    res.status(204).end();
  } catch (error) {
    handleError(res, error);
  }
});

/**
 * Webhook do Pluggy. Configure PLUGGY_WEBHOOK_URL com uma URL pública HTTPS
 * (ex.: https://seu-dominio/api/pluggy/webhook?token=SEGREDO) e
 * PLUGGY_WEBHOOK_SECRET=SEGREDO. Responde 200 na hora e sincroniza em seguida.
 */
router.post('/webhook', (req, res) => {
  const secret = process.env.PLUGGY_WEBHOOK_SECRET;
  if (secret && req.query.token !== secret) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { event, itemId } = req.body || {};
  res.status(200).json({ received: true });

  const syncEvents = ['item/created', 'item/updated', 'transactions/created', 'transactions/updated'];
  if (!itemId || !syncEvents.includes(event)) return;

  prisma.bankConnection
    .findUnique({ where: { pluggyItemId: itemId } })
    .then((connection) => {
      // Só sincroniza itens que o próprio app registrou
      if (connection) return syncItem(itemId);
    })
    .catch((error) => logger.error({ err: error.message, itemId, event }, 'Falha no webhook Pluggy'));
});

module.exports = router;
