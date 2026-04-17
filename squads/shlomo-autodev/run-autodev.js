#!/usr/bin/env node

/**
 * Auto-Dev Loop Executor
 * 
 * Este script mantém os agentes autônomos rodando 24/7,
 * desenvolvendo features do Shlomo Ledger automaticamente.
 * 
 * Uso: node squads/shlomo-autodev/run-autodev.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuração
const SQUAD_NAME = 'shlomo-autodev';
const MAX_ITERATIONS = Infinity; // Roda para sempre (ou até Ctrl+C)
const DELAY_BETWEEN_RUNS = 5000; // 5 segundos entre execuções
const LOG_FILE = path.join(__dirname, 'autodev.log');

let iteration = 0;
let isRunning = false;

console.log('🤖 Iniciando Auto-Dev Loop...');
console.log('📋 Squad:', SQUAD_NAME);
console.log('♾️  Iterações: INFINITO (Ctrl+C para parar)\n');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Parando Auto-Dev Loop...');
  console.log(`✅ Total de iterações executadas: ${iteration}`);
  process.exit(0);
});

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  console.log(message);
  fs.appendFileSync(LOG_FILE, logMessage);
}

async function executeAutoDevCycle() {
  if (isRunning) {
    log('⚠️  Ciclo anterior ainda em execução, pulando...');
    return;
  }
  
  isRunning = true;
  iteration++;
  
  try {
    log(`\n🔄 === CICLO #${iteration} ===`);
    
    // Passo 1: Verificar roadmap atual
    log('📊 Passo 1: Analisando roadmap...');
    checkRoadmapStatus();
    
    // Passo 2: Executar squad
    log('🚀 Passo 2: Executando squad de desenvolvimento...');
    executeSquad();
    
    // Passo 3: Validar resultado
    log('✅ Passo 3: Validando implementação...');
    const success = validateImplementation();
    
    if (success) {
      log('✨ Feature implementada com sucesso!');
      
      // Passo 4: Commit e push automático
      log('📦 Passo 4: Commit e push automático...');
      commitAndPush();
      
    } else {
      log('❌ Falha na implementação - tentando novamente no próximo ciclo');
    }
    
    log(`🏁 === FIM DO CICLO #${iteration} ===\n`);
    
  } catch (error) {
    log(`❌ Erro no ciclo: ${error.message}`);
    console.error(error);
  } finally {
    isRunning = false;
  }
}

function checkRoadmapStatus() {
  // Lê arquivo de roadmap se existir
  const roadmapPath = path.join(__dirname, 'ROADMAP.md');
  
  if (fs.existsSync(roadmapPath)) {
    const roadmap = fs.readFileSync(roadmapPath, 'utf-8');
    log('📋 Roadmap encontrado');
    log(roadmap.substring(0, 200) + '...');
  } else {
    log('⚠️  ROADMAP.md não encontrado - usando roadmap padrão do projeto');
  }
}

function executeSquad() {
  try {
    // Executa squad via Kilo CLI
    const command = `kilo run squad ${SQUAD_NAME} --auto-approve`;
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '../../'),
      timeout: 600000 // 10 minutos timeout
    });
    
    log('✅ Squad executada com sucesso');
    
  } catch (error) {
    log(`❌ Erro executando squad: ${error.message}`);
    throw error;
  }
}

function validateImplementation() {
  // Verifica se código compila
  try {
    log('🔍 Validando TypeScript...');
    execSync('cd shlomo-ledger && npx tsc --noEmit', {
      stdio: 'pipe',
      cwd: path.join(__dirname, '../../')
    });
    log('✅ TypeScript OK');
    
    log('🔍 Validando lint...');
    execSync('npm run lint', {
      stdio: 'pipe',
      cwd: path.join(__dirname, '../../')
    });
    log('✅ Lint OK');
    
    log('🔍 Rodando testes...');
    execSync('npm test', {
      stdio: 'pipe',
      cwd: path.join(__dirname, '../../')
    });
    log('✅ Testes OK');
    
    return true;
    
  } catch (error) {
    log(`❌ Validação falhou: ${error.message}`);
    return false;
  }
}

function commitAndPush() {
  try {
    const timestamp = new Date().toISOString();
    const commitMessage = `feat: auto-dev cycle #${iteration} - ${timestamp}`;
    
    execSync('git add .', { stdio: 'pipe' });
    execSync(`git commit -m "${commitMessage}"`, { stdio: 'pipe' });
    execSync('git push origin main', { stdio: 'inherit' });
    
    log('✅ Código commitado e push realizado');
    
  } catch (error) {
    log(`⚠️  Erro no commit/push: ${error.message}`);
    // Não lança erro - continua próximo ciclo
  }
}

// Main loop
async function main() {
  while (iteration < MAX_ITERATIONS) {
    await executeAutoDevCycle();
    await sleep(DELAY_BETWEEN_RUNS);
  }
}

// Inicia
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
