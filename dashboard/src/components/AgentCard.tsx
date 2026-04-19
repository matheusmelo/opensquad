import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import type { AgentStatus } from '@/types/activity';
import { useSquadStore } from '@/store/useSquadStore';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface Props {
  agent: AgentStatus;
  onClick?: (id: string) => void;
}

export function AgentCard({ agent, onClick }: Props) {
  const setSelectedAgent = useSquadStore((s) => s.setSelectedAgent);

  const handleSelect = () => {
    setSelectedAgent(agent.agentId);
    onClick?.(agent.agentId);
  };

  const pct = Math.min(Math.max(Math.round(agent.progressPct || 0), 0), 100);
  const remaining = 100 - pct;

  return (
    <Card
      onClick={handleSelect}
      className={`cursor-pointer transition-all duration-300 hover:scale-[1.01] ${
        agent.status === 'working'
          ? 'border-emerald-800/60 shadow-lg shadow-emerald-900/10 bg-gradient-to-br from-zinc-900 to-zinc-950'
          : 'hover:border-zinc-700'
      }`}
    >
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className={`h-11 w-11 ring-2 ${agent.status === 'working' ? 'ring-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.2)]' : 'ring-zinc-700'}`}>
              <AvatarFallback className="text-lg bg-zinc-800">
                {agent.icon || agent.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-100 truncate">{agent.name}</h3>
              <p className="text-[11px] text-zinc-500 font-mono truncate">{agent.squadId}</p>
            </div>
          </div>
          <Badge variant={agent.status as "working" | "idle" | "done" | "failed"}>
            {agent.status}
          </Badge>
        </div>

        {/* Task */}
        <div className="bg-zinc-950/80 rounded-lg p-3 border border-zinc-800/50">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1.5">
            {agent.status === 'working' ? '⚡ Current Task' : '⏳ Queued'}
          </p>
          <p className="text-sm text-zinc-200 line-clamp-2 min-h-[2.5rem] leading-relaxed">
            {agent.currentTask || 'Awaiting instructions...'}
          </p>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-[11px] font-semibold mb-1.5">
            <span className={agent.status === 'working' ? 'text-emerald-400' : 'text-zinc-500'}>{pct}%</span>
            <span className="text-zinc-500">{remaining === 100 ? 'Pending' : `${remaining}% left`}</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-[11px] text-zinc-500">
          <span>⏱ {agent.startedAt ? formatDistanceToNow(new Date(agent.startedAt)) : '0s'}</span>
          <span className="font-mono text-emerald-400">${(agent.costTodayUsd || 0).toFixed(4)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
