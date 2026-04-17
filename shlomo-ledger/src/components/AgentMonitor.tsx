import { useState, useEffect } from 'react';
import { Activity, Cpu, CheckCircle2, XCircle, Clock, Play, Pause, Zap } from 'lucide-react';

interface AgentStatus {
  id: string;
  name: string;
  status: 'working' | 'done' | 'idle' | 'error';
  current_task?: string;
  progress?: number;
  model_used?: string;
  cost?: number;
}

interface SquadExecution {
  squad_id: string;
  run_id: string;
  status: 'running' | 'completed' | 'failed';
  step: { current: number; total: number; label: string };
  agents: AgentStatus[];
  started_at: string;
  elapsed_time: string;
}

export function AgentMonitor() {
  const [activeExecutions, setActiveExecutions] = useState<SquadExecution[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedSquad, setSelectedSquad] = useState<string | null>(null);

  useEffect(() => {
    if (!autoRefresh) return;

    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/monitor/executions');
        const data = await response.json();
        setActiveExecutions(data);
      } catch (error) {
        console.error('Erro buscando status:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // Atualiza a cada 3s
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'done': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'error': return 'text-red-400 bg-red-500/10 border-red-500/30';
      default: return 'text-zinc-400 bg-zinc-800/50 border-zinc-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return <Activity className="animate-pulse" size={18} />;
      case 'done': return <CheckCircle2 size={18} />;
      case 'error': return <XCircle size={18} />;
      default: return <Clock size={18} />;
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 bg-zinc-950 text-white">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Agent Monitor Dashboard
          </h1>
          <p className="text-zinc-400">Monitore todos os agentes autônomos em tempo real</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              autoRefresh ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {autoRefresh ? <Pause size={18} /> : <Play size={18} />}
            {autoRefresh ? 'Pausar' : 'Retomar'}
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Activity className="text-blue-400" />}
          label="Execuções Ativas"
          value={activeExecutions.filter(e => e.status === 'running').length.toString()}
          color="border-blue-500/30 bg-blue-500/5"
        />
        <StatCard
          icon={<CheckCircle2 className="text-emerald-400" />}
          label="Concluídas Hoje"
          value="23"
          color="border-emerald-500/30 bg-emerald-500/5"
        />
        <StatCard
          icon={<Cpu className="text-purple-400" />}
          label="Agentes Online"
          value="11"
          color="border-purple-500/30 bg-purple-500/5"
        />
        <StatCard
          icon={<Zap className="text-amber-400" />}
          label="Custo Total (Hoje)"
          value="$0.08"
          color="border-amber-500/30 bg-amber-500/5"
        />
      </div>

      {/* Executions List */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold mb-4">Execuções em Andamento</h2>
        
        {activeExecutions.length === 0 ? (
          <EmptyState />
        ) : (
          activeExecutions.map(execution => (
            <ExecutionCard
              key={execution.run_id}
              execution={execution}
              onDetails={() => setSelectedSquad(execution.squad_id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <div className={`p-6 rounded-2xl border backdrop-blur-sm ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-zinc-400 text-sm font-medium">{label}</div>
        {icon}
      </div>
      <div className="text-3xl font-extrabold">{value}</div>
    </div>
  );
}

function ExecutionCard({ execution, onDetails }: { execution: SquadExecution; onDetails: () => void }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">● Executando</span>;
      case 'completed':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ Concluído</span>;
      case 'failed':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">✕ Falhou</span>;
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-sm hover:border-zinc-700 transition-all">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold">{execution.squad_id}</h3>
            {getStatusBadge(execution.status)}
          </div>
          <p className="text-sm text-zinc-400 font-mono">Run ID: {execution.run_id}</p>
        </div>
        
        <div className="text-right">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Progresso</div>
          <div className="text-lg font-bold">{execution.step.current}/{execution.step.total}</div>
          <div className="text-sm text-zinc-400">{execution.step.label}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-800 rounded-full h-2 mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
          style={{ width: `${(execution.step.current / execution.step.total) * 100}%` }}
        />
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {execution.agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Details Button */}
      <button
        onClick={onDetails}
        className="mt-6 w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium transition-all"
      >
        Ver Detalhes →
      </button>
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentStatus }) {
  const statusColors = {
    working: 'border-blue-500/40 bg-blue-500/5',
    done: 'border-emerald-500/40 bg-emerald-500/5',
    error: 'border-red-500/40 bg-red-500/5',
    idle: 'border-zinc-700 bg-zinc-800/30'
  };

  return (
    <div className={`p-4 rounded-xl border backdrop-blur-sm ${statusColors[agent.status]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-sm">{agent.name}</div>
        <div className="text-zinc-400">{getStatusIcon(agent.status)}</div>
      </div>

      {agent.current_task && (
        <div className="text-xs text-zinc-400 mb-2 line-clamp-2">
          {agent.current_task}
        </div>
      )}

      {agent.progress !== undefined && (
        <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-2">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${agent.progress}%` }}
          />
        </div>
      )}

      {agent.model_used && (
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Modelo:</span>
          <span className="text-zinc-300 font-mono">{agent.model_used}</span>
        </div>
      )}

      {agent.cost !== undefined && (
        <div className="flex justify-between text-xs mt-1">
          <span className="text-zinc-500">Custo:</span>
          <span className="text-amber-400 font-mono">${agent.cost.toFixed(4)}</span>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-16 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex flex-col items-center justify-center text-center">
      <div className="text-6xl mb-4">🤖</div>
      <h3 className="text-2xl font-bold mb-2">Nenhuma Execução Ativa</h3>
      <p className="text-zinc-400 max-w-md">
        Todos os agentes estão ociosos no momento. Inicie uma tarefa via WhatsApp ou comando /dev-with-ai para vê-los trabalhando.
      </p>
    </div>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'working': return <Activity size={16} className="text-blue-400 animate-pulse" />;
    case 'done': return <CheckCircle2 size={16} className="text-emerald-400" />;
    case 'error': return <XCircle size={16} className="text-red-400" />;
    default: return <Clock size={16} className="text-zinc-500" />;
  }
}
