import { cn } from "@/lib/utils";

type Status =
  // legacy + run + task statuses
  | "active" | "paused" | "error" | "draft"
  | "queued" | "running" | "success" | "failed" | "cancelled"
  | "backlog" | "done"
  // new agent statuses
  | "idle" | "working" | "delivering" | "checkpoint";

const styles: Record<Status, string> = {
  active: "bg-success/15 text-success border-success/30",
  success: "bg-success/15 text-success border-success/30",
  done: "bg-success/15 text-success border-success/30",
  running: "bg-info/15 text-info border-info/30",
  working: "bg-info/15 text-info border-info/30",
  delivering: "bg-primary/15 text-primary border-primary/30",
  queued: "bg-info/10 text-info border-info/20",
  paused: "bg-warning/15 text-warning border-warning/30",
  checkpoint: "bg-warning/15 text-warning border-warning/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  draft: "bg-muted text-muted-foreground border-border",
  backlog: "bg-muted text-muted-foreground border-border",
  idle: "bg-muted text-muted-foreground border-border",
};

const labels: Record<Status, string> = {
  active: "Ativo", paused: "Pausado", error: "Erro", draft: "Rascunho",
  queued: "Em fila", running: "Executando", success: "Sucesso",
  failed: "Falhou", cancelled: "Cancelado", backlog: "Backlog", done: "Concluído",
  idle: "Idle", working: "Trabalhando", delivering: "Entregando", checkpoint: "Checkpoint",
};

export const StatusBadge = ({ status, className }: { status: string; className?: string }) => {
  const s = (status as Status) in styles ? (status as Status) : "idle";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
      styles[s],
      className,
    )}>
      {(s === "running" || s === "active" || s === "working" || s === "delivering") && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-glow" />
      )}
      {labels[s]}
    </span>
  );
};
