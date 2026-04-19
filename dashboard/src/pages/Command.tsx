import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Send, Sparkles, ExternalLink, Loader2, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtUsd } from "@/lib/aiModels";

type Squad = { id: string; code: string; name: string; description: string | null; triggers: string[]; icon: string | null };
type Run = { id: string; squad_id: string | null; status: string; step_current: number; step_total: number; step_label: string | null; cost: number; started_at: string };

// Web Speech API types (não vem nativo do TS)
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function Command() {
  const { user } = useAuth();
  const [squads, setSquads] = useState<Squad[]>([]);
  const [prompt, setPrompt] = useState("");
  const [selectedSquad, setSelectedSquad] = useState<string>("");
  const [autoDetected, setAutoDetected] = useState<Squad | null>(null);
  const [sending, setSending] = useState(false);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const supportsVoice = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  // Carrega squads + últimos runs
  const loadRuns = async () => {
    const { data } = await supabase
      .from("runs").select("*")
      .order("started_at", { ascending: false }).limit(8);
    setRecentRuns((data ?? []) as Run[]);
  };
  useEffect(() => {
    supabase.from("squads").select("*").order("name").then(({ data }) => setSquads((data ?? []) as Squad[]));
    loadRuns();
  }, []);

  // Realtime updates de runs
  useEffect(() => {
    const ch = supabase
      .channel("command-runs")
      .on("postgres_changes", { event: "*", schema: "public", table: "runs" }, () => loadRuns())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Auto-detecta squad baseado em triggers no prompt
  useEffect(() => {
    if (!prompt.trim()) { setAutoDetected(null); return; }
    const lower = prompt.toLowerCase();
    const match = squads.find((s) => s.triggers?.some((t) => t && lower.includes(t.toLowerCase())));
    setAutoDetected(match ?? null);
    if (match && !selectedSquad) setSelectedSquad(match.id);
  }, [prompt, squads, selectedSquad]);

  // Voz: Web Speech API
  const toggleMic = () => {
    if (!supportsVoice) {
      toast.error("Seu navegador não suporta reconhecimento de voz. Use Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;

    let finalText = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setPrompt((prev) => {
        // Substitui tudo o que veio depois do baseline (simples: troca prompt inteiro)
        return (finalText + interim).trim();
      });
    };
    rec.onerror = (e: any) => { toast.error(`Voz: ${e.error}`); setListening(false); };
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };

  const send = async () => {
    if (!user) return;
    if (!prompt.trim()) { toast.error("Digite um comando"); return; }
    const squadId = selectedSquad || autoDetected?.id;
    if (!squadId) { toast.error("Selecione um squad ou use uma palavra-gatilho"); return; }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("orchestrate", {
        body: { squadId, prompt },
      });
      if (error) throw error;
      toast.success("Pipeline iniciado", { description: `Run ${(data as any)?.runId?.slice(0, 8)}…` });
      setPrompt("");
      loadRuns();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao iniciar pipeline");
    } finally {
      setSending(false);
    }
  };

  const squadById = (id: string | null) => squads.find((s) => s.id === id);

  return (
    <div>
      <PageHeader
        title="Comando"
        description="Envie comandos por texto ou voz. O orquestrador identifica o squad e dispara o pipeline."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Coluna principal: prompt */}
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Novo comando</span>
            {autoDetected && (
              <Badge variant="secondary" className="ml-auto text-[10px]">
                Detectado: {autoDetected.name}
              </Badge>
            )}
          </div>

          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Ex: "shlomo, processe o PDF de relatório financeiro Q3 e gere um dashboard"'
            className="min-h-[140px] resize-none border-border/60 bg-background/40 text-sm"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={selectedSquad}
              onChange={(e) => setSelectedSquad(e.target.value)}
              className="h-9 rounded-md border border-border/60 bg-background/40 px-2 text-xs"
            >
              <option value="">— auto-detectar squad —</option>
              {squads.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <Button
              size="sm"
              variant={listening ? "destructive" : "outline"}
              onClick={toggleMic}
              disabled={!supportsVoice}
              title={supportsVoice ? "Falar (PT-BR)" : "Web Speech API não disponível"}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {listening ? "Ouvindo…" : "Falar"}
            </Button>

            <div className="flex-1" />

            <Button
              size="sm"
              onClick={send}
              disabled={sending || !prompt.trim()}
              className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Disparar pipeline
            </Button>
          </div>

          {!supportsVoice && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Reconhecimento de voz só funciona em Chromium (Chrome, Edge, Brave).
            </p>
          )}
        </Card>

        {/* Sidebar: squads e triggers */}
        <Card className="p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Squads disponíveis
          </div>
          <div className="space-y-2">
            {squads.map((s) => (
              <Link
                key={s.id}
                to={`/squads/${s.code}`}
                className="block rounded-md border border-border/40 bg-background/30 p-2.5 text-xs transition-colors hover:bg-accent/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.name}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
                {s.triggers?.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {s.triggers.slice(0, 4).map((t) => (
                      <span key={t} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
            {squads.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum squad cadastrado ainda.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Execuções recentes */}
      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Execuções recentes</h2>
        </div>
        <Card className="divide-y divide-border/40">
          {recentRuns.length === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhuma execução ainda. Envie seu primeiro comando acima.
            </div>
          )}
          {recentRuns.map((r) => {
            const sq = squadById(r.squad_id);
            const pct = r.step_total > 0 ? (r.step_current / r.step_total) * 100 : 0;
            return (
              <div key={r.id} className="flex items-center gap-3 p-3 text-xs">
                <StatusBadge status={r.status as any} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sq?.name ?? "—"}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{r.step_label ?? "…"}</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[11px]">{fmtUsd(Number(r.cost ?? 0), 5)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {r.step_current}/{r.step_total}
                  </div>
                </div>
                <Link to="/runs" className="text-primary hover:underline">ver</Link>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
