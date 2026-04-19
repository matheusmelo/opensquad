const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding activity tracking data...');

  // Create Agents
  const agents = [
    {
      id: 'pdf-parser-engineer',
      squadId: 'shlomo-engineering',
      name: 'PDF Parser Engineer',
      role: 'Parse and extract data from PDF financial statements',
      icon: '📄',
    },
    {
      id: 'classification-engine',
      squadId: 'shlomo-engineering',
      name: 'Classification Engine',
      role: 'Classify transactions by financial lungs and categories',
      icon: '🏷️',
    },
    {
      id: 'dashboard-builder',
      squadId: 'shlomo-engineering',
      name: 'Dashboard Builder',
      role: 'Build and update financial dashboards',
      icon: '📊',
    },
    {
      id: 'qa-validator',
      squadId: 'shlomo-engineering',
      name: 'QA Validator',
      role: 'Validate quality and accuracy of processing',
      icon: '✅',
    },
  ];

  for (const agent of agents) {
    await prisma.agent.upsert({
      where: { id: agent.id },
      update: agent,
      create: agent,
    });
  }

  console.log('✅ Created agents');

  // Create Sample Squad Executions
  const executions = [
    {
      id: 'exec-001',
      squadId: 'shlomo-engineering',
      status: 'completed',
      taskType: 'fatura_processing',
      taskPayload: JSON.stringify({
        file: 'fatura-nubank-marco.pdf',
        userId: 'user-001'
      }),
      startedAt: new Date('2026-04-17T02:00:00Z'),
      completedAt: new Date('2026-04-17T02:05:30Z'),
      durationMs: 330000,
    },
    {
      id: 'exec-002',
      squadId: 'shlomo-engineering',
      status: 'running',
      taskType: 'dashboard_update',
      taskPayload: JSON.stringify({
        month: '2026-04',
        userId: 'user-001'
      }),
      startedAt: new Date('2026-04-17T03:00:00Z'),
    },
  ];

  for (const execution of executions) {
    await prisma.squadExecution.upsert({
      where: { id: execution.id },
      update: execution,
      create: execution,
    });
  }

  console.log('✅ Created squad executions');

  // Create Agent Runs
  const runs = [
    {
      id: 'run-001',
      executionId: 'exec-001',
      agentId: 'pdf-parser-engineer',
      aiModel: 'gpt-4o-mini',
      currentTask: 'Parsing Nubank PDF statement',
      status: 'done',
      startedAt: new Date('2026-04-17T02:00:05Z'),
      completedAt: new Date('2026-04-17T02:01:30Z'),
      durationMs: 85000,
      tokensIn: 1200,
      tokensOut: 800,
      costUsd: 0.0032,
    },
    {
      id: 'run-002',
      executionId: 'exec-001',
      agentId: 'classification-engine',
      aiModel: 'claude-haiku',
      currentTask: 'Classifying 45 transactions',
      status: 'done',
      startedAt: new Date('2026-04-17T02:01:35Z'),
      completedAt: new Date('2026-04-17T02:03:15Z'),
      durationMs: 100000,
      tokensIn: 2500,
      tokensOut: 1200,
      costUsd: 0.0008,
    },
    {
      id: 'run-003',
      executionId: 'exec-001',
      agentId: 'dashboard-builder',
      aiModel: 'gemini-flash',
      currentTask: 'Updating dashboard with new data',
      status: 'done',
      startedAt: new Date('2026-04-17T02:03:20Z'),
      completedAt: new Date('2026-04-17T02:05:25Z'),
      durationMs: 125000,
      tokensIn: 1800,
      tokensOut: 950,
      costUsd: 0.0003,
    },
    {
      id: 'run-004',
      executionId: 'exec-002',
      agentId: 'dashboard-builder',
      aiModel: 'gemini-flash',
      currentTask: 'Building monthly overview chart',
      status: 'working',
      startedAt: new Date('2026-04-17T03:00:10Z'),
      tokensIn: 900,
      tokensOut: 450,
      costUsd: 0.00015,
    },
  ];

  for (const run of runs) {
    await prisma.agentRun.upsert({
      where: { id: run.id },
      update: run,
      create: run,
    });
  }

  console.log('✅ Created agent runs');

  // Create Activity Events
  const events = [
    {
      squadId: 'shlomo-engineering',
      agentId: 'pdf-parser-engineer',
      runId: 'run-001',
      executionId: 'exec-001',
      type: 'TASK_STARTED',
      payloadJson: JSON.stringify({
        message: 'Started parsing PDF file: fatura-nubank-marco.pdf'
      }),
    },
    {
      squadId: 'shlomo-engineering',
      agentId: 'pdf-parser-engineer',
      runId: 'run-001',
      executionId: 'exec-001',
      type: 'FILE_READ',
      filePath: 'squads/shlomo-engineering/input/fatura-nubank-marco.pdf',
      payloadJson: JSON.stringify({
        message: 'Reading PDF file (2.3MB)',
        toolName: 'pdf-parse'
      }),
    },
    {
      squadId: 'shlomo-engineering',
      agentId: 'pdf-parser-engineer',
      runId: 'run-001',
      executionId: 'exec-001',
      type: 'AI_CALL',
      aiModel: 'gpt-4o-mini',
      tokensIn: 1200,
      tokensOut: 800,
      costUsd: 0.0032,
      payloadJson: JSON.stringify({
        message: 'Extracting transaction data from PDF text',
        taskType: 'data_extraction'
      }),
    },
    {
      squadId: 'shlomo-engineering',
      agentId: 'pdf-parser-engineer',
      runId: 'run-001',
      executionId: 'exec-001',
      type: 'TASK_COMPLETED',
      payloadJson: JSON.stringify({
        message: 'Successfully parsed 45 transactions from PDF',
        result: { transactions_count: 45, total_value: 5800.00 }
      }),
    },
    {
      squadId: 'shlomo-engineering',
      agentId: 'classification-engine',
      runId: 'run-002',
      executionId: 'exec-001',
      type: 'TASK_STARTED',
      payloadJson: JSON.stringify({
        message: 'Starting transaction classification'
      }),
    },
    {
      squadId: 'shlomo-engineering',
      agentId: 'classification-engine',
      runId: 'run-002',
      executionId: 'exec-001',
      type: 'TOOL_CALL',
      toolName: 'regex_matcher',
      payloadJson: JSON.stringify({
        message: 'Applying classification rules to transactions'
      }),
    },
    {
      squadId: 'shlomo-engineering',
      agentId: 'classification-engine',
      runId: 'run-002',
      executionId: 'exec-001',
      type: 'AI_CALL',
      aiModel: 'claude-haiku',
      tokensIn: 2500,
      tokensOut: 1200,
      costUsd: 0.0008,
      payloadJson: JSON.stringify({
        message: 'AI-assisted classification for ambiguous transactions',
        taskType: 'classification'
      }),
    },
    {
      squadId: 'shlomo-engineering',
      agentId: 'dashboard-builder',
      runId: 'run-003',
      executionId: 'exec-001',
      type: 'FILE_WRITE',
      filePath: 'squads/shlomo-engineering/output/dashboard-data.json',
      payloadJson: JSON.stringify({
        message: 'Writing classified transaction data to dashboard file',
        linesAdded: 120
      }),
    },
    {
      squadId: 'shlomo-engineering',
      agentId: 'dashboard-builder',
      runId: 'run-004',
      executionId: 'exec-002',
      type: 'TASK_STARTED',
      payloadJson: JSON.stringify({
        message: 'Building monthly overview visualization'
      }),
    },
    {
      squadId: 'shlomo-engineering',
      agentId: 'dashboard-builder',
      runId: 'run-004',
      executionId: 'exec-002',
      type: 'AI_CALL',
      aiModel: 'gemini-flash',
      tokensIn: 900,
      tokensOut: 450,
      costUsd: 0.00015,
      payloadJson: JSON.stringify({
        message: 'Generating chart configuration for monthly overview',
        taskType: 'visualization'
      }),
    },
  ];

  for (const event of events) {
    await prisma.activityEvent.create({
      data: event,
    });
  }

  console.log('✅ Created activity events');

  // Create File Touches
  const fileTouches = [
    {
      runId: 'run-001',
      agentId: 'pdf-parser-engineer',
      filePath: 'squads/shlomo-engineering/input/fatura-nubank-marco.pdf',
      action: 'read',
      linesAdded: null,
      linesRemoved: null,
      diffPreview: 'PDF file read successfully',
    },
    {
      runId: 'run-001',
      agentId: 'pdf-parser-engineer',
      filePath: 'squads/shlomo-engineering/output/transactions-raw.json',
      action: 'write',
      linesAdded: 45,
      linesRemoved: null,
      diffPreview: '+45 transaction objects written',
    },
    {
      runId: 'run-003',
      agentId: 'dashboard-builder',
      filePath: 'squads/shlomo-engineering/output/dashboard-data.json',
      action: 'write',
      linesAdded: 120,
      linesRemoved: 45,
      diffPreview: 'Updated dashboard data with classified transactions',
    },
  ];

  for (const touch of fileTouches) {
    await prisma.fileTouch.create({
      data: touch,
    });
  }

  console.log('✅ Created file touches');

  // Create Cost Ledger entries (last 7 days)
  const costEntries = [];
  const days = 7;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Add some random cost entries for each day
    const dailyCosts = [
      {
        aiModel: 'gpt-4o-mini',
        tokensIn: Math.floor(Math.random() * 2000) + 500,
        tokensOut: Math.floor(Math.random() * 1000) + 200,
        costUsd: Math.random() * 0.01,
        taskType: 'data_processing',
      },
      {
        aiModel: 'claude-haiku',
        tokensIn: Math.floor(Math.random() * 1500) + 300,
        tokensOut: Math.floor(Math.random() * 800) + 150,
        costUsd: Math.random() * 0.001,
        taskType: 'classification',
      },
      {
        aiModel: 'gemini-flash',
        tokensIn: Math.floor(Math.random() * 1200) + 200,
        tokensOut: Math.floor(Math.random() * 600) + 100,
        costUsd: Math.random() * 0.0005,
        taskType: 'dashboard_update',
      },
    ];

    for (const cost of dailyCosts) {
      costEntries.push({
        ...cost,
        createdAt: date,
      });
    }
  }

  for (const entry of costEntries) {
    await prisma.costLedger.create({
      data: entry,
    });
  }

  console.log('✅ Created cost ledger entries');

  // Seed admin user
const adminPasswordHash = await bcrypt.hash('admin123', 12);
await prisma.authUser.upsert({
  where: { email: 'admin@opensquad.dev' },
  update: { email: 'admin@opensquad.dev' },
  create: {
    email: 'admin@opensquad.dev',
    passwordHash: adminPasswordHash,
    name: 'Admin',
    role: 'admin'
  }
});

console.log('✅ Created admin user: admin@opensquad.dev / admin123');
console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });