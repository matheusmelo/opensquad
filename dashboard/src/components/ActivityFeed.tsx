import { useRef, useEffect } from 'react';
import { useSquadStore } from '../store/useSquadStore';
import { useActivityStream } from '../hooks/useActivityStream';

export function ActivityFeed() {
    const { events, connected } = useActivityStream(); // Mounts WS listener
    const feed = useSquadStore((s) => s.activityFeed); // Uses centralized feed if preferred
    const endRef = useRef<HTMLDivElement>(null);

    // Combines WS feed or uses store
    const displayFeed = events.length > 0 ? events : feed;

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [displayFeed]);

    const getColorBySquad = (id: string = '') => {
        let hash = 0;
        for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
        return `hsl(${Math.abs(hash) % 360}, 60%, 60%)`;
    };

    return (
        <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4 h-full flex flex-col font-mono text-xs overflow-hidden">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-zinc-800 shrink-0">
                <span className="text-zinc-300 font-sans font-medium text-sm">Activity Feed</span>
                <span className={`flex items-center gap-2 ${connected ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}></span>
                    {connected ? 'Live' : 'Offline'}
                </span>
            </div>
            <div className="overflow-y-auto flex-1 pr-2">
                {displayFeed.map((ev) => (
                    <div key={ev.id} className="py-1.5 flex gap-3 hover:bg-zinc-900 border-b border-zinc-900/50">
                        <span className="text-zinc-600 shrink-0">{new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                        <span className="shrink-0 font-bold" style={{ color: getColorBySquad(ev.squadId) }}>[{ev.squadId || 'sys'}]</span>
                        <span className="text-zinc-400 shrink-0 w-24 truncate">{ev.type}</span>
                        <span className="text-emerald-400 shrink-0 w-24 truncate">{ev.agentId || '-'}</span>
                        <span className="text-zinc-300 truncate">{ev.message || ev.filePath || ev.toolName || '-'}</span>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
}
