import { useMetrics } from "@/hooks/useMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const DAILY_BUDGET_USD = parseFloat(localStorage.getItem("os-daily-budget") || "5.00");

export function BurnRate() {
  const { costs, loading } = useMetrics("week");

  if (loading) return <Skeleton className="h-48 rounded-xl" />;
  if (!costs?.byDay?.length) return null;

  const maxVal = Math.max(...costs.byDay.map((d: { usd: number }) => d.usd), DAILY_BUDGET_USD) * 1.2;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-zinc-300 flex items-center justify-between">
          Burn Rate (7d)
          <span className="text-xs font-mono text-amber-400">Budget: ${DAILY_BUDGET_USD}/day</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-32">
          {/* Budget line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-amber-500/50 z-10"
            style={{ bottom: `${(DAILY_BUDGET_USD / maxVal) * 100}%` }}
          >
            <span className="absolute -top-3 right-0 text-[9px] text-amber-500 font-mono">limit</span>
          </div>

          {/* Bars */}
          <div className="flex items-end h-full gap-1">
            {costs.byDay.map((d: { date: string; usd: number }) => {
              const pct = maxVal > 0 ? (d.usd / maxVal) * 100 : 0;
              const overBudget = d.usd > DAILY_BUDGET_USD;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t transition-all duration-500 ${overBudget ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ height: `${Math.max(pct, 2)}%` }}
                    title={`${d.date}: $${d.usd.toFixed(3)}`}
                  />
                  <span className="text-[8px] text-zinc-500 font-mono">{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
