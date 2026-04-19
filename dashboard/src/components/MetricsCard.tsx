
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useMetrics } from '../hooks/useMetrics';

export function MetricsCard() {
    const { costs, throughput, loading } = useMetrics();

    if (loading) return <div className="p-4 text-center text-zinc-500 animate-pulse">Loading Metrics...</div>;

    const sparklineData = throughput.slice(-24).map(t => ({ val: t.completed }));

    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Tile 1 */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1">Today's Cost</p>
                    <div className="text-2xl font-bold text-emerald-400">${costs?.totalUsd?.toFixed(2) || '0.00'}</div>
                </div>
                {/* Tile 2 */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1">Tasks Completed</p>
                    <div className="text-2xl font-bold text-zinc-100">{throughput.reduce((acc, v) => acc + v.completed, 0)}</div>
                </div>
                {/* Tile 3 */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1">Success Rate</p>
                    <div className="text-2xl font-bold text-blue-400">
                        {throughput.length ?
                            Math.floor((throughput.reduce((a, v) => a + v.completed, 0) / Math.max(1, throughput.reduce((a, v) => a + v.completed + v.failed, 0))) * 100) : 100}%
                    </div>
                </div>
                {/* Tile 4 */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Agents</p>
                    <div className="text-2xl font-bold text-zinc-100">{Object.keys(costs?.byAgent || {}).length}</div>
                </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 h-32">
                <h4 className="text-xs text-zinc-500 mb-2">Throughput Sparkline (24h)</h4>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData}>
                        <Area type="monotone" dataKey="val" stroke="#10b981" fill="#047857" fillOpacity={0.3} strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
