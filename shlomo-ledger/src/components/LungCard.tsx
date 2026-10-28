import { ChevronRight } from 'lucide-react';
import { brl, type Bucket } from '../lib/api';
import type { PulmaoMeta } from '../lib/pulmoes';

interface LungCardProps {
    meta: PulmaoMeta;
    total: number;
    teto: number | null;
    count: number;
    categorias: Bucket[];
    onOpen: () => void;
}

export function LungCard({ meta, total, teto, count, categorias, onOpen }: LungCardProps) {
    const percentage = teto ? (total / teto) * 100 : null;
    const over = percentage !== null && percentage > 100;
    const Icon = meta.icon;

    return (
        <button
            onClick={onOpen}
            className={`text-left p-6 rounded-3xl flex flex-col justify-between border shadow-lg relative overflow-hidden bg-zinc-900 group hover:-translate-y-1 transition-all duration-300 ${meta.border}`}
        >
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40 ${meta.bar}`}></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${meta.chip}`}>
                            <Icon size={20} />
                        </div>
                        <h3 className="font-semibold text-zinc-200">{meta.titulo}</h3>
                    </div>
                    <ChevronRight size={18} className="text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </div>

                <div className="mt-4 flex items-end justify-between gap-2">
                    <div>
                        <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">Gasto no mês</div>
                        <div className={`text-3xl font-extrabold ${meta.text} tracking-tighter tabular-nums`}>{brl(total)}</div>
                        <div className="text-xs text-zinc-500 mt-1">{count} lançamento{count === 1 ? '' : 's'}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">Teto</div>
                        <div className="text-lg font-bold text-zinc-300 tracking-tighter tabular-nums">{teto ? brl(teto) : '—'}</div>
                    </div>
                </div>

                {categorias.length > 0 && (
                    <ul className="mt-5 flex flex-col gap-1.5 text-sm">
                        {categorias.slice(0, 3).map((c) => (
                            <li key={c.key} className="flex justify-between gap-2 text-zinc-400">
                                <span className="truncate">{c.key}</span>
                                <span className="tabular-nums text-zinc-300">{brl(c.total)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="mt-6 relative z-10">
                <div className="w-full bg-zinc-800 rounded-full h-2 shadow-inner overflow-hidden">
                    <div
                        className={`h-2 rounded-full transition-all duration-1000 ease-out ${over ? 'bg-red-500' : meta.bar}`}
                        style={{ width: `${Math.min(percentage ?? 0, 100)}%` }}
                    ></div>
                </div>
                <p className={`text-right text-xs mt-2 font-medium ${over ? 'text-red-400' : 'text-zinc-400'}`}>
                    {percentage === null
                        ? 'Defina a renda para calcular o teto'
                        : over
                            ? `${percentage.toFixed(0)}% — ${brl(total - (teto ?? 0))} acima do teto`
                            : `${percentage.toFixed(1)}% consumido`}
                </p>
            </div>
        </button>
    );
}
