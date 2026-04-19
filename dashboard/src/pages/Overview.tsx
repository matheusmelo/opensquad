import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { seedDemoIfEmpty } from "@/lib/seed";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Bot, Activity, CheckCircle2, DollarSign, Users, ArrowUpRight, GitBranch } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Kpis {
  squads: number;
  activeAgents: number;
  runningTasks: number;
  successRate: number;
  cost24h: number;
  handoffs24h: number;
}

export default function Overview() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<Kpis>({ squads: 0, activeAgents: 0, runningTasks: 0, successRate: 0, cost24h: 0, handoffs24h: 0 });
  const [chart, setChart] = useState<Array<{ hour: string; runs: number; failed: number }>>([]);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [activeSquads, setActiveSquads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      await seedDemoIfEmpty(user.id);
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const [{ data: squads }, { data: agents }, { data: tasks }, { data: runs }, { data: handoffs }] = await Promise.all([
      supabase.from("squads").select("id, name, code, status"),
      supabase.from("agents").select("id, name, status, squad_id"),
      supabase.from("tasks").select("id, status"),
      supabase.from("runs").select("id, agent_id, squad_id, status, started_at, ended_at, tokens_in, tokens_out, cost, step_current, step_total, step_label").gte("started_at", since).order("started_at", { ascending: false }),
      supabase.from("handoffs").select("id, completed_at").gte("created_at", since),
    ]);

    const activeAgents = (agents ?? []).filter((a) => a.status === "working" || a.status === "delivering").length;
    const runningTasks = (tasks ?? []).filter((t) => t.status === "running" || t.status === "queued").length;
    const total = runs?.length ?? 0;
    const success = (runs ?? []).filter((r) => r.status === "success").length;
    const successRate = total ? Math.round((success / total) * 100) : 0;
    const cost24h = (runs ?? []).reduce((s, r) => s + Number(r.cost ?? 0), 0);
    setKpis({
      squads: squads?.length ?? 0,
      activeAgents, runningTasks, successRate, cost24h,
      handoffs24h: handoffs?.length ?? 0,
    });

    // chart: runs per hour bucket
    const buckets: Record<string, { runs: number; failed: number }> = {};
    for (let h = 23; h >= 0; h--) {
      const d = new Date(Date.now() - h * 3600_000);
      const key = `${d.getHours().toString().padStart(2, "0")}h`;
      buckets[key] = { runs: 0, failed: 0 };
    }
    (runs ?? []).forEach((r) => {
      const d = new Date(r.started_at);
      const key = `${d.getHours().toString().padStart(2, "0")}h`;
      if (buckets[key]) {
        buckets[key].runs++;
        if (r.status === "failed") buckets[key].failed++;
      }
    });
    setChart(Object.entries(buckets).map(([hour, v]) => ({ hour, ...v })));

    const agentMap = new Map((agents ?? []).map((a) => [a.id, a.name]));
    const squadMap = new Map((squads ?? []).map((s) => [s.id, s]));
    setRecentRuns((runs ?? []).slice(0, 6).map((r) => ({
      ...r,
      agent_name: agentMap.get(r.agent_id),
      squad_name: r.squad_id ? squadMap.get(r.squad_id)?.name : null,
      squad_code: r.squad_id ? squadMap.get(r.squad_id)?.code : null,
    })));

    // active squads = squads with at least one run in 24h
    const squadActivity: Record<string, { count: number; latest: any }> = {};
    (runs ?? []).forEach((r) => {
      if (!r.squad_id) return;
      const e = (squadActivity[r.squad_id] ??= { count: 0, latest: r });
      e.count++;
    });
    const top = Object.entries(squadActivity)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 4)
      .map(([sid, v]) => ({ ...squadMap.get(sid), runs: v.count, latest: v.latest }));
    setActiveSquads(top);
    setLoading(false);
  };

  const kpiCards = [
    { label: "Squads", value: kpis.squads, icon: Users, color: "text-primary" },
    { label: "Agentes ativos", value: kpis.activeAgents, icon: Bot, color: "text-info" },
    { label: "Tarefas em execução", value: kpis.runningTasks, icon: Activity, color: "text-info" },
    { label: "Taxa de sucesso (24h)", value: `${kpis.successRate}%`, icon: CheckCircle2, color: "text-success" },
    { label: "Handoffs (24h)", value: kpis.handoffs24h, icon: GitBranch, color: "text-primary-glow" },
    { label: "Custo (24h)", value: `$${kpis.cost24h.toFixed(4)}`, icon: DollarSign, color: "text-warning" },
  ];

  return (
    <div>
      <PageHeader title="Overview" description="Visão geral do seu digital office nas últimas 24 horas." />
      <div className="space-y-6 p-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {kpiCards.map((k) => (
            <Card key={k.label} className="border-border bg-card/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</span>
                <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
              </div>
              <div className="mt-2 text-xl font-semibold tracking-tight">{loading ? "—" : k.value}</div>
            </Card>
          ))}
        </div>

        {/* Chart */}
        <Card className="border-border bg-card/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Execuções por hora</h3>
              <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer>
              <AreaChart data={chart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area type="monotone" dataKey="runs" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="failed" stroke="hsl(var(--destructive))" fill="url(#g2)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Lower grid */}
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="border-border bg-card/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Últimas execuções</h3>
              <Link to="/runs" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                Ver todas <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {recentRuns.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Sem execuções ainda.</p>}
              {recentRuns.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border border-border/50 bg-secondary/30 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    <span className="font-medium">{r.squad_name ?? r.agent_name}</span>
                    {r.step_total > 0 && <span className="font-mono text-[10px] text-muted-foreground">{r.step_current}/{r.step_total}</span>}
                  </div>
                  <span className="text-muted-foreground">{formatDistanceToNow(new Date(r.started_at), { locale: ptBR, addSuffix: true })}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-border bg-card/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Squads mais ativos</h3>
              <Link to="/squads" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                Ver todos <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {activeSquads.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Sem dados.</p>}
              {activeSquads.map((s, i) => (
                <Link key={s.id} to={`/squads/${s.code}`} className="flex items-center justify-between rounded-md border border-border/50 bg-secondary/30 px-3 py-2 text-xs hover:bg-secondary/60">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">#{i + 1}</span>
                    <span className="font-medium">{s.name}</span>
                  </div>
                  <span className="font-mono text-muted-foreground">{s.runs} runs</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
