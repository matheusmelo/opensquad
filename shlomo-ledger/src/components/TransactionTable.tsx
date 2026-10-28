import { ReceiptText } from 'lucide-react';
import type { Contexto } from '../lib/api';
import { TransactionList } from './TransactionList';

interface TransactionTableProps {
    contexto: Contexto;
    mes?: string;
    onViewAll: () => void;
    onChanged?: () => void;
}

export function TransactionTable({ contexto, mes, onViewAll, onChanged }: TransactionTableProps) {
    return (
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 shadow-xl border border-zinc-800 flex flex-col w-full min-w-0">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-3">
                    <span className="p-2 rounded-md bg-zinc-800"><ReceiptText size={20} className="text-zinc-300" /></span>
                    Últimos lançamentos
                </h3>
                <button onClick={onViewAll} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                    Ver todos &rarr;
                </button>
            </div>
            <TransactionList base={{ contexto, mes }} showFilters={false} pageSize={8} onChanged={onChanged} />
        </div>
    );
}
