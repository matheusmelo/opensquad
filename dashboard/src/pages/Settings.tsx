import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("id", user.id).single().then(({ data }) => {
      setDisplayName(data?.display_name ?? "");
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
    setSaving(false);
    toast.success("Perfil atualizado!");
  };

  return (
    <div>
      <PageHeader title="Configurações" description="Gerencie sua conta e preferências." />
      <div className="max-w-2xl space-y-4 p-6">
        <Card className="border-border bg-card/50 p-5">
          <h3 className="mb-3 text-sm font-semibold">Perfil</h3>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={user?.email ?? ""} disabled className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nome de exibição</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-9" />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={save} disabled={saving} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="border-border bg-card/50 p-5">
          <h3 className="mb-1 text-sm font-semibold">Equipe</h3>
          <p className="text-xs text-muted-foreground">Convide membros para colaborar no seu digital office. (em breve)</p>
        </Card>

        <Card className="border-border bg-card/50 p-5">
          <h3 className="mb-1 text-sm font-semibold">Chaves de API</h3>
          <p className="text-xs text-muted-foreground">Gerencie chaves para integrar OpenSquad em outras aplicações. (em breve)</p>
        </Card>
      </div>
    </div>
  );
}
