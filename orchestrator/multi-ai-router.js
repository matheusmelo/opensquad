const fs = require('fs');
const path = require('path');

// Configuração de modelos de IA
const AI_MODELS = {
  // === FREE TIER ===
  CLAUDE_HAIKU: { 
    id: 'claude-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    cost_per_1k_input: 0.00025,
    cost_per_1k_output: 0.00125,
    max_tokens: 200000,
    speed: 'fast',
    quality: 'good',
    use_for: ['boilerplate', 'simple_fix', 'docs', 'test_generation', 'translation'],
    free_tier: true
  },
  
  GEMINI_FLASH: {
    id: 'gemini-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    model: 'gemini-1.5-flash-latest',
    cost_per_1k_input: 0.000075,
    cost_per_1k_output: 0.0003,
    max_tokens: 1000000,
    speed: 'very_fast',
    quality: 'good',
    use_for: ['debug', 'translation', 'simple_refactor', 'code_explanation'],
    free_tier: true
  },
  
  GEMINI_PRO: {
    id: 'gemini-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    model: 'gemini-1.5-pro-latest',
    cost_per_1k_input: 0.00035,
    cost_per_1k_output: 0.00105,
    max_tokens: 2000000,
    speed: 'medium',
    quality: 'very_good',
    use_for: ['code_review', 'architecture_review', 'complex_analysis'],
    free_tier: true
  },
  
  // === PAID TIER ===
  CLAUDE_SONNET: {
    id: 'claude-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    cost_per_1k_input: 0.003,
    cost_per_1k_output: 0.015,
    max_tokens: 200000,
    speed: 'medium',
    quality: 'excellent',
    use_for: ['refactor', 'feature_dev', 'code_review', 'api_design'],
    free_tier: false
  },
  
  GPT4O_MINI: {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    model: 'gpt-4o-mini',
    cost_per_1k_input: 0.00015,
    cost_per_1k_output: 0.0006,
    max_tokens: 128000,
    speed: 'fast',
    quality: 'very_good',
    use_for: ['complex_logic', 'architecture', 'debug_hard', 'system_design'],
    free_tier: false
  },
  
  GPT4O: {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    model: 'gpt-4o',
    cost_per_1k_input: 0.0025,
    cost_per_1k_output: 0.01,
    max_tokens: 128000,
    speed: 'medium',
    quality: 'best',
    use_for: ['critical_architecture', 'security_review', 'performance_optimization'],
    free_tier: false
  }
};

// Palavras-chave para classificação
const COMPLEXITY_INDICATORS = {
  high: [
    'architecture', 'schema', 'security', 'performance', 'microservices',
    'scalability', 'optimization', 'refactor large', 'system design',
    'critical', 'production bug', 'memory leak', 'race condition'
  ],
  medium: [
    'implement feature', 'endpoint', 'component', 'database', 'API',
    'integration', 'webhook', 'authentication', 'middleware'
  ],
  low: [
    'fix typo', 'style', 'formatting', 'docs', 'readme', 'comment',
    'simple', 'rename', 'add test', 'translate', 'boilerplate'
  ]
};

/**
 * Analisa complexidade da tarefa (1-10)
 */
function analyzeComplexity(taskDescription) {
  const text = taskDescription.toLowerCase();
  let score = 5; // Base
  
  // Ajusta por palavras-chave
  COMPLEXITY_INDICATORS.high.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });
  
  COMPLEXITY_INDICATORS.medium.forEach(keyword => {
    if (text.includes(keyword)) score += 0.5;
  });
  
  COMPLEXITY_INDICATORS.low.forEach(keyword => {
    if (text.includes(keyword)) score -= 2;
  });
  
  // Normaliza 1-10
  return Math.max(1, Math.min(10, score));
}

/**
 * Determina tipo de tarefa
 */
function classifyTaskType(taskDescription) {
  const text = taskDescription.toLowerCase();
  
  if (/fix|bug|error|issue/.test(text)) return 'debug';
  if (/implement|create|build|develop/.test(text)) return 'feature_dev';
  if (/refactor|optimize|improve/.test(text)) return 'refactor';
  if (/test|spec|vitest|jest/.test(text)) return 'test_generation';
  if (/docs|readme|comment|document/.test(text)) return 'documentation';
  if (/translate|traduz/.test(text)) return 'translation';
  if (/review|analyze|audit/.test(text)) return 'code_review';
  if (/architect|design|schema/.test(text)) return 'architecture';
  
  return 'general';
}

