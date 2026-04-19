import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useSquadStore } from '../store/useSquadStore';
import { toast } from 'sonner';

export function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const feed = useSquadStore((s) => s.activityFeed);
    const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());

    // Derive notifications from feed
    const notifs = feed.filter(f => ['TASK_STARTED', 'TASK_COMPLETED', 'TASK_FAILED'].includes(f.type));

    useEffect(() => {
        if (notifs.length > 0) {
            const latest = notifs[0];
            if (!unreadIds.has(latest.id)) {
                setUnreadIds(prev => new Set(prev).add(latest.id));

                // Sonner toast
                if (latest.type === 'TASK_STARTED') toast.info(`${latest.agentId} iniciou a task.`);
                if (latest.type === 'TASK_COMPLETED') toast.success(`${latest.agentId} concluiu workflow!`);
                if (latest.type === 'TASK_FAILED') toast.error(`${latest.agentId} falhou: ${latest.message}`);
            }
        }
    }, [notifs]);

    return (
        <div className="relative">
            <button onClick={() => setOpen(!open)} className="p-2 hover:bg-zinc-800 rounded-full relative transition">
                <Bell size={20} className="text-zinc-400 hover:text-zinc-100 transition-colors" />
                {unreadIds.size > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-zinc-900 rounded-full animate-pulse" />}
            </button>

            {open && (
                <div className="absolute top-12 right-0 w-80 bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl shadow-black overflow-hidden z-50">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/20 backdrop-blur">
                        <span className="font-semibold text-sm text-zinc-100">Notificações</span>
                        <button onClick={() => setUnreadIds(new Set())} className="text-[10px] text-zinc-400 hover:text-white uppercase tracking-wider font-bold">Lidas</button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {notifs.slice(0, 20).map(n => (
                            <div key={n.id} className={`p-4 border-b border-zinc-800/40 text-xs transition-colors ${unreadIds.has(n.id) ? 'bg-zinc-800/80' : 'hover:bg-zinc-800/40'}`}>
                                <div className="flex gap-2 mb-1.5 items-center">
                                    <span className={`font-bold ${n.type === 'TASK_FAILED' ? 'text-red-400' : 'text-emerald-400'}`}>{n.agentId}</span>
                                    <span className="text-zinc-500 ml-auto font-mono text-[10px]">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="text-zinc-300">{n.type.replace('_', ' ')}</div>
                            </div>
                        ))}
                        {notifs.length === 0 && <div className="p-6 text-center text-zinc-500 text-xs italic">Tudo silencioso por enquanto.</div>}
                    </div>
                </div>
            )}
        </div>
    );
}
