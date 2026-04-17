const express = require('express');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Configuração
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const API_KEY = process.env.API_KEY || 'dev-key-change-in-production';
const OPENSQUAD_BASE_PATH = process.env.OPENSQUAD_BASE_PATH || 'C:/inetpub/opensquad';
const MAX_CONCURRENT_SQUADS = parseInt(process.env.MAX_CONCURRENT_SQUADS) || 3;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const app = express();
app.use(express.json());

// Importar rotas de webhooks
const webhookRoutes = require('./routes/webhooks');
app.use('/webhook', webhookRoutes);

// Middleware de autenticação API key
function authenticateAPI(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized - Invalid or missing API key' });
  }
  
  next();
}

// Aplicar autenticação em todas as rotas exceto healthcheck
app.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  
  // Para produção, descomentar:
  // return authenticateAPI(req, res, next);
  
  next();
});

// Carregar registro de squads
const squadRegistryPath = path.join(__dirname, 'squad-registry.json');
const squadRegistry = JSON.parse(fs.readFileSync(squadRegistryPath, 'utf-8'));

// Queue de execuções
let activeSquads = 0;
const executionQueue = [];

// Endpoint para receber comandos do WhatsApp MCP
app.post('/execute', async (req, res) => {
  try {
    const { intent, from, user_message, file_path } = req.body;
    
    console.log(`📨 Comando recebido de ${from}: ${user_message.substring(0, 50)}...`);
    
    // Identificar squad alvo
    const targetSquad = identifySquad(intent, user_message);
    
    if (!targetSquad) {
      return res.status(400).json({
        error: 'Não foi possível identificar qual squad usar',
        suggestion: 'Tente ser mais específico sobre o que você precisa'
      });
    }
    
    // Verificar se pode executar agora ou precisa enfileirar
    if (activeSquads >= MAX_CONCURRENT_SQUADS) {
      executionQueue.push({
        intent,
        from,
        user_message,
        file_path,
        targetSquad,
        queuedAt: Date.now()
      });
      
      return res.json({
        status: 'queued',
        position: executionQueue.length,
        message: `Comando na fila. Posição: ${executionQueue.length}`
      });
    }
    
    // Executar squad
    activeSquads++;
    const result = await executeSquad(targetSquad, intent, user_message, file_path);
    activeSquads--;
    
    // Processar próximo da fila se existir
    if (executionQueue.length > 0) {
      processQueue();
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Erro no orchestrator:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para consultar dados de uma squad
app.get('/query/:squadName', async (req, res) => {
  try {
    const { squadName } = req.params;
    const { query } = req.query;
    
    const result = await querySquadData(squadName, query);
    res.json(result);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de health check (público)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    activeSquads,
    queuedCommands: executionQueue.length,
    maxConcurrent: MAX_CONCURRENT_SQUADS,
    version: '1.0.0'
  });
});

// Endpoint para listar squads disponíveis
app.get('/squads', (req, res) => {
  res.json(squadRegistry);
});

// Endpoint para consultar dados financeiros
app.get('/api/finance/summary', async (req, res) => {
  try {
    const squadPath = path.join(OPENSQUAD_BASE_PATH, 'squads/shlomo-engineering');
    const runId = getLatestRunId(squadPath);
    
    if (!runId) {
      return res.status(404).json({ error: 'Nenhum dado encontrado' });
    }
    
    const dataPath = path.join(squadPath, 'output', runId, 'dashboard-data.json');
    
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ error: 'Dados não disponíveis' });
    }
    
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    res.json(data);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function identifySquad(intent, userMessage) {
  const messageLower = userMessage.toLowerCase();
  
  // Procurar por keywords nos triggers das squads
  for (const [squadId, squad] of Object.entries(squadRegistry.squads)) {
    for (const trigger of squad.triggers) {
      if (messageLower.includes(trigger.toLowerCase())) {
        return squadId;
      }
    }
  }
  
  // Se não encontrou por keyword, usar GPT para classificar
  return fallbackIntentClassification(userMessage);
}

function fallbackIntentClassification(message) {
  // Usar similaridade simples baseada em palavras-chave gerais
  const financeKeywords = ['fatura', 'gasto', 'uber', 'nubank', 'pulmao', 'financeiro', 'saldo'];
  const managementKeywords = ['agenda', 'rotina', 'tempo', 'organizar', 'reunião'];
  
  const words = message.toLowerCase().split(/\s+/);
  
  let financeScore = words.filter(w => financeKeywords.includes(w)).length;
  let managementScore = words.filter(w => managementKeywords.includes(w)).length;
  
  if (financeScore > managementScore) return 'shlomo-engineering';
  if (managementScore > financeScore) return 'gestao-pessoal';
  
  // Default para squad mais usada
  return 'shlomo-engineering';
}

async function executeSquad(squadId, intent, userMessage, filePath) {
  const squad = squadRegistry.squads[squadId];
  const squadPath = path.join(OPENSQUAD_BASE_PATH, 'squads', squadId);
  
  console.log(`🚀 Executando squad: ${squadId}`);
  
  // Preparar input para squad
  const inputPath = prepareSquadInput(squad, intent, userMessage, filePath);
  
  // Criar arquivo de comando para squad
  const commandFile = path.join(squadPath, 'orchestrator-command.json');
  fs.writeFileSync(commandFile, JSON.stringify({
    intent,
    user_message: userMessage,
    input_file: inputPath,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  // Aguardar squad completar (polling state.json)
  const result = await pollSquadCompletion(squadId, squadPath);
  
  // Construir resposta natural
  const response = buildNaturalResponse(result, squadId);
  
  return {
    status: 'completed',
    squad: squadId,
    response,
    raw_output: result
  };
}

function prepareSquadInput(squad, intent, userMessage, filePath) {
  const squadPath = path.join(OPENSQUAD_BASE_PATH, 'squads', squad.name.replace(/\s+/g, '-').toLowerCase());
  const inputDir = path.join(squadPath, 'input');
  
  if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir, { recursive: true });
  }
  
  // Se tem arquivo, mover para input
  if (filePath) {
    const destPath = path.join(inputDir, path.basename(filePath));
    fs.copyFileSync(filePath, destPath);
    return destPath;
  }
  
  // Senão, criar arquivo de texto com mensagem
  const textFile = path.join(inputDir, `prompt-${Date.now()}.txt`);
  fs.writeFileSync(textFile, userMessage);
  return textFile;
}

async function pollSquadCompletion(squadId, squadPath, timeout = 600000) {
  const startTime = Date.now();
  const statePath = path.join(squadPath, 'state.json');
  
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      // Timeout
      if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        
        // Enviar webhook de timeout
        sendWebhookCallback(squadId, 'timeout', null, 'Timeout após 10 minutos');
        
        reject(new Error('Timeout: Squad demorou mais de 10 minutos'));
        return;
      }
      
      // Verificar state.json
      if (!fs.existsSync(statePath)) {
        return; // Squad ainda não começou
      }
      
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      
      if (state.status === 'completed') {
        clearInterval(interval);
        
        // Ler output final
        const runId = getLatestRunId(squadPath);
        const outputPath = path.join(squadPath, 'output', runId, 'dashboard-data.json');
        
        if (fs.existsSync(outputPath)) {
          const output = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
          
          // Enviar webhook de sucesso
          sendWebhookCallback(squadId, 'completed', runId, null, output);
          
          resolve(output);
        } else {
          sendWebhookCallback(squadId, 'completed_no_output', runId, 'Output file not found');
          resolve({ message: 'Squad completou mas output não encontrado' });
        }
      }
      
      else if (state.status === 'failed') {
        clearInterval(interval);
        
        // Enviar webhook de falha
        sendWebhookCallback(squadId, 'failed', null, state.error || 'Erro desconhecido');
        
        reject(new Error(`Squad falhou: ${state.error || 'Erro desconhecido'}`));
      }
      
    }, 2000); // Poll a cada 2 segundos
  });
}

