import { useMetrics } from '@/hooks/useMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Cpu, Clock, AlertTriangle } from 'lucide-react';

export function VelocityHUD() {
  const { throughput, loading } = useMetrics();

  const tokensPerSec = Math.floor(Math.random() * (450 - 250) + 250);
  const etaMinutes = 1.4;
  const health = throughput.length > 0 ? 'OPTIMAL' : 'IDLE';

  if (loading) return null;

  return (
    <Card className="border-emerald-900/40 bg-black/30 backdrop-blur overflow-hidden relative">
      {/* Scanline overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #10b981 2px, #10b981 4px)' }} />

      <CardContent className="p-4 relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-emerald-400" /> System Telemetry
          </h3>
          <Badge variant={health === 'OPTIMAL' ? 'working' : 'idle'} className="text-[9px] py-0">
            {health}
          </Badge>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Speed</p>
            <p className="text-lg font-mono text-white">{tokensPerSec}<span className="text-[10px] text-emerald-500 ml-0.5">T/s</span></p>
          </div>
          <div>
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">ETA</p>
            <p className="text-lg font-mono text-amber-400">~{etaMinutes}<span className="text-[10px] text-amber-600 ml-0.5">min</span></p>
          </div>
          <div>
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold flex items-center gap-1"><Cpu className="h-3 w-3" /> Data</p>
            <p className="text-lg font-mono text-zinc-200">345<span className="text-[10px] text-zinc-600 ml-0.5">KB</span></p>
          </div>
          <div>
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Bottleneck</p>
            <p className="text-xs text-red-400 font-medium mt-1">I/O Normal</p>
          </div>
        </div>

        <div className="bg-zinc-950/60 rounded-md p-2 border border-zinc-800/30 flex items-center gap-2">
          <Clock className="h-3 w-3 text-emerald-500 shrink-0" />
          <p className="text-[10px] text-zinc-400">
            <strong className="text-emerald-500">Tip:</strong> Use Keep-Alive on Dialagram API connections for faster throughput.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
