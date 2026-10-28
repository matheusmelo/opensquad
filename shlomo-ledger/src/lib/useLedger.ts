import { useEffect, useState } from 'react';
import { ledger, type Contexto, type HistoryPoint, type Summary } from './api';

/** Resumo do mês + histórico de um contexto; `version` força recarregar após mudanças. */
export function useLedger(contexto: Contexto, mes: string | undefined, version: number) {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        Promise.all([ledger.summary(contexto, mes), ledger.history(contexto, 6)])
            .then(([s, h]) => {
                if (!active) return;
                setSummary(s);
                setHistory(h);
                setError(null);
            })
            .catch((err: Error) => active && setError(err.message));
        return () => {
            active = false;
        };
    }, [contexto, mes, version]);

    return { summary, history, error };
}
