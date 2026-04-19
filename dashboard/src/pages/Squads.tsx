import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Users, Cpu, Calendar, Sparkles, Hash, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";

const ICONS: Record<string, any> = { Users, Cpu, Calendar, Sparkles };

export default function Squads() {
  const { user } = useAuth();
  const [squads, setSquads] = useState<any[]>([]);
  const [agentCount, setAgentCount] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", description: "", triggers: "" });

  const load = async () => {
    const [{ data: sq }, { data: ag }] = await Promise.all([
      supabase.from("squads").select("*").order("created_at", { ascending: false }),
      supabase.from("agents").select("squad_id"),
    ]);
    setSquads(sq ?? []);
    const c: Record<string, number> = {};
    (ag ?? []).forEach((a: any) => { if (a.squad_id) c[a.squad_id] = (c[a.squad_id] ?? 0) + 1; });
    setAgentCount(c);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user || !form.code || !form.name) return;
    const { error } = await supabase.from("squads").insert({
      owner_id: user.id,
      code: form.code.toLowerCase().replace(/\s+/g, "-"),
      name: form.name,
      description: form.description,
      triggers: form.triggers.split(",").map((t) => t.trim()).filter(Boolean),
      icon: "Users",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Squad criado!");
    setForm({ code: "", name: "", description: "", triggers: "" });
    setOpen(false);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Squads"
        description="Times de agentes que executam pipelines completos."
        actions={
          <Button size="sm" onClick={() => setOpen(true)} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
            <Plus className="mr-1 h-3.5 w-3.5" /> Novo squad
          </Button>
        }
      />
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {squads.length === 0 && (
            <Card className="col-span-full border-dashed border-border bg-card/30 p-8 text-center text-sm text-muted-foreground">
              Nenhum squad ainda. Crie um para começar a orquestrar seus agentes.
            </Card>
          )}
          {squads.map((s) => {
            const Icon = ICONS[s.icon] ?? Users;
            return (
              <Link key={s.id} to={`/squads/${s.code}`}>
                <Card className="group cursor-pointer border-border bg-card/50 p-5 transition-all hover:border-primary/40 hover:bg-card/70">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary-glow/10 ring-1 ring-primary/20">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold leading-tight">{s.name}</h3>
                        <p className="font-mono text-[10px] text-muted-foreground">{s.code}</p>
                      </div>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(s.triggers ?? []).slice(0, 3).map((t: string) => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        <Hash className="h-2.5 w-2.5" />{t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px] text-muted-foreground">
                    <span>{agentCount[s.id] ?? 0} agentes</span>
                    <span className="flex items-center gap-1 text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      <Play className="h-3 w-3" /> Abrir
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo squad</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="ex: marketing-squad" className="h-9 font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Marketing Squad" className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Triggers WhatsApp (separados por vírgula)</Label>
              <Input value={form.triggers} onChange={(e) => setForm({ ...form, triggers: e.target.value })} placeholder="marketing, post, campanha" className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={create} disabled={!form.code || !form.name} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">Criar squad</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
