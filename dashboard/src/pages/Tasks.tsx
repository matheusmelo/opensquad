import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, LayoutGrid, List as ListIcon, MessageSquare, Hash, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLUMNS: Array<{ key: any; label: string }> = [
  { key: "backlog", label: "Recebido" },
  { key: "queued", label: "Em fila" },
  { key: "running", label: "Processando" },
  { key: "done", label: "Respondido" },
  { key: "failed", label: "Falhou" },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-info",
  high: "text-warning",
  urgent: "text-destructive",
};

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [squads, setSquads] = useState<any[]>([]);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", agent_id: "", priority: "medium", from: "+55 11 9" });

  const load = async () => {
    const [{ data: t }, { data: a }, { data: s }] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("agents").select("id, name, squad_id"),
      supabase.from("squads").select("id, name, code, triggers"),
    ]);
    setTasks(t ?? []);
    setAgents(a ?? []);
    setSquads(s ?? []);
  };
  useEffect(() => { load(); }, []);

  // Detecta squad pelos triggers no título
  const detectSquad = (text: string) => {
    const lower = text.toLowerCase();
    return squads.find((s) => (s.triggers ?? []).some((t: string) => lower.includes(t.toLowerCase())));
  };

  const create = async () => {
    if (!user || !form.title) return;
    const matched = detectSquad(form.title + " " + form.description);
    await supabase.from("tasks").insert({
      created_by: user.id,
      title: form.title,
      description: form.description,
      agent_id: form.agent_id || null,
      priority: form.priority as any,
      status: matched ? "queued" : "backlog",
      payload: { from: form.from, channel: "whatsapp", matched_squad: matched?.code ?? null },
    });
    toast.success(matched ? `Squad ${matched.name} disparado` : "Mensagem na fila");
    setForm({ title: "", description: "", agent_id: "", priority: "medium", from: "+55 11 9" });
    setOpen(false);
    load();
  };

  const move = async (taskId: string, status: string) => {
    await supabase.from("tasks").update({ status: status as any }).eq("id", taskId);
    load();
  };

  const dispatch = async (taskId: string) => {
    await supabase.from("tasks").update({ status: "running" as any, progress: 10 }).eq("id", taskId);
    toast.success("Squad executando…");
    load();
  };

  const agentName = (id: string | null) => agents.find((a) => a.id === id)?.name ?? "—";
  const squadOf = (t: any) => squads.find((s) => s.code === t.payload?.matched_squad);

  return (
    <div>
      <PageHeader
        title="Fila WhatsApp"
        description="Mensagens recebidas, triagem por triggers e disparo de squads."
        actions={
          <>
            <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as any)} size="sm">
              <ToggleGroupItem value="kanban" className="h-8"><LayoutGrid className="h-3.5 w-3.5" /></ToggleGroupItem>
              <ToggleGroupItem value="list" className="h-8"><ListIcon className="h-3.5 w-3.5" /></ToggleGroupItem>
            </ToggleGroup>
            <Button size="sm" onClick={() => setOpen(true)} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
              <Plus className="mr-1 h-3.5 w-3.5" /> Simular mensagem
            </Button>
          </>
        }
      />

      <div className="p-6">
        {view === "kanban" ? (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            {COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.key);
              return (
                <div key={col.key} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-medium">{col.label}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{colTasks.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {colTasks.map((t) => {
                      const sq = squadOf(t);
                      return (
                        <Card key={t.id} className="border-border bg-card/60 p-3 hover:border-primary/30">
                          <div className="mb-1.5 flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <MessageSquare className="h-3 w-3 text-primary" />
                              <span className="font-mono">{t.payload?.from ?? "—"}</span>
                            </div>
                            <span className={`text-[10px] uppercase ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                          </div>
                          <h4 className="text-xs font-medium leading-snug">{t.title}</h4>
                          {t.description && <p className="line-clamp-2 mt-1 text-[11px] text-muted-foreground">{t.description}</p>}
                          {sq && (
                            <div className="mt-2 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                              <Hash className="h-2.5 w-2.5" />{sq.name}
                            </div>
                          )}
                          <div className="mt-2 flex items-center justify-between border-t border-border pt-1.5 text-[10px] text-muted-foreground">
                            <span>{formatDistanceToNow(new Date(t.created_at), { locale: ptBR, addSuffix: true })}</span>
                            {t.progress > 0 && <span>{t.progress}%</span>}
                          </div>
                          <div className="mt-2 flex gap-1">
                            <Select value={t.status} onValueChange={(v) => move(t.id, v)}>
                              <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                              <SelectContent>{COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                            </Select>
                            {t.status === "queued" && (
                              <Button size="sm" className="h-7 px-2" onClick={() => dispatch(t.id)}>
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                    {colTasks.length === 0 && <div className="rounded-md border border-dashed border-border py-4 text-center text-[11px] text-muted-foreground">Vazio</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="border-border bg-card/50 divide-y divide-border">
            {tasks.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">Sem mensagens.</div>}
            {tasks.map((t) => {
              const sq = squadOf(t);
              return (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 text-xs">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={t.status} />
                    <div>
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        <span className="font-mono">{t.payload?.from ?? "—"}</span>
                        {sq && <> · squad <span className="text-primary">{sq.name}</span></>}
                        {" · "}prioridade {t.priority}
                      </div>
                    </div>
                  </div>
                  <span className="text-muted-foreground">{formatDistanceToNow(new Date(t.created_at), { locale: ptBR, addSuffix: true })}</span>
                </div>
              );
            })}
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Simular mensagem WhatsApp</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone (de)</Label>
              <Input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className="h-9 font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mensagem</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="ex: shlomo processar nota fiscal" className="h-9" />
              <p className="text-[10px] text-muted-foreground">Triggers detectam o squad automaticamente.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contexto (opcional)</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={create} disabled={!form.title} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
