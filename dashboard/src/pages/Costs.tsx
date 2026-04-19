import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AI_MODELS, MODEL_BY_ID, PROVIDER_COLOR, calcCost, fmtUsd, modelLabel } from "@/lib/aiModels";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell, PieChart, Pie, Legend } from "recharts";
import { DollarSign, TrendingUp, Zap, AlertTriangle } from "lucide-react";

type Range = "24h" | "7d" | "30d";
const RANGE_HOURS: Record<Range, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };

export default function Costs() {
  const [range, setRange] = useState<Range>("7d");
  const [runs, setRuns] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [squads, setSquads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - RANGE_HOURS[range] * 3600_000).toISOString();
      const [{ data: r }, { data: a }, { data: s }] = await Promise.all([
        supabase.from("runs").select("id, agent_id, squad_id, status, started_at, tokens_in, tokens_out, cost").gte("started_at", since).order("started_at", { ascending: false }),
        supabase.from("agents").select("id, name, role, model, squad_id"),
        supabase.from("squads").select("id, name, code"),
      ]);
      setRuns(r ?? []); setAgents(a ?? []); setSquads(s ?? []);
      setLoading(false);
    })();
  }, [range]);

  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents]);
  const squadMap = useMemo(() => new Map(squads.map((s) => [s.id, s])), [squads]);

  // Recompute cost using AI_MODELS table (real router prices) instead of stored cost
  const enriched = useMemo(() => runs.map((r) => {
    const agent = agentMap.get(r.agent_id);
    const modelId = agent?.model ?? "gemini-flash";
    const realCost = calcCost(modelId, r.tokens_in ?? 0, r.tokens_out ?? 0);
    return { ...r, modelId, realCost, agent_name: agent?.name ?? "—", squad_name: r.squad_id ? squadMap.get(r.squad_id)?.name : "—" };
  }), [runs, agentMap, squadMap]);

  const totals = useMemo(() => {
    const t = enriched.reduce((acc, r) => {
      acc.cost += r.realCost;
      acc.tokensIn += r.tokens_in ?? 0;
      acc.tokensOut += r.tokens_out ?? 0;
      acc.runs += 1;
      if (r.status === "failed") acc.failed += 1;
      return acc;
    }, { cost: 0, tokensIn: 0, tokensOut: 0, runs: 0, failed: 0 });
    const days = RANGE_HOURS[range] / 24;
    return { ...t, dailyAvg: t.cost / days, monthlyProj: (t.cost / days) * 30, costPerRun: t.runs ? t.cost / t.runs : 0 };
  }, [enriched, range]);

  // Cost by model
  const byModel = useMemo(() => {
    const m: Record<string, { modelId: string; cost: number; runs: number; tokens: number }> = {};
    enriched.forEach((r) => {
      const e = (m[r.modelId] ??= { modelId: r.modelId, cost: 0, runs: 0, tokens: 0 });
      e.cost += r.realCost; e.runs += 1; e.tokens += (r.tokens_in ?? 0) + (r.tokens_out ?? 0);
    });
    return Object.values(m).sort((a, b) => b.cost - a.cost);
  }, [enriched]);

  // Cost by squad
  const bySquad = useMemo(() => {
    const m: Record<string, { name: string; cost: number; runs: number }> = {};
    enriched.forEach((r) => {
      const key = r.squad_name ?? "—";
      const e = (m[key] ??= { name: key, cost: 0, runs: 0 });
      e.cost += r.realCost; e.runs += 1;
    });
    return Object.values(m).sort((a, b) => b.cost - a.cost);
  }, [enriched]);

  // Cost by agent
  const byAgent = useMemo(() => {
    const m: Record<string, { name: string; role: string; modelId: string; cost: number; runs: number; tokens: number }> = {};
    enriched.forEach((r) => {
      const a = agentMap.get(r.agent_id);
      const key = r.agent_id;
      const e = (m[key] ??= { name: a?.name ?? "—", role: a?.role ?? "", modelId: r.modelId, cost: 0, runs: 0, tokens: 0 });
      e.cost += r.realCost; e.runs += 1; e.tokens += (r.tokens_in ?? 0) + (r.tokens_out ?? 0);
    });
    return Object.values(m).sort((a, b) => b.cost - a.cost);
  }, [enriched, agentMap]);

  // Time series — buckets
  const series = useMemo(() => {
    const hours = RANGE_HOURS[range];
    const bucketCount = hours <= 24 ? 24 : hours / 24;
    const bucketHours = hours / bucketCount;
    const buckets: Array<{ label: string; cost: number; runs: number }> = [];
    for (let i = bucketCount - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * bucketHours * 3600_000);
      const label = hours <= 24 ? `${d.getHours().toString().padStart(2, "0")}h` : `${d.getDate()}/${d.getMonth() + 1}`;
      buckets.push({ label, cost: 0, runs: 0 });
    }
    enriched.forEach((r) => {
      const ageH = (Date.now() - new Date(r.started_at).getTime()) / 3600_000;
      const idx = bucketCount - 1 - Math.floor(ageH / bucketHours);
      if (idx >= 0 && idx < bucketCount) {
        buckets[idx].cost += r.realCost;
        buckets[idx].runs += 1;
      }
    });
    return buckets;
  }, [enriched, range]);

  // Provider breakdown
  const byProvider = useMemo(() => {
    const m: Record<string, number> = {};
    byModel.forEach((row) => {
      const p = MODEL_BY_ID[row.modelId]?.provider ?? "openai";
      m[p] = (m[p] ?? 0) + row.cost;
    });
    return Object.entries(m).map(([provider, value]) => ({ name: provider, value, color: PROVIDER_COLOR[provider as keyof typeof PROVIDER_COLOR] }));
  }, [byModel]);

  return (
    <div>
      <PageHeader title="Custos" description="Custo real da operação calculado com a tabela de preços do multi-ai-router OpenSquad." />
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24 horas</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[11px] text-muted-foreground">
            Cálculo: tokens × preço do modelo (USD/1k). Fonte: <code className="text-foreground">orchestrator/multi-ai-router.js</code>
          </span>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Custo total" value={fmtUsd(totals.cost, 4)} icon={DollarSign} color="text-warning" hint={`${totals.runs} runs`} />
          <KpiCard label="Média diária" value={fmtUsd(totals.dailyAvg, 4)} icon={TrendingUp} color="text-info" />
          <KpiCard label="Projeção 30 dias" value={fmtUsd(totals.monthlyProj, 2)} icon={TrendingUp} color="text-primary" hint="extrapolado" />
          <KpiCard label="Custo / run" value={fmtUsd(totals.costPerRun, 5)} icon={Zap} color="text-success" hint={`${(totals.tokensIn + totals.tokensOut).toLocaleString()} tokens`} />
        </div>

        {/* Chart + provider pie */}
        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="border-border bg-card/50 p-4 lg:col-span-2">
            <h3 className="mb-3 text-sm font-semibold">Custo ao longo do tempo</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <AreaChart data={series} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="costG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(3)}`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => fmtUsd(v, 5)}
                  />
                  <Area type="monotone" dataKey="cost" stroke="hsl(var(--warning))" fill="url(#costG)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="border-border bg-card/50 p-4">
            <h3 className="mb-3 text-sm font-semibold">Por provider</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byProvider} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {byProvider.map((p, i) => <Cell key={i} fill={p.color} stroke="hsl(var(--background))" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => fmtUsd(v, 5)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Breakdown tabs */}
        <Tabs defaultValue="model">
          <TabsList className="bg-secondary/40">
            <TabsTrigger value="model" className="text-xs">Por modelo</TabsTrigger>
            <TabsTrigger value="squad" className="text-xs">Por squad</TabsTrigger>
            <TabsTrigger value="agent" className="text-xs">Por agente</TabsTrigger>
            <TabsTrigger value="catalog" className="text-xs">Tabela de preços</TabsTrigger>
          </TabsList>

          <TabsContent value="model" className="mt-3">
            <Card className="border-border bg-card/50 p-4">
              <div className="mb-3 h-48 w-full">
                <ResponsiveContainer>
                  <BarChart data={byModel.slice(0, 7)} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="modelId" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toFixed(3)}`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => fmtUsd(v, 5)}
                    />
                    <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                      {byModel.slice(0, 7).map((row, i) => (
                        <Cell key={i} fill={PROVIDER_COLOR[(MODEL_BY_ID[row.modelId]?.provider ?? "openai") as keyof typeof PROVIDER_COLOR]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs">Modelo</TableHead>
                    <TableHead className="text-xs">Provider</TableHead>
                    <TableHead className="text-xs">Runs</TableHead>
                    <TableHead className="text-xs">Tokens</TableHead>
                    <TableHead className="text-xs text-right">Custo</TableHead>
                    <TableHead className="text-xs text-right">% do total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byModel.map((row) => {
                    const m = MODEL_BY_ID[row.modelId];
                    const pct = totals.cost ? (row.cost / totals.cost) * 100 : 0;
                    return (
                      <TableRow key={row.modelId} className="border-border">
                        <TableCell className="text-xs font-medium">{m?.name ?? row.modelId}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{m?.provider ?? "—"}</Badge></TableCell>
                        <TableCell className="font-mono text-[11px]">{row.runs}</TableCell>
                        <TableCell className="font-mono text-[11px]">{row.tokens.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-[11px]">{fmtUsd(row.cost, 5)}</TableCell>
                        <TableCell className="text-right font-mono text-[11px] text-muted-foreground">{pct.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                  {byModel.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">Sem dados no período.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="squad" className="mt-3">
            <Card className="border-border bg-card/50 p-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs">Squad</TableHead>
                    <TableHead className="text-xs">Runs</TableHead>
                    <TableHead className="text-xs text-right">Custo total</TableHead>
                    <TableHead className="text-xs text-right">Custo / run</TableHead>
                    <TableHead className="text-xs text-right">% do total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bySquad.map((row) => {
                    const pct = totals.cost ? (row.cost / totals.cost) * 100 : 0;
                    return (
                      <TableRow key={row.name} className="border-border">
                        <TableCell className="text-xs font-medium">{row.name}</TableCell>
                        <TableCell className="font-mono text-[11px]">{row.runs}</TableCell>
                        <TableCell className="text-right font-mono text-[11px]">{fmtUsd(row.cost, 5)}</TableCell>
                        <TableCell className="text-right font-mono text-[11px]">{fmtUsd(row.cost / Math.max(row.runs, 1), 6)}</TableCell>
                        <TableCell className="text-right font-mono text-[11px] text-muted-foreground">{pct.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                  {bySquad.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">Sem dados.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="agent" className="mt-3">
            <Card className="border-border bg-card/50 p-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs">Agente</TableHead>
                    <TableHead className="text-xs">Modelo</TableHead>
                    <TableHead className="text-xs">Runs</TableHead>
                    <TableHead className="text-xs">Tokens</TableHead>
                    <TableHead className="text-xs text-right">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byAgent.map((row, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell className="text-xs">
                        <div className="font-medium">{row.name}</div>
                        <div className="text-[10px] text-muted-foreground">{row.role}</div>
                      </TableCell>
                      <TableCell className="text-xs">{modelLabel(row.modelId)}</TableCell>
                      <TableCell className="font-mono text-[11px]">{row.runs}</TableCell>
                      <TableCell className="font-mono text-[11px]">{row.tokens.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-[11px]">{fmtUsd(row.cost, 5)}</TableCell>
                    </TableRow>
                  ))}
                  {byAgent.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">Sem dados.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="catalog" className="mt-3">
            <Card className="border-border bg-card/50 p-4">
              <div className="mb-3 flex items-start gap-2 rounded-md border border-info/30 bg-info/5 p-2.5 text-[11px] text-info">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Preços oficiais do <code>multi-ai-router.js</code> em USD por 1.000 tokens. Atualizar aqui quando os providers mudarem tabelas.</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs">Modelo</TableHead>
                    <TableHead className="text-xs">Provider</TableHead>
                    <TableHead className="text-xs text-right">Input / 1k</TableHead>
                    <TableHead className="text-xs text-right">Output / 1k</TableHead>
                    <TableHead className="text-xs">Context</TableHead>
                    <TableHead className="text-xs">Velocidade</TableHead>
                    <TableHead className="text-xs">Free tier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {AI_MODELS.map((m) => (
                    <TableRow key={m.id} className="border-border">
                      <TableCell className="text-xs font-medium">{m.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{m.provider}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-[11px]">${m.cost_in.toFixed(6)}</TableCell>
                      <TableCell className="text-right font-mono text-[11px]">${m.cost_out.toFixed(6)}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{(m.max_tokens / 1000).toLocaleString()}k</TableCell>
                      <TableCell className="text-[11px] capitalize">{m.speed.replace("_", " ")}</TableCell>
                      <TableCell>{m.free_tier ? <Badge className="bg-success/20 text-success text-[10px]">free</Badge> : <span className="text-[11px] text-muted-foreground">paid</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, hint }: { label: string; value: string; icon: any; color: string; hint?: string }) {
  return (
    <Card className="border-border bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}
