import { PieChart as PieIcon } from 'lucide-react';
import { brl, type Bucket } from '../lib/api';

interface CategoryBreakdownProps {
    categorias: Bucket[];
    barClass: string;
    title?: string;
    onSelect?: (categoria: string) => void;
}

export function CategoryBreakdown({ categorias, barClass, title = 'Por categoria', onSelect }: CategoryBreakdownProps) {
    const max = categorias[0]?.total || 1;
    const total = categorias.reduce((acc, c) => acc + c.total, 0) || 1;

    return (
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 shadow-xl border border-zinc-800 flex flex-col w-full">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <span className="p-2 rounded-md bg-zinc-800"><PieIcon size={20} className="text-zinc-300" /></span>
                {title}
            </h3>
            {categorias.length === 0 ? (
                <div className="text-zinc-500 text-sm py-6 text-center">Nada neste mês.</div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {categorias.map((c) => (
                        <li key={c.key}>
                            <button
                                onClick={() => onSelect?.(c.key)}
                                disabled={!onSelect}
                                className="w-full text-left group disabled:cursor-default"
                            >
                                <div className="flex justify-between gap-3 text-sm mb-1">
                                    <span className="text-zinc-300 truncate group-hover:text-white">{c.key}</span>
                                    <span className="text-zinc-400 tabular-nums whitespace-nowrap">
                                        {brl(c.total)} <span className="text-zinc-600">· {((c.total / total) * 100).toFixed(0)}%</span>
                                    </span>
                                </div>
                                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                    <div className={`h-1.5 rounded-full ${barClass}`} style={{ width: `${(c.total / max) * 100}%` }}></div>
                                </div>
                                <div className="text-xs text-zinc-600 mt-0.5">{c.count} lançamento{c.count === 1 ? '' : 's'}</div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
