const fs = require('fs');
const path = require('path');
const MultiAIRouter = require('../../orchestrator/multi-ai-router');
const { logEvent } = require('../../orchestrator/services/activity-logger');

class SquadGenerator {
  constructor() {
    this.router = new MultiAIRouter();
  }

  async generateSquad(description, autoApprove = false) {
    const startTime = Date.now();

    await logEvent({
      type: 'TASK_STARTED',
      squadId: 'shlomo-builder',
      agentId: 'architect',
      payload: { message: `Gerando squad para: ${description.substring(0, 50)}...` }
    });

    const prompt = `
Você é um gerador de squads autônomas para o sistema OpenSquad.

Crie uma squad completa para: ${description}

Retorne APENAS JSON com a seguinte estrutura, sem explicações:
{
  "id": "nome-da-squad-kebab-case",
  "name": "Nome completo da squad",
  "description": "Descrição de 1 linha",
  "agents": [{"id": "agent-id", "name": "Nome Agente", "role": "Função", "ai_model": "gemini-flash|claude-haiku|gpt-4o-mini"}],
  "pipeline": {"steps": [{"id": "step-id", "name": "Nome Passo", "agent": "agent-id"}]}
}
`;

    const response = await this.router.routePrompt(prompt, { complexity: 'medium' });
    
    try {
      const squadDef = JSON.parse(response.trim());
      const squadPath = path.join(__dirname, '..', squadDef.id);

      if (autoApprove) {
        if (!fs.existsSync(squadPath)) {
          fs.mkdirSync(squadPath, { recursive: true });
          fs.writeFileSync(path.join(squadPath, 'squad.yaml'), this.convertToYaml(squadDef));
        }
      }

      const duration = Date.now() - startTime;
      await logEvent({
        type: 'TASK_COMPLETED',
        squadId: 'shlomo-builder',
        agentId: 'architect',
        payload: { message: `Squad ${squadDef.id} gerado com sucesso`, durationMs: duration }
      });

      return {
        ...squadDef,
        generatedAt: new Date().toISOString(),
        durationMs: duration,
        readyToInstall: autoApprove
      };

    } catch (error) {
      await logEvent({
        type: 'TASK_FAILED',
        squadId: 'shlomo-builder',
        agentId: 'architect',
        payload: { message: `Falha ao gerar squad: ${error.message}` }
      });
      throw error;
    }
  }

  convertToYaml(squadDef) {
    return `id: ${squadDef.id}
name: ${squadDef.name}
description: ${squadDef.description}
status: active

agents:
${squadDef.agents.map(a => `  - id: ${a.id}
    name: ${a.name}
    role: ${a.role}
    ai_model: ${a.ai_model}`).join('\n')}

pipeline:
  steps:
${squadDef.pipeline.steps.map(s => `    - id: ${s.id}
      name: ${s.name}
      agent: ${s.agent}`).join('\n')}
`;
  }
}

module.exports = SquadGenerator;
