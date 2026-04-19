import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("pwa-dismissed") === "1");

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const install = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem("pwa-dismissed", "1");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-emerald-800/50 bg-zinc-900/95 backdrop-blur px-4 py-3 shadow-2xl shadow-black/40 max-w-sm animate-in slide-in-from-bottom-5">
      <Download className="h-5 w-5 text-emerald-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100">Install OpenSquad</p>
        <p className="text-xs text-zinc-400">Access your virtual office from the home screen</p>
      </div>
      <Button size="sm" onClick={install}>Install</Button>
      <button onClick={dismiss} className="text-zinc-500 hover:text-zinc-300 transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
