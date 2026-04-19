import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { useLiveAgents } from "@/hooks/useLiveAgents";
import { useSquadStore } from "@/store/useSquadStore";
import { Home, BarChart2, MessageSquare, Wallet, Bot, Search, Upload, Palette, Zap, Settings } from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { agents } = useLiveAgents();
  const setSelectedAgent = useSquadStore((s) => s.setSelectedAgent);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [toggle]);

  const go = (path: string) => { navigate(path); setOpen(false); };
  const selectAgent = (id: string) => { setSelectedAgent(id); navigate("/"); setOpen(false); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50 overflow-hidden">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-400 [&_[cmdk-group]]:px-2 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3">
          <div className="flex items-center border-b border-zinc-800 px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-zinc-500" />
            <Command.Input placeholder="Type a command or search..." className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50" />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-1 text-zinc-300">
            <Command.Empty className="py-6 text-center text-sm text-zinc-500">No results found.</Command.Empty>

            <Command.Group heading="Navigate">
              <Command.Item onSelect={() => go("/")} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800"><Home className="h-4 w-4" /> Virtual Office</Command.Item>
              <Command.Item onSelect={() => go("/metrics")} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800"><BarChart2 className="h-4 w-4" /> Metrics</Command.Item>
              <Command.Item onSelect={() => go("/transactions")} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800"><Wallet className="h-4 w-4" /> Transactions</Command.Item>
              <Command.Item onSelect={() => go("/whatsapp")} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800"><MessageSquare className="h-4 w-4" /> WhatsApp</Command.Item>
              <Command.Item onSelect={() => go("/upload")} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800"><Upload className="h-4 w-4" /> Upload PDF</Command.Item>
              <Command.Item onSelect={() => go("/settings")} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800"><Settings className="h-4 w-4" /> Settings</Command.Item>
            </Command.Group>

            {agents.length > 0 && (
              <Command.Group heading="Live Agents">
                {agents.map((a) => (
                  <Command.Item key={a.agentId} onSelect={() => selectAgent(a.agentId)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800">
                    <Bot className="h-4 w-4 text-emerald-400" /> {a.name} <span className="ml-auto text-xs text-zinc-500">{a.squadId}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Actions">
              <Command.Item onSelect={() => go("/upload")} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800"><Upload className="h-4 w-4" /> Upload PDF</Command.Item>
              <Command.Item className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800"><Zap className="h-4 w-4" /> Dispatch Squad</Command.Item>
              <Command.Item className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm cursor-pointer hover:bg-zinc-800 aria-selected:bg-zinc-800"><Palette className="h-4 w-4" /> Toggle Theme</Command.Item>
            </Command.Group>
          </Command.List>

          <div className="flex items-center justify-end border-t border-zinc-800 p-2 text-[10px] text-zinc-500">
            <kbd className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-zinc-400">↑↓</kbd>
            <span className="ml-1 mr-3">navigate</span>
            <kbd className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-zinc-400">↵</kbd>
            <span className="ml-1 mr-3">select</span>
            <kbd className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-zinc-400">esc</kbd>
            <span className="ml-1">close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
