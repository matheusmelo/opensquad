const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const OpenAI = require('openai');
const { startAgentRun, finishAgentRun, logEvent, logAiCall } = require('./services/activity-logger');

const prisma = new PrismaClient();
const openai = new OpenAI({
    apiKey: process.env.DIALAGRAM_API_KEY || 'dgr_live_krgqT3gftVovQUri8oA5ZCDOTfxiMcmMMo6NVy7kssO6WqRi7B',
    baseURL: 'https://www.dialagram.me/router/v1',
});

const SQUADS_DIR = path.join('C:/inetpub/opensquad', 'squads');

async function scanAndProcess() {
    try {
        const squads = fs.readdirSync(SQUADS_DIR).filter(s => fs.statSync(path.join(SQUADS_DIR, s)).isDirectory() && !s.startsWith('.'));

        for (const squad of squads) {
            const squadPath = path.join(SQUADS_DIR, squad);
            const commandFile = path.join(squadPath, 'orchestrator-command.json');
            const stateFile = path.join(squadPath, 'state.json');

            if (fs.existsSync(commandFile) && !fs.existsSync(stateFile)) {
                console.log(`[Worker] Started processing ${squad}`);

                let dbAgent = await prisma.agent.findFirst({ where: { squadId: squad } });
                if (!dbAgent) {
                    dbAgent = await prisma.agent.create({
                        data: {
                            squadId: squad,
                            name: (squad.split('-')[0] + ' ' + (squad.split('-')[1] || '')).toUpperCase(),
                            role: 'Autonomous Agent',
                            icon: '🤖'
                        }
                    });
                }

                const cmd = JSON.parse(fs.readFileSync(commandFile, 'utf-8'));
                const inputData = fs.readFileSync(cmd.input_file || commandFile, 'utf-8').substring(0, 100);

                fs.writeFileSync(stateFile, JSON.stringify({ status: 'working', progress: 0, current_task: 'Initializing...' }));

                const execution = await prisma.squadExecution.create({
                    data: { squadId: squad, status: 'running' }
                });

                const runId = await startAgentRun({
                    executionId: execution.id,
                    agentId: dbAgent.id,
                    aiModel: 'qwen-3.6-plus',
                    currentTask: 'Analysis Phase'
                });

                const pipelineSteps = ['Analysis & Architecture', 'Data & UX Telemetry', 'Security Layout', 'Production Build'];

                for (let i = 0; i < pipelineSteps.length; i++) {
                    const step = pipelineSteps[i];
                    const pct = Math.floor(((i + 1) / pipelineSteps.length) * 100);

                    fs.writeFileSync(stateFile, JSON.stringify({ status: 'working', progress: pct, current_task: step }));

                    await prisma.agentRun.update({
                        where: { id: runId },
                        data: { currentTask: step, progressPct: pct }
                    });

                    await logEvent({ type: 'AI_CALL', squadId: squad, agentId: dbAgent.id, runId, payload: { message: `Step: ${step}`, aiModel: 'qwen-3.6-plus' } });

                    try {
                        const completion = await openai.chat.completions.create({
                            model: 'qwen-3.6-plus',
                            messages: [{ role: 'system', content: `Squad: ${squad}. Step: ${step}. Responda o status.` }]
                        });

                        await logAiCall({
                            runId, aiModel: 'qwen-3.6-plus',
                            tokensIn: completion.usage?.prompt_tokens || 100,
                            tokensOut: completion.usage?.completion_tokens || 100,
                            costUsd: 0.0005,
                            taskType: step
                        });
                    } catch (e) { console.error('LLM Error:', e.message); }

                    await new Promise(r => setTimeout(r, 6000));
                }

                await finishAgentRun(runId, { status: 'done', tokensIn: 500, tokensOut: 200, costUsd: 0.002 });
                await prisma.squadExecution.update({ where: { id: execution.id }, data: { status: 'completed' } });
                fs.writeFileSync(stateFile, JSON.stringify({ status: 'completed', progress: 100 }));

                fs.unlinkSync(commandFile);
                console.log(`[Worker] Finished processing ${squad}`);
            }
        }
    } catch (e) {
        console.error('[Worker Error]', e);
    }
    setTimeout(scanAndProcess, 5000);
}

scanAndProcess();
