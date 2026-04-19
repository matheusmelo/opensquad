

export function StatusDot({ status }: { status: 'idle' | 'working' | 'done' | 'failed' }) {
    const colors = {
        idle: 'bg-zinc-500',
        working: 'bg-emerald-400 animate-pulse',
        done: 'bg-blue-400',
        failed: 'bg-red-400',
    };
    return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
}
