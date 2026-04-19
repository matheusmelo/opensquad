import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  name: string;
  role?: string | null;
  status: string;
  desk_col?: number | null;
  desk_row?: number | null;
  gender?: string | null;
}

const STATUS_RING: Record<string, string> = {
  idle: "ring-muted-foreground/30",
  working: "ring-info shadow-[0_0_24px_hsl(var(--info)/0.5)]",
  delivering: "ring-primary shadow-[0_0_24px_hsl(var(--primary)/0.6)]",
  done: "ring-success",
  checkpoint: "ring-warning",
};

const STATUS_DOT: Record<string, string> = {
  idle: "bg-muted-foreground",
  working: "bg-info animate-pulse-glow",
  delivering: "bg-primary animate-pulse-glow",
  done: "bg-success",
  checkpoint: "bg-warning",
};

export const SquadOfficeView = ({ agents }: { agents: Agent[] }) => {
  if (!agents.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
        Sem agentes neste squad.
      </div>
    );
  }
  const cols = Math.max(2, ...agents.map((a) => (a.desk_col ?? 0) + 1));
  const rows = Math.max(2, ...agents.map((a) => (a.desk_row ?? 0) + 1));

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-background to-secondary/30 p-6">
      {/* floor grid */}
      <div
        className="grid gap-6"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: rows }).flatMap((_, r) =>
          Array.from({ length: cols }).map((__, c) => {
            const agent = agents.find((a) => (a.desk_col ?? 0) === c && (a.desk_row ?? 0) === r);
            return (
              <div key={`${r}-${c}`} className="flex flex-col items-center justify-center gap-2">
                {agent ? (
                  <>
                    {/* Desk */}
                    <div className="relative">
                      <div className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-full bg-card ring-2 transition-all",
                        STATUS_RING[agent.status] ?? STATUS_RING.idle,
                      )}>
                        <Bot className="h-6 w-6 text-foreground" />
                      </div>
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background",
                        STATUS_DOT[agent.status] ?? STATUS_DOT.idle,
                      )} />
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-semibold leading-tight">{agent.name}</div>
                      {agent.role && <div className="text-[10px] text-muted-foreground leading-tight">{agent.role}</div>}
                    </div>
                    {/* desk surface */}
                    <div className="h-1 w-16 rounded-full bg-border" />
                  </>
                ) : (
                  <div className="h-14 w-14 rounded-full border border-dashed border-border/40" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
