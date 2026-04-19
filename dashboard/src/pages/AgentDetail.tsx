import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Save, Sparkles, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const MODELS = ["google/gemini-2.5-flash", "google/gemini-2.5-pro", "openai/gpt-5", "openai/gpt-5-mini", "openai/gpt-5-nano"];

export default function AgentDetail() {
  const { id } = useParams();
  const [agent, setAgent] = useState<any>(null);
  const [agentSkills, setAgentSkills] = useState<any[]>([]);
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    const [{ data: a }, { data: as }, { data: skills }, { data: rs }] = await Promise.all([
      supabase.from("agents").select("*").eq("id", id).single(),
      supabase.from("agent_skills").select("*, skills(*)").eq("agent_id", id),
      supabase.from("skills").select("*").or("is_custom.eq.false"),
      supabase.from("runs").select("*").eq("agent_id", id).order("started_at", { ascending: false }).limit(50),
    ]);
    setAgent(a);
    setAgentSkills(as ?? []);
    setAllSkills(skills ?? []);
    setRuns(rs ?? []);
    if (rs && rs.length) {
      const { data: lg } = await supabase.from("run_logs").select("*").in("run_id", rs.slice(0, 5).map((r) => r.id)).order("ts", { ascending: false }).limit(50);
      setLogs(lg ?? []);
    }
  };

  useEffect(() => { load(); }, [id]);

  const save = async () => {
    setSaving(true);
    await supabase.from("agents").update({
      name: agent.name, description: agent.description, model: agent.model,
      system_prompt: agent.system_prompt, params: agent.params, status: agent.status,
    }).eq("id", id);
    setSaving(false);
    toast.success("Salvo!");
  };

  const toggleSkill = async (skillId: string, enabled: boolean) => {
    const existing = agentSkills.find((as) => as.skill_id === skillId);
    if (existing) {
      await supabase.from("agent_skills").update({ enabled }).eq("id", existing.id);
    } else {
      await supabase.from("agent_skills").insert({ agent_id: id, skill_id: skillId, enabled });
    }
    load();
  };

  if (!agent) return <div className="p-8 text-sm text-muted-foreground">Carregando...</div>;

  const enabledSkillIds = new Set(agentSkills.filter((as) => as.enabled).map((as) => as.skill_id));

  return (
    <div>
      <PageHeader
        title={agent.name}
        description={agent.description || "Sem descrição."}
        actions={
          <>
            <Link to="/agents"><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar</Button></Link>
            <StatusBadge status={agent.status} />
          </>
        }
      />

      <div className="p-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="runs">Execuções</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Total runs", value: runs.length },
                { label: "Sucesso", value: `${runs.length ? Math.round(runs.filter((r) => r.status === "success").length / runs.length * 100) : 0}%` },
                { label: "Tokens", value: runs.reduce((s, r) => s + (r.tokens_in ?? 0) + (r.tokens_out ?? 0), 0).toLocaleString() },
                { label: "Custo", value: `$${runs.reduce((s, r) => s + Number(r.cost ?? 0), 0).toFixed(4)}` },
              ].map((k) => (
                <Card key={k.label} className="border-border bg-card/50 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
                  <div className="mt-1 text-lg font-semibold">{k.value}</div>
                </Card>
              ))}
            </div>
            <Card className="border-border bg-card/50 p-4">
              <h3 className="mb-2 text-sm font-semibold">Skills ativas</h3>
              <div className="flex flex-wrap gap-1.5">
                {agentSkills.filter((as) => as.enabled).map((as) => (
                  <span key={as.id} className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-xs">
                    <Sparkles className="h-3 w-3 text-primary" /> {as.skills?.name}
                  </span>
                ))}
                {agentSkills.filter((as) => as.enabled).length === 0 && <span className="text-xs text-muted-foreground">Nenhuma skill ativa.</span>}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Card className="space-y-3 border-border bg-card/50 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome</Label>
                  <Input value={agent.name} onChange={(e) => setAgent({ ...agent, name: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Modelo</Label>
                  <Select value={agent.model} onValueChange={(v) => setAgent({ ...agent, model: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>{MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Textarea value={agent.description ?? ""} onChange={(e) => setAgent({ ...agent, description: e.target.value })} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prompt de sistema</Label>
                <Textarea value={agent.system_prompt ?? ""} onChange={(e) => setAgent({ ...agent, system_prompt: e.target.value })} rows={6} className="font-mono text-xs" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><Label>Temperatura</Label><span className="font-mono text-muted-foreground">{(agent.params?.temperature ?? 0.7).toFixed(2)}</span></div>
                  <Slider value={[agent.params?.temperature ?? 0.7]} onValueChange={(v) => setAgent({ ...agent, params: { ...agent.params, temperature: v[0] } })} min={0} max={2} step={0.05} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><Label>Max tokens</Label><span className="font-mono text-muted-foreground">{agent.params?.max_tokens ?? 2048}</span></div>
                  <Slider value={[agent.params?.max_tokens ?? 2048]} onValueChange={(v) => setAgent({ ...agent, params: { ...agent.params, max_tokens: v[0] } })} min={256} max={8192} step={128} />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={save} disabled={saving} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
                  <Save className="mr-1 h-3.5 w-3.5" /> {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="skills" className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setSkillModalOpen(true)} variant="outline">
                <Plus className="mr-1 h-3.5 w-3.5" /> Ativar nova skill
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {allSkills.map((s) => {
                const enabled = enabledSkillIds.has(s.id);
                return (
                  <Card key={s.id} className="flex items-center justify-between border-border bg-card/50 p-3">
                    <div>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground">{s.description}</div>
                    </div>
                    <Switch checked={enabled} onCheckedChange={(v) => toggleSkill(s.id, v)} />
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="runs">
            <Card className="border-border bg-card/50 divide-y divide-border">
              {runs.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">Sem execuções.</div>}
              {runs.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    <span className="font-mono text-[11px] text-muted-foreground">{r.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{r.tokens_in + r.tokens_out} tok</span>
                    <span>${Number(r.cost).toFixed(4)}</span>
                    <span>{formatDistanceToNow(new Date(r.started_at), { locale: ptBR, addSuffix: true })}</span>
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="border-border bg-card/50 p-3">
              <div className="font-mono space-y-0.5 text-[11px]">
                {logs.length === 0 && <div className="text-muted-foreground">Sem logs disponíveis.</div>}
                {logs.map((l) => (
                  <div key={l.id} className="flex gap-2">
                    <span className="text-muted-foreground">{new Date(l.ts).toLocaleTimeString()}</span>
                    <span className={l.level === "error" ? "text-destructive" : l.level === "warn" ? "text-warning" : "text-info"}>[{l.level}]</span>
                    <span>{l.message}</span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={skillModalOpen} onOpenChange={setSkillModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Catálogo de Skills</DialogTitle></DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto scrollbar-thin">
            {allSkills.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border border-border bg-secondary/30 p-2.5">
                <div>
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">{s.description}</div>
                </div>
                <Switch checked={enabledSkillIds.has(s.id)} onCheckedChange={(v) => toggleSkill(s.id, v)} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
