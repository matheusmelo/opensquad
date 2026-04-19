
import { useMetrics } from '../hooks/useMetrics';
import { formatDistanceToNow } from 'date-fns';

export function FileTouchMap() {
    const { topFiles, loading } = useMetrics();

    if (loading) return null;

    return (
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
            <h3 className="text-zinc-300 font-medium mb-4 text-sm flex items-center gap-2">
                <span>🔥</span> Most Touched Files
            </h3>
            <div className="flex flex-col gap-2">
                {topFiles.slice(0, 10).map((file, i) => (
                    <div key={i} className="flex items-center gap-3 bg-zinc-950/50 p-2 rounded hover:bg-zinc-800 transition">
                        <span className="text-zinc-500">{file.filePath.endsWith('.ts') || file.filePath.endsWith('.tsx') ? '📝' : '📄'}</span>
                        <span className="font-mono text-xs text-zinc-300 flex-1 truncate">{file.filePath}</span>
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded-full shrink-0">
                            {file.touches} touches
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 shrink-0 w-24">
                            <span>{formatDistanceToNow(new Date(file.lastAt))}</span>
                        </div>
                    </div>
                ))}
                {topFiles.length === 0 && <p className="text-xs text-zinc-600 italic">Nenhum arquivo modificado recentemente.</p>}
            </div>
        </div>
    );
}
