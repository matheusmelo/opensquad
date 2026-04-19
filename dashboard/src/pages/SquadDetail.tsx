import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight, Hash, Play, Save, LayoutGrid, List as ListIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SquadOfficeView } from "@/components/SquadOfficeView";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SquadDetail() {
  const { code } = useParams();
  const [squad, setSquad] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [handoffs, setHandoffs] = useState<any[]>([]);
  const [view, setView] = useState<"office" | "list">("office");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!code) return;
    const { data: sq } = await supabase.from("squads").select("*").eq("code", code).maybeSingle();
    if (!sq) return;
    setSquad(sq);
    const [{ data: ag }, { data: rs }] = await Promise.all([
      supabase.from("agents").select("*").eq("squad_id", sq.id).order("desk_row").order("desk_col"),
      supabase.from("runs").select("*").eq("squad_id", sq.id).order("started_at", { ascending: false }).limit(20),
    ]);
    setAgents(ag ?? []);
    setRuns(rs ?? []);
    if (rs && rs.length) {
      const { data: hs } = await supabase.from("handoffs").select("*").in("run_id", rs.slice(0, 5).map((r) => r.id)).order("step_index");
      setHandoffs(hs ?? []);
    }
  };
  useEffect(() => { load(); }, [code]);

  const save = async () => {
    if (!squad) return;
    setSaving(true);
    await supabase.from("squads").update({
      name: squad.name, description: squad.description, triggers: squad.triggers,
      response_max_chars: squad.response_max_chars, auto_run: squad.auto_run, pipeline_file: squad.pipeline_file,
    }).eq("id", squad.id);
    setSaving(false);
    toast.success("Salvo!");
  };

  const trigger = async () => {
    if (!squad || !agents.length) return;
    const { data: run } = await supabase.from("runs").insert({
      agent_id: agents[0].id, squad_id: squad.id, status: "running",
      step_current: 1, step_total: agents.length, step_label: agents[0].role,
      pipeline_file: squad.pipeline_file,
    }).select().single();
    if (run) toast.success("Squad executado (demo)");
    load();
  };

  if (!squad) return <div className="p-8 text-sm text-muted-foreground">Carregando...</div>;

  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const triggerArr: string[] = squad.triggers ?? [];

  return (
    <div>
      <PageHeader
        title={squad.name}
        description={squad.description || "Sem descrição."}
        actions={
          <>
            <Link to="/squads"><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar</Button></Link>
            <StatusBadge status={squad.status} />
            <Button size="sm" onClick={trigger} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
              <Play className="mr-1 h-3.5 w-3.5" /> Executar
            </Button>
          </>
        }
      />

      <div className="p-6">
        <Tabs defaultValue="pipeline">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="agents">Agentes</TabsTrigger>
            <TabsTrigger value="triggers">Triggers</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
            <TabsTrigger value="config">Configuração</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-4">
            <Card className="border-border bg-card/50 p-4">
              <h3 className="mb-3 text-sm font-semibold">Fluxo de handoffs</h3>
              <div className="flex flex-wrap items-center gap-2">
                {agents.map((a, i) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <div className="flex flex-col items-center rounded-md border border-border bg-secondary/40 px-3 py-2">
                      <span className="text-[10px] uppercase text-muted-foreground">Step {i + 1}</span>
                      <span className="text-sm font-semibold">{a.name}</span>
                      <span className="text-[10px] text-muted-foreground">{a.role}</span>
                    </div>
                    {i < agents.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                ))}
                {agents.length === 0 && <span className="text-xs text-muted-foreground">Adicione agentes para montar o pipeline.</span>}
              </div>
            </Card>

            {handoffs.length > 0 && (
              <Card className="border-border bg-card/50 p-4">
                <h3 className="mb-3 text-sm font-semibold">Últimos handoffs</h3>
                <div className="space-y-1.5">
                  {handoffs.slice(0, 8).map((h) => (
                    <div key={h.id} className="flex items-center gap-2 rounded-md border border-border/50 bg-secondary/30 px-3 py-2 text-xs">
                      <span className="font-medium">{agentMap.get(h.from_agent)?.name ?? "—"}</span>
                      <ArrowRight className="h-3 w-3 text-primary" />
                      <span className="font-medium">{agentMap.get(h.to_agent)?.name ?? "—"}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground">
                        {h.completed_at ? formatDistanceToNow(new Date(h.completed_at), { locale: ptBR, addSuffix: true }) : "pendente"}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="agents" className="space-y-3">
            <div className="flex justify-end">
              <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as any)} size="sm">
                <ToggleGroupItem value="office" className="h-8"><LayoutGrid className="h-3.5 w-3.5" /></ToggleGroupItem>
                <ToggleGroupItem value="list" className="h-8"><ListIcon className="h-3.5 w-3.5" /></ToggleGroupItem>
              </ToggleGroup>
            </div>
            {view === "office" ? (
              <SquadOfficeView agents={agents} />
            ) : (
              <Card className="border-border bg-card/50 divide-y divide-border">
                {agents.map((a) => (
                  <Link key={a.id} to={`/agents/${a.id}`} className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-secondary/40">
                    <div>
                      <div className="text-sm font-medium">{a.name}</div>
                      <div className="text-[11px] text-muted-foreground">{a.role}</div>
                    </div>
                    <StatusBadge status={a.status} />
                  </Link>
                ))}
                {agents.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">Sem agentes.</div>}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="triggers" className="space-y-3">
            <Card className="border-border bg-card/50 p-4">
              <h3 className="mb-2 text-sm font-semibold">Palavras-gatilho do WhatsApp</h3>
              <p className="mb-3 text-xs text-muted-foreground">Quando uma mensagem contém qualquer um destes termos, este squad é disparado.</p>
              <div className="flex flex-wrap gap-1.5">
                {triggerArr.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs">
                    <Hash className="h-3 w-3 text-primary" /> {t}
                  </span>
                ))}
                {triggerArr.length === 0 && <span className="text-xs text-muted-foreground">Nenhum trigger configurado.</span>}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="runs">
            <Card className="border-border bg-card/50 divide-y divide-border">
              {runs.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">Sem execuções.</div>}
              {runs.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    <span className="font-mono text-[11px] text-muted-foreground">{r.id.slice(0, 8)}</span>
                    <span className="text-[11px] text-muted-foreground">step {r.step_current}/{r.step_total}</span>
                    {r.step_label && <span className="text-[11px]">{r.step_label}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>${Number(r.cost).toFixed(4)}</span>
                    <span>{formatDistanceToNow(new Date(r.started_at), { locale: ptBR, addSuffix: true })}</span>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="config">
            <Card className="space-y-3 border-border bg-card/50 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome</Label>
                  <Input value={squad.name} onChange={(e) => setSquad({ ...squad, name: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Pipeline file</Label>
                  <Input value={squad.pipeline_file ?? ""} onChange={(e) => setSquad({ ...squad, pipeline_file: e.target.value })} className="h-9 font-mono text-xs" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Textarea value={squad.description ?? ""} onChange={(e) => setSquad({ ...squad, description: e.target.value })} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Triggers (separados por vírgula)</Label>
                <Input
                  value={(squad.triggers ?? []).join(", ")}
                  onChange={(e) => setSquad({ ...squad, triggers: e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean) })}
                  className="h-9"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Resposta max chars</Label>
                  <Input
                    type="number"
                    value={squad.response_max_chars}
                    onChange={(e) => setSquad({ ...squad, response_max_chars: Number(e.target.value) })}
                    className="h-9"
                  />
                </div>
                <div className="flex items-end gap-3">
                  <Switch checked={squad.auto_run} onCheckedChange={(v) => setSquad({ ...squad, auto_run: v })} />
                  <Label className="text-xs">Auto-run quando trigger é detectado</Label>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={save} disabled={saving} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
                  <Save className="mr-1 h-3.5 w-3.5" /> {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
