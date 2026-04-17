import { ReactNode } from 'react';

type LungCardProps = {
    label: string;
    total: number;
    max: number;
    icon: ReactNode;
    colorClass: string;
    textClass: string;
    bgLightClass: string;
    borderClass: string;
};

export function LungCard({ lung }: { lung: LungCardProps }) {
    const percentage = (lung.total / lung.max) * 100;

    return (
        <div className={`p-6 rounded-3xl flex flex-col justify-between border shadow-lg relative overflow-hidden bg-zinc-900 group hover:-translate-y-1 transition-all duration-300 ${lung.borderClass}`}>
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40 ${lung.colorClass}`}></div>

            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${lung.bgLightClass} ${lung.textClass}`}>
                        {lung.icon}
                    </div>
                    <h3 className="font-semibold text-zinc-200">{lung.label}</h3>
                </div>

                <div className="mt-6 flex items-end justify-between relative z-10">
                    <div>
                        <div className="text-sm font-medium text-zinc-500 uppercase tracking-widest mb-1">Gasto Atual</div>
                        <div className={`text-3xl font-extrabold ${lung.textClass} tracking-tighter`}>
                            R$ {lung.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-medium text-zinc-500 uppercase tracking-widest mb-1">Teto (Meta)</div>
                        <div className="text-lg font-bold text-zinc-300 tracking-tighter">
                            R$ {lung.max.toLocaleString('pt-BR')}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 relative z-10">
                <div className="w-full bg-zinc-800 rounded-full h-2 shadow-inner overflow-hidden">
                    <div
                        className={`h-2 rounded-full transition-all duration-1000 ease-out ${lung.colorClass}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                </div>
                <p className="text-right text-xs mt-2 font-medium text-zinc-400">
                    {percentage.toFixed(1)}% consumido
                </p>
            </div>
        </div>
    );
}
