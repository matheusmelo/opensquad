export type ActivityEventType =
    | 'TASK_STARTED'
    | 'FILE_READ'
    | 'FILE_WRITE'
    | 'TOOL_CALL'
    | 'AI_CALL'
    | 'TASK_COMPLETED'
    | 'TASK_FAILED'
    | 'MESSAGE';

export interface ActivityEvent {
    id: string;
    timestamp: string;
    executionId?: string;
    runId?: string;
    agentId?: string;
    squadId?: string;
    type: ActivityEventType;
    filePath?: string;
    toolName?: string;
    aiModel?: string;
    tokensIn?: number;
    tokensOut?: number;
    costUsd?: number;
    durationMs?: number;
    message?: string;
    payloadJson?: string;
}

export interface AgentStatus {
    agentId: string;
    name: string;
    icon?: string;
    squadId: string;
    status: 'idle' | 'working' | 'done' | 'failed';
    currentTask?: string;
    aiModel?: string;
    progressPct: number;
    startedAt?: string;
    elapsedMs?: number;
    tokensUsedToday: number;
    costTodayUsd: number;
    lastFileTouched?: string;
}

export interface PipelineStep {
    stepId: string;
    label: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    agentId: string;
}

export interface SquadSnapshot {
    squadId: string;
    executionId: string;
    status: 'running' | 'completed' | 'failed' | 'aborted';
    pipeline: PipelineStep[];
    activeAgents: string[];
    startedAt: string;
    completedAt?: string;
    totalCostUsd: number;
    totalTokens: number;
}

export interface CostMetrics {
    period: 'today' | 'week' | 'month';
    totalUsd: number;
    totalBrl: number;
    byModel: Record<string, number>;
    byAgent: Record<string, number>;
    byDay: Array<{ date: string; usd: number }>;
}

export interface ThroughputPoint {
    hour: string;
    completed: number;
    failed: number;
    timestamp: string;
}

export interface TopFile {
    filePath: string;
    touches: number;
    lastAction: 'read' | 'write' | 'delete' | 'create';
    lastAt: string;
    lastAgentId: string;
}

export interface FileTouch {
    filePath: string;
    touches: number;
    lastAction: string;
    lastAt: string;
}

export interface LeaderboardEntry {
    agentId: string;
    name: string;
    tasksCompleted: number;
    totalCostUsd: number;
    tokensUsed: number;
    successRatePct: number;
}

export interface ParsedTransaction {
    date: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    installment?: { current: number; total: number };
}

export interface ParsedStatement {
    bank: 'nubank' | 'itau' | 'bradesco' | 'unknown';
    period: { start: string; end: string };
    transactions: ParsedTransaction[];
}

export interface ClassificationResult {
    contexto: 'PF' | 'PJ';
    pulmao?: 1 | 2 | 3;
    categoria: string;
    confianca: number;
    matchedRule?: {
        id: string;
        pattern: string;
        source: 'yaml' | 'db';
    };
}

export interface WhatsAppMessage {
    id: string;
    timestamp: string;
    from: 'user' | 'bot';
    phoneNumber: string;
    text?: string;
    audioTranscript?: string;
    attachments?: Array<{ kind: 'pdf' | 'image'; url: string; name: string }>;
}