/**
 * Roteia tarefa para IA ótima
 */
function routeTask(taskDescription, options = {}) {
  const complexity = options.forced_complexity || analyzeComplexity(taskDescription);
  const taskType = classifyTaskType(taskDescription);
  const preferFree = options.prefer_free !== false; // default true
  
  console.log(`🧠 Análise de Tarefa:`);
  console.log(`   Complexidade: ${complexity}/10`);
  console.log(`   Tipo: ${taskType}`);
  console.log(`   Preferência: ${preferFree ? 'FREE' : 'BEST'}`);
  
  // Se forçada manualmente
  if (options.model) {
    const model = Object.values(AI_MODELS).find(m => m.id === options.model);
    if (model) {
      console.log(`   Modelo forçado: ${model.name}`);
      return model;
    }
  }
  
  // Lógica de roteamento
  let candidates = Object.values(AI_MODELS);
  
  // Filtra por preferência de custo
  if (preferFree && complexity <= 6) {
    candidates = candidates.filter(m => m.free_tier);
  }
  
  // Filtra por tipo de tarefa
  candidates = candidates.filter(m => m.use_for.includes(taskType));
  
  // Se nenhum candidato específico, usa complexidade
  if (candidates.length === 0) {
    if (complexity <= 4) {
      candidates = [AI_MODELS.CLAUDE_HAIKU, AI_MODELS.GEMINI_FLASH];
    } else if (complexity <= 7) {
      candidates = [AI_MODELS.CLAUDE_SONNET, AI_MODELS.GPT4O_MINI];
    } else {
      candidates = [AI_MODELS.GPT4O];
    }
  }
  
  // Ordena por custo (mais barato primeiro)
  candidates.sort((a, b) => a.cost_per_1k_input - b.cost_per_1k_input);
  
  const selected = candidates[0];
  console.log(`   ✅ Modelo selecionado: ${selected.name}`);
  console.log(`   💰 Custo estimado: $${selected.cost_per_1k_input.toFixed(6)}/1k tokens\n`);
  
  return selected;
}

/**
 * Calcula custo estimado
 */
function estimateCost(model, input_tokens, output_tokens = null) {
  const input_cost = (input_tokens / 1000) * model.cost_per_1k_input;
  const output_cost = output_tokens 
    ? (output_tokens / 1000) * model.cost_per_1k_output
    : input_cost * 2; // estimativa padrão
  
  return {
    input: input_cost,
    output: output_cost,
    total: input_cost + output_cost
  };
}

/**
 * Registra uso para tracking de custos
 */
function logUsage(task, model, tokens_used, cost) {
  const logPath = path.join(__dirname, '../logs/ai-usage.json');
  
  let usage_log = [];
  if (fs.existsSync(logPath)) {
    usage_log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  }
  
  usage_log.push({
    timestamp: new Date().toISOString(),
    task,
    model: model.id,
    tokens: tokens_used,
    cost_usd: cost
  });
  
  // Mantém apenas últimos 1000 registros
  if (usage_log.length > 1000) {
    usage_log = usage_log.slice(-1000);
  }
  
  fs.writeFileSync(logPath, JSON.stringify(usage_log, null, 2));
}

/**
 * Retorna estatísticas de uso
 */
function getUsageStats() {
  const logPath = path.join(__dirname, '../logs/ai-usage.json');
  
  if (!fs.existsSync(logPath)) {
    return { total_cost: 0, total_tasks: 0, models: {} };
  }
  
  const usage_log = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  
  const stats = {
    total_cost: 0,
    total_tasks: usage_log.length,
    models: {},
    last_30_days: { cost: 0, tasks: 0 }
  };
  
  const thirty_days_ago = new Date();
  thirty_days_ago.setDate(thirty_days_ago.getDate() - 30);
  
  usage_log.forEach(entry => {
    stats.total_cost += entry.cost_usd;
    
    if (!stats.models[entry.model]) {
      stats.models[entry.model] = { tasks: 0, cost: 0 };
    }
    stats.models[entry.model].tasks++;
    stats.models[entry.model].cost += entry.cost_usd;
    
    if (new Date(entry.timestamp) > thirty_days_ago) {
      stats.last_30_days.cost += entry.cost_usd;
      stats.last_30_days.tasks++;
    }
  });
  
  return stats;
}

module.exports = {
  routeTask,
  analyzeComplexity,
  classifyTaskType,
  estimateCost,
  logUsage,
  getUsageStats,
  AI_MODELS
};
