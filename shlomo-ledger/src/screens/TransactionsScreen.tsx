import { useState } from 'react';
import { ArrowLeft, ListFilter } from 'lucide-react';
import { monthLabel, type Contexto } from '../lib/api';
import { TransactionList } from '../components/TransactionList';

interface TransactionsScreenProps {
    contexto: Contexto;
    mes: string;
    meses: string[];
    onBack: () => void;
    onChanged: () => void;
}

export function TransactionsScreen({ contexto, mes: initialMes, meses, onBack, onChanged }: TransactionsScreenProps) {
    const [mes, setMes] = useState<string>(initialMes);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={onBack} className="self-start flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
                <ArrowLeft size={16} /> Voltar ao painel
            </button>

            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 shadow-xl border border-zinc-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-2xl font-extrabold flex items-center gap-3">
                        <span className="p-2 rounded-md bg-zinc-800"><ListFilter size={20} className="text-zinc-300" /></span>
                        Todos os lançamentos {contexto}
                    </h2>
                    <select value={mes} onChange={(e) => setMes(e.target.value)} className="select">
                        <option value="">Todos os meses</option>
                        {meses.map((m) => <option key={m} value={m}>{monthLabel(m, true)}</option>)}
                    </select>
                </div>
                <TransactionList base={{ contexto, mes: mes || undefined }} pageSize={50} onChanged={onChanged} />
            </div>
        </div>
    );
}
