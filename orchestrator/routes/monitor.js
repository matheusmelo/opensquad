const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Endpoint: GET /api/monitor/executions
// Retorna status de todas as execuções ativas
router.get('/executions', (req, res) => {
  try {
    const squadsDir = path.join(__dirname, '../../squads');
    const executions = [];

    // Lista todas as squads
    const squadFolders = fs.readdirSync(squadsDir)
      .filter(folder => !folder.startsWith('.') && fs.statSync(path.join(squadsDir, folder)).isDirectory());

    squadFolders.forEach(squadId => {
      const statePath = path.join(squadsDir, squadId, 'state.json');
      
      if (!fs.existsSync(statePath)) return;

      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      
      // Só retorna se estiver rodando ou completou recentemente
      if (state.status === 'running' || state.status === 'completed') {
        // Calcula tempo decorrido
        const startedAt = new Date(state.startedAt);
        const now = new Date();
        const elapsedMs = now - startedAt;
        const hours = Math.floor(elapsedMs / 3600000);
        const minutes = Math.floor((elapsedMs % 3600000) / 60000);
        const seconds = Math.floor((elapsedMs % 60000) / 1000);
        const elapsedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        executions.push({
          squad_id: squadId,
          run_id: state.updatedAt ? state.updatedAt.replace(/[:.]/g, '-') : 'unknown',
          status: state.status,
          step: state.step || { current: 0, total: 0, label: '' },
          agents: state.agents || [],
          started_at: state.startedAt,
          elapsed_time: elapsedTime
        });
      }
    });

    res.json(executions);

  } catch (error) {
    console.error('Erro buscando execuções:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: GET /api/monitor/costs
// Retorna estatísticas de custos de IA
router.get('/costs', (req, res) => {
  try {
    const usageLogPath = path.join(__dirname, '../logs/ai-usage.json');
    
    if (!fs.existsSync(usageLogPath)) {
      return res.json({
        total_cost: 0,
        total_tasks: 0,
        models: {},
        last_30_days: { cost: 0, tasks: 0 }
      });
    }

    const usageLog = JSON.parse(fs.readFileSync(usageLogPath, 'utf-8'));
    
    const stats = {
      total_cost: 0,
      total_tasks: usageLog.length,
      models: {},
      last_30_days: { cost: 0, tasks: 0 }
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    usageLog.forEach(entry => {
      stats.total_cost += entry.cost_usd;
      
      if (!stats.models[entry.model]) {
        stats.models[entry.model] = { tasks: 0, cost: 0 };
      }
      stats.models[entry.model].tasks++;
      stats.models[entry.model].cost += entry.cost_usd;
      
      if (new Date(entry.timestamp) > thirtyDaysAgo) {
        stats.last_30_days.cost += entry.cost_usd;
        stats.last_30_days.tasks++;
      }
    });

    res.json(stats);

  } catch (error) {
    console.error('Erro buscando custos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: GET /api/monitor/squads
// Retorna lista de todas as squads disponíveis
router.get('/squads', (req, res) => {
  try {
    const squadsDir = path.join(__dirname, '../../squads');
    const squads = [];

    const squadFolders = fs.readdirSync(squadsDir)
      .filter(folder => !folder.startsWith('.') && fs.statSync(path.join(squadsDir, folder)).isDirectory());

    squadFolders.forEach(squadId => {
      const squadYamlPath = path.join(squadsDir, squadId, 'squad.yaml');
      
      if (fs.existsSync(squadYamlPath)) {
        const yamlContent = fs.readFileSync(squadYamlPath, 'utf-8');
        // Parse simples do YAML (em produção usar biblioteca)
        const nameMatch = yamlContent.match(/name:\s*"(.+?)"/);
        const descMatch = yamlContent.match(/description:\s*"(.+?)"/);
        const iconMatch = yamlContent.match(/icon:\s*(\S+)/);

        squads.push({
          id: squadId,
          name: nameMatch ? nameMatch[1] : squadId,
          description: descMatch ? descMatch[1] : '',
          icon: iconMatch ? iconMatch[1] : '🤖'
        });
      }
    });

    res.json(squads);

  } catch (error) {
    console.error('Erro buscando squads:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
