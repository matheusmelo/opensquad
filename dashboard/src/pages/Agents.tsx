import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, MoreVertical, Pause, Play, Copy, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NewAgentDialog } from "@/components/NewAgentDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Agents() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: agentsData } = await supabase.from("agents").select("*").order("created_at", { ascending: false });
    if (!agentsData) { setLoading(false); return; }
    // fetch skills counts and last run
    const ids = agentsData.map((a) => a.id);
    const [{ data: skills }, { data: runs }] = await Promise.all([
      supabase.from("agent_skills").select("agent_id, enabled").in("agent_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabase.from("runs").select("agent_id, status, started_at").in("agent_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).order("started_at", { ascending: false }),
    ]);
    const skillCount: Record<string, number> = {};
    (skills ?? []).forEach((s) => { if (s.enabled) skillCount[s.agent_id] = (skillCount[s.agent_id] ?? 0) + 1; });
    const lastRun: Record<string, string> = {};
    const successRate: Record<string, { ok: number; total: number }> = {};
    (runs ?? []).forEach((r) => {
      if (!lastRun[r.agent_id]) lastRun[r.agent_id] = r.started_at;
      const s = (successRate[r.agent_id] ??= { ok: 0, total: 0 });
      s.total++; if (r.status === "success") s.ok++;
    });
    setAgents(agentsData.map((a) => ({
      ...a,
      skills_count: skillCount[a.id] ?? 0,
      last_run: lastRun[a.id],
      success_rate: successRate[a.id] ? Math.round((successRate[a.id].ok / successRate[a.id].total) * 100) : null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (a: any) => {
    const next = a.status === "checkpoint" ? "idle" : "checkpoint";
    await supabase.from("agents").update({ status: next }).eq("id", a.id);
    toast.success(`Agente ${next === "idle" ? "ativado" : "pausado"}`);
    load();
  };

  const duplicate = async (a: any) => {
    const { id, created_at, updated_at, skills_count, last_run, success_rate, ...rest } = a;
    await supabase.from("agents").insert({ ...rest, name: `${a.name} (cópia)`, status: "idle" });
    toast.success("Agente duplicado");
    load();
  };

  const remove = async (a: any) => {
    if (!confirm(`Excluir "${a.name}"?`)) return;
    await supabase.from("agents").delete().eq("id", a.id);
    toast.success("Excluído");
    load();
  };

  const filtered = agents.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Agentes"
        description="Gerencie todos os agentes do seu digital office."
        actions={
          <Button size="sm" onClick={() => setOpen(true)} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90">
            <Plus className="mr-1 h-3.5 w-3.5" /> Novo agente
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar agentes..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8" />
        </div>

        <Card className="border-border bg-card/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">Modelo</TableHead>
                <TableHead className="text-xs">Skills</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Sucesso</TableHead>
                <TableHead className="text-xs">Última execução</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">Carregando...</TableCell></TableRow>}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">Nenhum agente. Clique em "Novo agente" para criar.</TableCell></TableRow>
              )}
              {filtered.map((a) => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer border-border"
                  onClick={() => navigate(`/agents/${a.id}`)}
                >
                  <TableCell className="py-2.5">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{a.name}</span>
                      {a.description && <span className="text-[11px] text-muted-foreground line-clamp-1">{a.description}</span>}
                    </div>
                  </TableCell>
                  <TableCell><span className="font-mono text-[11px] text-muted-foreground">{a.model}</span></TableCell>
                  <TableCell className="text-xs">{a.skills_count}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell className="text-xs">{a.success_rate !== null ? `${a.success_rate}%` : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.last_run ? formatDistanceToNow(new Date(a.last_run), { locale: ptBR, addSuffix: true }) : "—"}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/agents/${a.id}`)}><Pencil className="mr-2 h-3.5 w-3.5" /> Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(a)}>
                          {a.status === "checkpoint" ? <><Play className="mr-2 h-3.5 w-3.5" /> Ativar</> : <><Pause className="mr-2 h-3.5 w-3.5" /> Pausar</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicate(a)}><Copy className="mr-2 h-3.5 w-3.5" /> Duplicar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => remove(a)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <NewAgentDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </div>
  );
}
