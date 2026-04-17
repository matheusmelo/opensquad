import { useEffect, useState } from 'react';
import { ReceiptText, Home, Plane, Wrench, ShieldQuestion } from 'lucide-react';

export function TransactionTable() {
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        fetch('http://localhost:3001/api/transactions')
            .then(res => res.json())
            .then(data => setTransactions(data))
            .catch(err => console.error("API error", err));
    }, []);

    const getLungStyle = (lung: number) => {
        switch (lung) {
            case 1: return { bg: 'bg-p1/20', text: 'text-p1-light', border: 'border-p1/30', icon: <Home size={14} /> };
            case 2: return { bg: 'bg-p2/30', text: 'text-p2-light', border: 'border-p2/40', icon: <Wrench size={14} /> };
            case 3: return { bg: 'bg-p3/20', text: 'text-p3-light', border: 'border-p3/30', icon: <Plane size={14} /> };
            default: return { bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700', icon: <ShieldQuestion size={14} /> };
        }
    };

    return (
        <div className="p-8 rounded-3xl bg-zinc-900 shadow-xl border border-zinc-800 flex flex-col w-full h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-3">
                    <span className="p-2 rounded-md bg-zinc-800"><ReceiptText size={20} className="text-zinc-300" /></span>
                    Últimos Lançamentos
                </h3>
                <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                    Ver todas &rarr;
                </button>
            </div>

            <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500 text-sm">
                            <th className="pb-3 font-medium">Data</th>
                            <th className="pb-3 font-medium">Descrição</th>
                            <th className="pb-3 font-medium hidden sm:table-cell">Categoria</th>
                            <th className="pb-3 font-medium text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((tx) => {
                            const style = getLungStyle(tx.pulmao);
                            return (
                                <tr key={tx.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group">
                                    <td className="py-4 text-sm text-zinc-400">{new Date(tx.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</td>
                                    <td className="py-4 font-medium text-zinc-200">{tx.descricao}</td>
                                    <td className="py-4 hidden sm:table-cell">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                                            {style.icon} Pulmão {tx.pulmao || '?'}
                                        </span>
                                    </td>
                                    <td className="py-4 text-right font-bold text-zinc-100">
                                        R$ {tx.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            );
                        })}
                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-zinc-500">Nenhuma transação encontrada na API...</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
