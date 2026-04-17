const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Endpoint para squad notificar conclusão
router.post('/squad-complete', async (req, res) => {
  try {
    const {
      squad_id,
      run_id,
      status,
      output_summary,
      completed_at,
      error
    } = req.body;
    
    console.log(`🔔 Webhook recebido: ${squad_id} - ${status}`);
    
    // Validar payload
    if (!squad_id || !run_id || !status) {
      return res.status(400).json({
        error: 'Missing required fields: squad_id, run_id, status'
      });
    }
    
    // Salvar notificação em fila de processamento
    const notificationPath = path.join(
      __dirname,
      '../squads',
      squad_id,
      'webhook-notifications.json'
    );
    
    let notifications = [];
    if (fs.existsSync(notificationPath)) {
      notifications = JSON.parse(fs.readFileSync(notificationPath, 'utf-8'));
    }
    
    notifications.push({
      squad_id,
      run_id,
      status,
      output_summary,
      completed_at: completed_at || new Date().toISOString(),
      received_at: new Date().toISOString(),
      error: error || null
    });
    
    fs.writeFileSync(notificationPath, JSON.stringify(notifications, null, 2));
    
    // Se status for "completed", preparar resposta para WhatsApp
    if (status === 'completed') {
      await handleSquadCompletion(squad_id, run_id, output_summary);
    }
    
    // Se status for "failed", logar erro
    else if (status === 'failed') {
      console.error(`❌ Squad ${squad_id} falhou:`, error);
    }
    
    res.json({
      success: true,
      message: 'Webhook recebido com sucesso'
    });
    
  } catch (error) {
    console.error('Erro processando webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para consultar status de execução
router.get('/squad-status/:squadId/:runId', async (req, res) => {
  try {
    const { squadId, runId } = req.params;
    
    const statePath = path.join(
      __dirname,
      '../squads',
      squadId,
      'state.json'
    );
    
    if (!fs.existsSync(statePath)) {
      return res.status(404).json({
        error: 'Execução não encontrada'
      });
    }
    
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    
    res.json({
      squad_id: squadId,
      run_id: runId,
      status: state.status,
      step: state.step,
      agents: state.agents,
      started_at: state.startedAt,
      updated_at: state.updatedAt
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para WhatsApp receber notificação de conclusão
router.post('/notify-whatsapp', async (req, res) => {
  try {
    const {
      whatsapp_number,
      message,
      squad_id,
      run_id
    } = req.body;
    
    console.log(`📱 Notificando WhatsApp ${whatsapp_number}: ${message.substring(0, 50)}...`);
    
    // Aqui você pode integrar com API de WhatsApp (Twilio, etc.)
    // Por enquanto, apenas logamos a notificação
    
    const logPath = path.join(__dirname, '../logs/whatsapp-notifications.log');
    const logEntry = {
      timestamp: new Date().toISOString(),
      whatsapp_number,
      message,
      squad_id,
      run_id
    };
    
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Erro notificando WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
});

async function handleSquadCompletion(squadId, runId, outputSummary) {
  console.log(`✅ Squad ${squadId} completou execução ${runId}`);
  console.log('Output summary:', outputSummary);
  
  // Extrair dados relevantes do output
  const outputPath = path.join(
    __dirname,
    '../squads',
    squadId,
    'output',
    runId,
    'dashboard-data.json'
  );
  
  if (fs.existsSync(outputPath)) {
    const data = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    
    // Preparar mensagem resumida para WhatsApp
    const summaryMessage = buildSummaryMessage(data, squadId);
    
    // Salvar mensagem para envio
    const messagePath = path.join(
      __dirname,
      '../squads',
      squadId,
      'pending-messages.json'
    );
    
    let messages = [];
    if (fs.existsSync(messagePath)) {
      messages = JSON.parse(fs.readFileSync(messagePath, 'utf-8'));
    }
    
    messages.push({
      run_id: runId,
      message: summaryMessage,
      created_at: new Date().toISOString(),
      status: 'pending'
    });
    
    fs.writeFileSync(messagePath, JSON.stringify(messages, null, 2));
  }
}

function buildSummaryMessage(data, squadId) {
  if (squadId === 'shlomo-engineering') {
    const { pulmoes, saldo_livre, metadata } = data;
    
    let message = `📊 Shlomo Ledger - ${metadata?.mes || 'Mês Atual'}\n\n`;
    
    if (pulmoes['Pulmao 1']) {
      const p1 = pulmoes['Pulmao 1'];
      const pct = ((p1.gasto / p1.teto) * 100).toFixed(0);
      message += `P1: R$ ${p1.gasto.toFixed(0)} (${pct}%)\n`;
    }
    
    if (pulmoes['Pulmao 2']) {
      const p2 = pulmoes['Pulmao 2'];
      const pct = ((p2.gasto / p2.teto) * 100).toFixed(0);
      message += `P2: R$ ${p2.gasto.toFixed(0)} (${pct}%)\n`;
    }
    
    if (pulmoes['Pulmao 3']) {
      const p3 = pulmoes['Pulmao 3'];
      const pct = ((p3.gasto / p3.teto) * 100).toFixed(0);
      message += `P3: R$ ${p3.gasto.toFixed(0)} (${pct}%)\n`;
    }
    
    if (saldo_livre) {
      message += `\nSaldo: R$ ${saldo_livre.toFixed(2)} 💰`;
    }
    
    return message;
  }
  
  return `✅ Squad ${squadId} concluída com sucesso!`;
}

module.exports = router;
