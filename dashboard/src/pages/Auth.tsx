import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate("/", { replace: true }); }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else navigate("/", { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: name },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Conta criada! Você já está logado.");
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow shadow-[0_0_30px_hsl(var(--primary)/0.4)]">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight">OpenSquad</span>
            <span className="text-[10px] text-muted-foreground">Digital Office</span>
          </div>
        </Link>

        <div className="rounded-xl border border-border bg-card/50 p-6 backdrop-blur-sm shadow-card">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="si-email" className="text-xs">Email</Label>
                  <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="si-password" className="text-xs">Senha</Label>
                  <Input id="si-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-9" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90">
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="su-name" className="text-xs">Nome</Label>
                  <Input id="su-name" required value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email" className="text-xs">Email</Label>
                  <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-password" className="text-xs">Senha</Label>
                  <Input id="su-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-9" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90">
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao continuar você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}