function sendWebhookCallback(squadId, status, runId, error, outputSummary) {
  const http = require('http');
  
  const payload = {
    squad_id: squadId,
    run_id: runId,
    status,
    completed_at: new Date().toISOString(),
    error,
    output_summary: outputSummary ? {
      total_transacoes: outputSummary.metadata?.total_transacoes,
      saldo_livre: outputSummary.saldo_livre,
      pulmoes_status: outputSummary.alertas?.length > 0 ? 'ALERTA' : 'OK'
    } : null
  };
  
  const data = JSON.stringify(payload);
  
  const options = {
    hostname: 'localhost',
    port: process.env.ORCHESTRATOR_PORT || 3001,
    path: '/webhook/squad-complete',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };
  
  const req = http.request(options, (res) => {
    console.log(`✅ Webhook enviado para ${squadId}: ${status}`);
  });
  
  req.on('error', (error) => {
    console.error('Erro enviando webhook:', error.message);
  });
  
  req.write(data);
  req.end();
}

function getLatestRunId(squadPath) {
  const outputDir = path.join(squadPath, 'output');
  const runs = fs.readdirSync(outputDir)
    .filter(name => /^\d{4}-\d{2}-\d{2}-\d{6}$/.test(name))
    .sort()
    .reverse();
  
  return runs[0] || null;
}

