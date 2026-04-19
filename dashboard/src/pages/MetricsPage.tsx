
import { MetricsCard } from '../components/MetricsCard';
import { CostHeatmap } from '../components/CostHeatmap';
import { FileTouchMap } from '../components/FileTouchMap';
import { Leaderboard } from '../components/Leaderboard';

export function MetricsPage() {
    return (
        <div className="p-6 overflow-y-auto w-full flex-1 bg-zinc-950">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-zinc-100">Global Metrics</h1>
                <p className="text-zinc-500 text-sm">Monitoramento financeiro e de performance das Squads</p>
            </header>

            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
                <MetricsCard />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CostHeatmap period="month" />
                    <Leaderboard />
                </div>

                <div>
                    <FileTouchMap />
                </div>
            </div>
        </div>
    );
}
