import { useMetrics } from "@/hooks/useMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

interface CostByCategory {
  name: string;
  value: number;
  color: string;
}

export function CategoryDonut() {
  const { costs, loading } = useMetrics();

  if (loading) return <Skeleton className="h-52 rounded-xl" />;
  if (!costs?.byModel) return null;

  const data: CostByCategory[] = Object.entries(costs.byModel).map(([model, usd], i) => ({
    name: model,
    value: typeof usd === "number" ? usd : 0,
    color: COLORS[i % COLORS.length],
  }));

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-zinc-300">Cost by Model</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Donut SVG */}
          <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
              {data.reduce<{ elements: React.ReactNode[]; offset: number }>((acc, d, i) => {
                const pct = total > 0 ? (d.value / total) * 100 : 0;
                acc.elements.push(
                  <circle key={i} cx="21" cy="21" r="15.91549" fill="none" stroke={d.color} strokeWidth="4"
                    strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={`-${acc.offset}`} className="transition-all duration-500" />
                );
                acc.offset += pct;
                return acc;
              }, { elements: [], offset: 0 }).elements}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-mono font-bold text-zinc-200">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-1.5 text-xs min-w-0">
            {data.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-zinc-400 truncate">{d.name}</span>
                <span className="ml-auto text-zinc-200 font-mono">${d.value.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
