import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, FileText, Activity as ActivityIcon, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Runs() {
  const [runs, setRuns] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [squads, setSquads] = useState<any[]>([]);
  const [filterSquad, setFilterSquad] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selected, setSelected] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [handoffs, setHandoffs] = useState<any[]>([]);

  const load = async () => {
    const [{ data: r }, { data: a }, { data: s }] = await Promise.all([
      supabase.from("runs").select("*").order("started_at", { ascending: false }).limit(200),
      supabase.from("agents").select("id, name, role"),
      supabase.from("squads").select("id, name, code"),
    ]);
    setRuns(r ?? []); setAgents(a ?? []); setSquads(s ?? []);
  };
  useEffect(() => { load(); }, []);

  const openDetails = async (run: any) => {
    setSelected(run);
    const [{ data: l }, { data: h }] = await Promise.all([
      supabase.from("run_logs").select("*").eq("run_id", run.id).order("ts", { ascending: true }),
      supabase.from("handoffs").select("*").eq("run_id", run.id).order("step_index"),
    ]);
    setLogs(l ?? []);
    setHandoffs(h ?? []);
  };

  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const squadMap = new Map(squads.map((s) => [s.id, s]));
  const agentName = (id: string) => agentMap.get(id)?.name ?? "—";
  const squadName = (id: string) => squadMap.get(id)?.name;
  const filtered = runs.filter((r) =>
    (filterSquad === "all" || r.squad_id === filterSquad) &&
    (filterStatus === "all" || r.status === filterStatus)
  );

  const duration = (run: any) => {
    if (!run.ended_at) return "—";
    const ms = new Date(run.ended_at).getTime() - new Date(run.started_at).getTime();
    return ms > 60000 ? `${(ms / 60000).toFixed(1)}m` : `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div>
      <PageHeader title="Execuções" description="Histórico de runs com timeline de handoffs entre agentes." />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap gap-2">
          <Select value={filterSquad} onValueChange={setFilterSquad}>
            <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os squads</SelectItem>
              {squads.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="running">Executando</SelectItem>
              <SelectItem value="queued">Em fila</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{filtered.length} runs</span>
            <span>·</span>
            <span>${filtered.reduce((s, r) => s + Number(r.cost ?? 0), 0).toFixed(4)} custo total</span>
          </div>
        </div>

        <Card className="border-border bg-card/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs">ID</TableHead>
                <TableHead className="text-xs">Squad / Agente</TableHead>
                <TableHead className="text-xs">Step</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Duração</TableHead>
                <TableHead className="text-xs">Tokens</TableHead>
                <TableHead className="text-xs">Custo</TableHead>
                <TableHead className="text-xs">Quando</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer border-border" onClick={() => openDetails(r)}>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{r.id.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium">{squadName(r.squad_id) ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{agentName(r.agent_id)}</div>
                  </TableCell>
                  <TableCell className="font-mono text-[11px]">{r.step_current}/{r.step_total}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="font-mono text-[11px]">{duration(r)}</TableCell>
                  <TableCell className="font-mono text-[11px]">{r.tokens_in + r.tokens_out}</TableCell>
                  <TableCell className="font-mono text-[11px]">${Number(r.cost).toFixed(4)}</TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(r.started_at), { locale: ptBR, addSuffix: true })}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">Sem execuções.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full max-w-xl sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Run <span className="font-mono text-xs text-muted-foreground">{selected?.id?.slice(0, 8)}</span>
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded border border-border bg-secondary/30 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Status</div>
                  <div className="mt-1"><StatusBadge status={selected.status} /></div>
                </div>
                <div className="rounded border border-border bg-secondary/30 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Squad</div>
                  <div className="mt-1 text-xs">{squadName(selected.squad_id) ?? "—"}</div>
                </div>
                <div className="rounded border border-border bg-secondary/30 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Tokens (in/out)</div>
                  <div className="mt-1 font-mono text-xs">{selected.tokens_in} / {selected.tokens_out}</div>
                </div>
                <div className="rounded border border-border bg-secondary/30 p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Custo</div>
                  <div className="mt-1 font-mono text-xs">${Number(selected.cost).toFixed(6)}</div>
                </div>
              </div>
              {selected.error && (
                <div className="rounded border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">{selected.error}</div>
              )}

              <Tabs defaultValue="timeline">
                <TabsList>
                  <TabsTrigger value="timeline"><ActivityIcon className="mr-1 h-3 w-3" />Timeline</TabsTrigger>
                  <TabsTrigger value="logs"><FileText className="mr-1 h-3 w-3" />Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="timeline">
                  <div className="space-y-2">
                    {handoffs.length === 0 && (
                      <div className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                        Sem handoffs registrados.
                      </div>
                    )}
                    {handoffs.map((h, i) => {
                      const from = agentMap.get(h.from_agent);
                      const to = agentMap.get(h.to_agent);
                      return (
                        <div key={h.id} className="relative flex items-start gap-3 rounded-md border border-border/60 bg-secondary/30 p-3">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-mono text-primary">
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-medium">{from?.name ?? "—"}</span>
                              <ArrowRight className="h-3 w-3 text-primary" />
                              <span className="font-medium">{to?.name ?? "—"}</span>
                            </div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                              {from?.role} → {to?.role}
                            </div>
                            {h.message && <div className="mt-1.5 text-[11px] text-muted-foreground">{h.message}</div>}
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-2.5 w-2.5" />
                              {h.completed_at
                                ? formatDistanceToNow(new Date(h.completed_at), { locale: ptBR, addSuffix: true })
                                : "pendente"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="logs">
                  <div className="max-h-72 space-y-0.5 overflow-y-auto rounded border border-border bg-background/50 p-2 font-mono text-[11px] scrollbar-thin">
                    {logs.length === 0 && <div className="text-muted-foreground">Sem logs.</div>}
                    {logs.map((l) => (
                      <div key={l.id} className="flex gap-2">
                        <span className="text-muted-foreground">{new Date(l.ts).toLocaleTimeString()}</span>
                        <span className={l.level === "error" ? "text-destructive" : "text-info"}>[{l.level}]</span>
                        <span>{l.message}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
