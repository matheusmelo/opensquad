import { useEffect, useState } from 'react';
import { ResponsiveCalendar } from '@nivo/calendar';
import { api } from '../lib/api';

export function CostHeatmap({ period }: { period: 'today' | 'week' | 'month' }) {
    const [data, setData] = useState<{ day: string, value: number }[]>([]);

    useEffect(() => {
        api.metrics.costs(period).then((metrics) => {
            const heatmapData = (metrics.byDay || []).map(d => ({ day: d.date, value: d.usd }));
            if (heatmapData.length === 0) {
                heatmapData.push({ day: new Date().toISOString().split('T')[0], value: 0 });
            }
            setData(heatmapData);
        });
    }, [period]);

    const year = new Date().getFullYear();
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;

    return (
        <div className="h-48 w-full bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <h3 className="text-zinc-300 font-medium mb-2 text-sm">Cost Heatmap (USD) - {period}</h3>
            <ResponsiveCalendar
                data={data}
                from={from}
                to={to}
                emptyColor="#18181b"
                colors={['#064e3b', '#065f46', '#10b981', '#34d399']}
                margin={{ top: 20, right: 40, bottom: 40, left: 40 }}
                yearSpacing={40}
                monthBorderColor="#27272a"
                dayBorderWidth={2}
                dayBorderColor="#27272a"
                theme={{
                    text: { fill: '#a1a1aa' },
                    tooltip: { container: { background: '#18181b', color: '#fff' } }
                }}
            />
        </div>
    );
}