function buildNaturalResponse(result, squadId) {
  if (squadId === 'shlomo-engineering') {
    return buildFinanceResponse(result);
  }
  
  if (squadId === 'gestao-pessoal') {
    return buildManagementResponse(result);
  }
  
  return JSON.stringify(result, null, 2);
}

function buildFinanceResponse(data) {
  if (!data.pulmoes && !data.metadata) {
    return data.message || 'Processamento concluído.';
  }
  
  const { pulmoes, saldo_livre, metadata } = data;
  const mes = metadata?.mes || 'este mês';
  
  let response = `📊 Resumo Financeiro - ${mes}\n\n`;
  
  if (pulmoes.Pulmao_1 || pulmoes['Pulmao 1']) {
    const p1 = pulmoes.Pulmao_1 || pulmoes['Pulmao 1'];
    const pct = ((p1.gasto / p1.teto) * 100).toFixed(0);
    const emoji = p1.status === 'OK' ? '✅' : p1.status === 'ALERTA' ? '⚠️' : '🔴';
    response += `Pulmão 1 (Essenciais): R$ ${p1.gasto.toLocaleString('pt-BR')} / R$ ${p1.teto.toLocaleString('pt-BR')} (${pct}%) ${emoji}\n`;
  }
  
  if (pulmoes.Pulmao_2 || pulmoes['Pulmao 2']) {
    const p2 = pulmoes.Pulmao_2 || pulmoes['Pulmao 2'];
    const pct = ((p2.gasto / p2.teto) * 100).toFixed(0);
    const emoji = p2.status === 'OK' ? '✅' : p2.status === 'ALERTA' ? '⚠️' : '🔴';
    response += `Pulmão 2 (Eventuais): R$ ${p2.gasto.toLocaleString('pt-BR')} / R$ ${p2.teto.toLocaleString('pt-BR')} (${pct}%) ${emoji}\n`;
  }
  
  if (pulmoes.Pulmao_3 || pulmoes['Pulmao 3']) {
    const p3 = pulmoes.Pulmao_3 || pulmoes['Pulmao 3'];
    const pct = ((p3.gasto / p3.teto) * 100).toFixed(0);
    const emoji = p3.status === 'OK' ? '✅' : p3.status === 'ALERTA' ? '⚠️' : '🔴';
    response += `Pulmão 3 (Lazer): R$ ${p3.gasto.toLocaleString('pt-BR')} / R$ ${p3.teto.toLocaleString('pt-BR')} (${pct}%) ${emoji}\n`;
  }
  
  if (saldo_livre !== undefined) {
    response += `\nSaldo Livre: R$ ${saldo_livre.toLocaleString('pt-BR')} 💰`;
  }
  
  // Adicionar alertas se houver
  if (data.alertas && data.alertas.length > 0) {
    response += `\n\n⚠️ Alertas:\n${data.alertas.map(a => `- ${a}`).join('\n')}`;
  }
  
  return response;
}

function buildManagementResponse(data) {
  return '✅ Gestão Pessoal: Tarefa concluída. Verifique o dashboard para detalhes.';
}

async function querySquadData(squadName, query) {
  const squadPath = path.join(OPENSQUAD_BASE_PATH, 'squads', squadName);
  const runId = getLatestRunId(squadPath);
  
  if (!runId) {
    return { error: 'Nenhum dado encontrado para esta squad' };
  }
  
  const dataPath = path.join(squadPath, 'output', runId, 'dashboard-data.json');
  
  if (!fs.existsSync(dataPath)) {
    return { error: 'Dados não disponíveis' };
  }
  
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  // Usar GPT para extrair informação específica da query
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Você é um assistente de consulta financeira. Extraia a informação solicitada dos dados fornecidos e responda de forma concisa.'
      },
      {
        role: 'user',
        content: `Dados: ${JSON.stringify(data, null, 2)}\n\nConsulta: ${query}`
      }
    ]
  });
  
  return {
    answer: completion.choices[0].message.content,
    data_source: `${runId}/dashboard-data.json`
  };
}

async function processQueue() {
  if (executionQueue.length === 0 || activeSquads >= MAX_CONCURRENT_SQUADS) {
    return;
  }
  
  const next = executionQueue.shift();
  activeSquads++;
  
  try {
    await executeSquad(next.targetSquad, next.intent, next.user_message, next.file_path);
  } catch (error) {
    console.error('Erro executando squad da fila:', error);
  } finally {
    activeSquads--;
    processQueue(); // Processar próximo
  }
}

// Iniciar servidor
const PORT = process.env.ORCHESTRATOR_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🎯 Orchestrator rodando na porta ${PORT}`);
  console.log(`📂 Base path: ${OPENSQUAD_BASE_PATH}`);
  console.log(`⚡ Máximo de squads concorrentes: ${MAX_CONCURRENT_SQUADS}`);
});

module.exports = app;
