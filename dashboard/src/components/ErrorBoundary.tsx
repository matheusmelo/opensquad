import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-12 bg-zinc-950 text-center">
          <div className="rounded-2xl border border-red-800/50 bg-red-950/20 p-8 max-w-md space-y-4">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="text-lg font-bold text-zinc-100">Something went wrong</h2>
            <p className="text-sm text-zinc-400">{this.state.error?.message || "An unexpected error occurred"}</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Reload Page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
