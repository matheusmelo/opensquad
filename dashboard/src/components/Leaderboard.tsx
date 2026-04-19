
import { useMetrics } from '../hooks/useMetrics';

export function Leaderboard() {
    const { leaderboard, loading } = useMetrics();

    if (loading) return null;

    const sorted = [...leaderboard].sort((a, b) => b.tasksCompleted - a.tasksCompleted);

    return (
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
            <h3 className="text-zinc-300 font-medium mb-4 text-sm flex items-center gap-2">
                <span>🏆</span> Agent Leaderboard
            </h3>
            <div className="flex flex-col gap-1">
                <div className="flex gap-2 text-[10px] text-zinc-500 font-bold uppercase mb-2 px-2">
                    <span className="w-6">Rk</span>
                    <span className="flex-1">Agent</span>
                    <span className="w-16 text-right">Tasks</span>
                    <span className="w-20">Success</span>
                    <span className="w-16 text-right">Cost</span>
                </div>

                {sorted.map((entry, idx) => (
                    <div key={entry.agentId} className="flex items-center gap-2 bg-zinc-950/50 p-2 rounded text-xs">
                        <span className="w-6 text-center font-bold text-zinc-400">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </span>
                        <span className="flex-1 text-emerald-400 font-medium truncate">{entry.name}</span>
                        <span className="w-16 text-right text-zinc-300">{entry.tasksCompleted}</span>
                        <div className="w-20 flex items-center gap-1">
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${entry.successRatePct}%` }} />
                            </div>
                        </div>
                        <span className="w-16 text-right text-zinc-500">${entry.totalCostUsd.toFixed(3)}</span>
                    </div>
                ))}
                {sorted.length === 0 && <p className="text-[10px] text-zinc-600 px-2 py-1">Sem dados.</p>}
            </div>
        </div>
    );
}
