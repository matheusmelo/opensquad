import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Globe, Mail, MessageSquare, Database, Terminal, Webhook, FileText, Calendar, Sparkles, Bot, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const ICONS: Record<string, any> = { Globe, Mail, MessageSquare, Database, Terminal, Webhook, FileText, Calendar, Sparkles, Bot };

type Filter = "all" | "official" | "custom";

export default function Skills() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<any[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    const [{ data: skillsData }, { data: links }] = await Promise.all([
      supabase.from("skills").select("*").order("created_at", { ascending: false }),
      supabase.from("agent_skills").select("skill_id"),
    ]);
    setSkills(skillsData ?? []);
    const u: Record<string, number> = {};
    (links ?? []).forEach((l) => { u[l.skill_id] = (u[l.skill_id] ?? 0) + 1; });
    setUsage(u);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user || !name) return;
    await supabase.from("skills").insert({ owner_id: user.id, name, description, is_custom: true, icon: "Sparkles" });
    toast.success("Skill criada!");
    setName(""); setDescription(""); setOpen(false); load();
  };

  // OpenSquad real catalog é inserido via seed como is_custom=true; tratamos como "oficial"
  // se o nome bate com a lista conhecida.
  const OFFICIAL_NAMES = useMemo(() => new Set([
    "WhatsApp Integration", "Apify", "Resend", "Canva", "Image AI Generator",
    "Instagram Publisher", "Blotato", "OpenSquad Skill Creator", "OpenSquad Agent Creator", "PDF Parser",
  ]), []);

  const filtered = skills.filter((s) => {
    const isOfficial = OFFICIAL_NAMES.has(s.name);
    if (filter === "official" && !isOfficial) return false;
    if (filter === "custom" && isOfficial) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totals = {
    all: skills.length,
    official: skills.filter((s) => OFFICIAL_NAMES.has(s.name)).length,
    custom: skills.filter((s) => !OFFICIAL_NAMES.has(s.name)).length,
    inUse: skills.filter((s) => (usage[s.id] ?? 0) > 0).length,
  };

  return (
    <div>
      <PageHeader
        title="Skills"
        description="Catálogo OpenSquad de capacidades disponíveis para os agentes."
        actions={<Button size="sm" onClick={() => setOpen(true)} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"><Plus className="mr-1 h-3.5 w-3.5" /> Nova skill</Button>}
      />
      <div className="space-y-4 p-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total", value: totals.all },
            { label: "Oficiais", value: totals.official },
            { label: "Customizadas", value: totals.custom },
            { label: "Em uso", value: totals.inUse },
          ].map((k) => (
            <Card key={k.label} className="border-border bg-card/50 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="mt-1 text-lg font-semibold">{k.value}</div>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as Filter)} size="sm">
            <ToggleGroupItem value="all" className="h-8 px-3 text-xs">Todas</ToggleGroupItem>
            <ToggleGroupItem value="official" className="h-8 px-3 text-xs">Oficiais</ToggleGroupItem>
            <ToggleGroupItem value="custom" className="h-8 px-3 text-xs">Customizadas</ToggleGroupItem>
          </ToggleGroup>
          <div className="relative ml-auto">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar skill…" className="h-8 w-[220px] pl-7 text-xs" />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((s) => {
            const Icon = ICONS[s.icon] ?? Sparkles;
            const isOfficial = OFFICIAL_NAMES.has(s.name);
            const used = usage[s.id] ?? 0;
            return (
              <Card key={s.id} className="border-border bg-card/50 p-4 transition-colors hover:border-primary/30">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-primary/20 to-primary-glow/10 ring-1 ring-primary/20">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${isOfficial ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {isOfficial ? "Oficial" : "Custom"}
                  </span>
                </div>
                <h3 className="text-sm font-semibold">{s.name}</h3>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{s.description}</p>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                  <span className="text-[11px] text-muted-foreground">{used} {used === 1 ? "agente" : "agentes"}</span>
                  {used > 0 && <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />}
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card className="col-span-full border-dashed border-border bg-card/30 p-8 text-center text-xs text-muted-foreground">
              Nenhuma skill encontrada.
            </Card>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova skill customizada</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={create} disabled={!name} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
