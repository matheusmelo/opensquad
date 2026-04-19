import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "openai/gpt-5", label: "GPT-5" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano" },
];

export const NewAgentDialog = ({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated?: () => void }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([2048]);
  const [skills, setSkills] = useState<any[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("skills").select("id, name, description, icon").eq("is_custom", false).then(({ data }) => setSkills(data ?? []));
      setStep(1);
    }
  }, [open]);

  const reset = () => {
    setName(""); setDescription(""); setModel("google/gemini-2.5-flash");
    setSystemPrompt(""); setTemperature([0.7]); setMaxTokens([2048]);
    setSelectedSkills(new Set()); setStep(1);
  };

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase.from("agents").insert({
      owner_id: user.id, name, description, model, system_prompt: systemPrompt,
      params: { temperature: temperature[0], max_tokens: maxTokens[0] },
      status: "idle",
    }).select().single();
    if (error) { toast.error(error.message); setSaving(false); return; }
    if (selectedSkills.size > 0) {
      await supabase.from("agent_skills").insert(
        Array.from(selectedSkills).map((skill_id) => ({ agent_id: data.id, skill_id, enabled: true }))
      );
    }
    setSaving(false);
    toast.success("Agente criado!");
    reset();
    onOpenChange(false);
    onCreated?.();
  };

  const toggleSkill = (id: string) => {
    const next = new Set(selectedSkills);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedSkills(next);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Novo agente — Passo {step} de 4
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1">
          {[1,2,3,4].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Atlas — Sales Researcher" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="O que esse agente faz?" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Modelo</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Prompt de sistema</Label>
              <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={6} className="font-mono text-xs" placeholder="Você é um agente que..." />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <Label>Temperatura</Label><span className="font-mono text-muted-foreground">{temperature[0].toFixed(2)}</span>
              </div>
              <Slider value={temperature} onValueChange={setTemperature} min={0} max={2} step={0.05} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <Label>Max tokens</Label><span className="font-mono text-muted-foreground">{maxTokens[0]}</span>
              </div>
              <Slider value={maxTokens} onValueChange={setMaxTokens} min={256} max={8192} step={128} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Selecione as skills que esse agente pode usar.</p>
            <div className="max-h-72 space-y-1.5 overflow-y-auto scrollbar-thin">
              {skills.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border/50 bg-secondary/30 p-2.5 hover:bg-secondary/60">
                  <Checkbox checked={selectedSkills.has(s.id)} onCheckedChange={() => toggleSkill(s.id)} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs font-medium">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">{s.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 rounded-md border border-border bg-secondary/30 p-3 text-xs">
            <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{name}</span></div>
            <div><span className="text-muted-foreground">Modelo:</span> <span className="font-mono">{model}</span></div>
            <div><span className="text-muted-foreground">Temp:</span> {temperature[0]} · <span className="text-muted-foreground">Max tokens:</span> {maxTokens[0]}</div>
            <div><span className="text-muted-foreground">Skills:</span> {selectedSkills.size} ativadas</div>
            <div className="border-t border-border pt-2 text-muted-foreground">{description || "Sem descrição."}</div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>Voltar</Button>}
          {step < 4 ? (
            <Button size="sm" onClick={() => setStep(step + 1)} disabled={step === 1 && !name} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
              Avançar
            </Button>
          ) : (
            <Button size="sm" onClick={submit} disabled={saving} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
              {saving ? "Criando..." : "Criar agente"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
