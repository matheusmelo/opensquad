import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { brl, monthLabel, type HistoryPoint, type Pulmao, type Summary } from '../lib/api';
import { metaFor, PULMOES } from '../lib/pulmoes';
import { MonthlyOverview } from '../components/MonthlyOverview';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { TransactionList } from '../components/TransactionList';

interface PulmaoScreenProps {
    pulmao: Pulmao | null;
    summary: Summary;
    history: HistoryPoint[];
    teto: number | null;
    onBack: () => void;
    onChanged: () => void;
}

export function PulmaoScreen({ pulmao, summary, history, teto, onBack, onChanged }: PulmaoScreenProps) {
    const meta = metaFor(pulmao);
    const Icon = meta.icon;
    const [categoria, setCategoria] = useState<string | undefined>();

    const dados = pulmao ? summary.pulmoes.find((p) => p.pulmao === pulmao)! : summary.semPulmao;
    const media = (() => {
        const key = pulmao ? (`p${pulmao}` as const) : 'semPulmao';
        const prev = history.filter((h) => h.mes !== summary.mes);
        return prev.length ? prev.reduce((acc, h) => acc + h[key], 0) / prev.length : null;
    })();

    const percentage = teto ? (dados.total / teto) * 100 : null;
    const restante = teto !== null ? teto - dados.total : null;
    const maior = dados.categorias[0];

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={onBack} className="self-start flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
                <ArrowLeft size={16} /> Voltar ao painel
            </button>

            <div className={`p-6 sm:p-8 rounded-3xl bg-zinc-900 border ${meta.border} relative overflow-hidden`}>
                <div className={`absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl opacity-20 ${meta.bar}`}></div>
                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${meta.chip}`}>
                            <Icon size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold">{meta.titulo}</h2>
                            <p className="text-zinc-400 text-sm max-w-xl">{meta.descricao}</p>
                            <p className="text-zinc-500 text-sm mt-1">{monthLabel(summary.mes, true)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-8">
                        <Stat label="Gasto" value={brl(dados.total)} className={meta.text} />
                        <Stat label="Teto" value={teto !== null ? brl(teto) : '—'} />
                        <Stat
                            label={restante !== null && restante < 0 ? 'Acima do teto' : 'Disponível'}
                            value={restante !== null ? brl(Math.abs(restante)) : '—'}
                            className={restante !== null && restante < 0 ? 'text-red-400' : 'text-emerald-400'}
                        />
                        <Stat label="Média meses anteriores" value={media !== null ? brl(media) : '—'} />
                    </div>
                </div>

                {percentage !== null && (
                    <div className="relative mt-6">
                        <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                            <div className={`h-2.5 rounded-full ${percentage > 100 ? 'bg-red-500' : meta.bar}`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                        </div>
                        <p className="text-right text-xs mt-2 text-zinc-400">{percentage.toFixed(1)}% do teto</p>
                    </div>
                )}

                {maior && (
                    <p className="relative mt-4 text-sm text-zinc-400">
                        Maior peso: <span className="text-zinc-200 font-semibold">{maior.key}</span> com {brl(maior.total)}
                        {dados.total > 0 && ` (${((maior.total / dados.total) * 100).toFixed(0)}% do pulmão)`} em {maior.count} lançamento{maior.count === 1 ? '' : 's'}.
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CategoryBreakdown
                    categorias={dados.categorias}
                    barClass={meta.bar}
                    onSelect={(c) => setCategoria(categoria === c ? undefined : c)}
                    title={categoria ? `Por categoria · filtrando "${categoria}"` : 'Por categoria'}
                />
                {pulmao ? (
                    <MonthlyOverview history={history} pulmao={pulmao} showReceita={false} title={`Evolução · ${PULMOES[pulmao].nome}`} />
                ) : (
                    <MonthlyOverview history={history} showReceita={false} title="Evolução dos 3 pulmões" />
                )}
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 shadow-xl border border-zinc-800">
                <h3 className="text-xl font-bold mb-4">Lançamentos do {pulmao ? `pulmão ${pulmao}` : 'grupo fora dos pulmões'}</h3>
                <p className="text-sm text-zinc-500 mb-4">Clique na classificação de um lançamento para movê-lo de pulmão ou criar uma regra.</p>
                <TransactionList
                    base={{ contexto: 'PF', mes: summary.mes, pulmao: pulmao ?? 'none', categoria }}
                    onChanged={onChanged}
                />
            </div>
        </div>
    );
}

function Stat({ label, value, className = 'text-zinc-100' }: { label: string; value: string; className?: string }) {
    return (
        <div>
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">{label}</div>
            <div className={`text-xl sm:text-2xl font-extrabold tracking-tighter tabular-nums ${className}`}>{value}</div>
        </div>
    );
}
