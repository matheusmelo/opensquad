import { useEffect, useRef } from 'react';
import { useAgentTimeline } from '../hooks/useAgentTimeline';
import { formatDistanceToNow } from 'date-fns';

const ICON: Record<string, string> = {
    TASK_STARTED: '▶️',
    FILE_READ: '📖',
    FILE_WRITE: '✏️',
    TOOL_CALL: '🔧',
    AI_CALL: '🧠',
    TASK_COMPLETED: '✅',
    TASK_FAILED: '❌',
    MESSAGE: '💬',
};

export function AgentTimeline({ agentId }: { agentId: string }) {
    const { events: timeline, loading, error } = useAgentTimeline(agentId);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [timeline]);

    if (loading) {
        return (
            <div className="flex flex-col gap-3 p-4 overflow-y-auto h-full text-sm bg-zinc-950 text-zinc-300">
                <h2 className="text-lg font-medium text-emerald-400 mb-2">Timeline: {agentId}</h2>
                <div className="text-zinc-500">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col gap-3 p-4 overflow-y-auto h-full text-sm bg-zinc-950 text-zinc-300">
                <h2 className="text-lg font-medium text-emerald-400 mb-2">Timeline: {agentId}</h2>
                <div className="text-red-400">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 p-4 overflow-y-auto h-full text-sm bg-zinc-950 text-zinc-300">
            <h2 className="text-lg font-medium text-emerald-400 mb-2">Timeline: {agentId}</h2>
            {timeline.map((event) => (
                <div key={event.id} className="flex gap-3">
                    <div className="text-xl shrink-0">{ICON[event.type] || '⚡'}</div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-zinc-100 font-medium">{event.type}</span>
                        <span className="text-xs text-zinc-500">{formatDistanceToNow(new Date(event.timestamp))} ago</span>
                        {(event.filePath || event.toolName || event.message) && (
                            <span className="text-xs text-zinc-400 mt-1 break-all">
                                {event.filePath || event.toolName || event.message}
                            </span>
                        )}
                        {event.payloadJson && (
                            <details className="mt-1 cursor-pointer">
                                <summary className="text-xs text-zinc-600 hover:text-zinc-400">Payload Json</summary>
                                <pre className="text-[10px] text-zinc-500 bg-zinc-900 p-2 rounded mt-1 overflow-x-auto">
                                    {JSON.stringify(JSON.parse(event.payloadJson), null, 2)}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            ))}
            <div ref={endRef} />
        </div>
    );
}
