import { useCallback, useEffect, useState } from 'react';
import { PluggyConnect } from 'react-pluggy-connect';
import { Landmark, RefreshCw, Trash2, Plus, CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

type Contexto = 'PF' | 'PJ';

interface BankAccount {
    id: string;
    nome: string;
    tipo: 'BANK' | 'CREDIT';
    numero: string | null;
    saldo: number;
    moeda: string;
}

interface BankConnection {
    id: string;
    connectorName: string;
    connectorLogo: string | null;
    status: string;
    contexto: Contexto;
    lastSyncAt: string | null;
    error: string | null;
    accounts: BankAccount[];
}

interface PluggyStatus {
    configured: boolean;
    includeSandbox: boolean;
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}/api/pluggy${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (res.status === 204) return undefined as T;
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `Erro ${res.status}`);
    return body as T;
}

const fetchAll = () => Promise.all([
    api<PluggyStatus>('/status'),
    api<BankConnection[]>('/connections'),
]);

export function BankConnections({ onSynced }: { onSynced?: () => void }) {
    const [status, setStatus] = useState<PluggyStatus | null>(null);
    const [connections, setConnections] = useState<BankConnection[]>([]);
    const [connectToken, setConnectToken] = useState<string | null>(null);
    const [newContexto, setNewContexto] = useState<Contexto>('PF');
    const [busy, setBusy] = useState<string | null>(null);
    const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

    const apply = useCallback(([s, list]: [PluggyStatus, BankConnection[]]) => {
        setStatus(s);
        setConnections(list);
    }, []);

    const load = useCallback(async () => apply(await fetchAll()), [apply]);

    useEffect(() => {
        let active = true;
        fetchAll()
            .then((data) => active && apply(data))
            .catch((err: Error) => active && setMessage({ kind: 'error', text: `Orchestrator indisponível: ${err.message}` }));
        return () => {
            active = false;
        };
    }, [apply]);

    const openWidget = async () => {
        setMessage(null);
        setBusy('connect');
        try {
            const { accessToken } = await api<{ accessToken: string }>('/connect-token', { method: 'POST', body: '{}' });
            setConnectToken(accessToken);
        } catch (err) {
            setMessage({ kind: 'error', text: (err as Error).message });
            setBusy(null);
        }
    };

    const handleSuccess = async (itemId: string) => {
        setConnectToken(null);
        setBusy('connect');
        try {
            const result = await api<{ imported: number; status: string }>('/connections', {
                method: 'POST',
                body: JSON.stringify({ itemId, contexto: newContexto }),
            });
            setMessage({
                kind: 'ok',
                text: result.status === 'UPDATING'
                    ? 'Banco conectado! O Pluggy ainda está coletando os dados — sincronize em alguns instantes.'
                    : `Banco conectado! ${result.imported} lançamentos importados e classificados.`,
            });
            await load();
            onSynced?.();
        } catch (err) {
            setMessage({ kind: 'error', text: (err as Error).message });
        } finally {
            setBusy(null);
        }
    };

    const sync = async (conn: BankConnection) => {
        setMessage(null);
        setBusy(conn.id);
        try {
            const result = await api<{ imported: number; updated: number }>(`/connections/${conn.id}/sync?refresh=true`, { method: 'POST' });
            setMessage({ kind: 'ok', text: `${conn.connectorName}: ${result.imported} novos, ${result.updated} atualizados.` });
            await load();
            onSynced?.();
        } catch (err) {
            setMessage({ kind: 'error', text: (err as Error).message });
        } finally {
            setBusy(null);
        }
    };

    const remove = async (conn: BankConnection) => {
        if (!confirm(`Desconectar ${conn.connectorName}? Os lançamentos já importados continuam no ledger.`)) return;
        setBusy(conn.id);
        try {
            await api(`/connections/${conn.id}`, { method: 'DELETE' });
            await load();
        } catch (err) {
            setMessage({ kind: 'error', text: (err as Error).message });
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl w-full max-w-2xl mx-auto shadow-2xl relative overflow-hidden max-h-[85vh] overflow-y-auto">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none"></div>

            <div className="relative flex items-center gap-3 mb-2">
                <span className="p-2 rounded-md bg-zinc-800"><Landmark size={22} className="text-emerald-400" /></span>
                <h3 className="text-2xl font-bold">Contas Bancárias</h3>
            </div>
            <p className="relative text-sm text-zinc-500 mb-6">Open Finance via Pluggy — os lançamentos entram classificados nos 3 Pulmões.</p>

            {message && (
                <div className={`relative mb-6 flex items-start gap-2 rounded-xl border p-3 text-sm ${message.kind === 'ok' ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300' : 'border-red-900 bg-red-950/40 text-red-300'}`}>
                    {message.kind === 'ok' ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
                    {message.text}
                </div>
            )}

            {status && !status.configured && (
                <div className="relative mb-6 rounded-xl border border-amber-900 bg-amber-950/30 p-4 text-sm text-amber-300">
                    Configure <code className="text-amber-200">PLUGGY_CLIENT_ID</code> e <code className="text-amber-200">PLUGGY_CLIENT_SECRET</code> no <code className="text-amber-200">orchestrator/.env</code> e reinicie o orchestrator.
                </div>
            )}

            <div className="relative flex flex-col gap-4">
                {connections.length === 0 && status?.configured && (
                    <div className="text-center text-zinc-500 py-6 border-2 border-dashed border-zinc-800 rounded-2xl">Nenhum banco conectado ainda.</div>
                )}

                {connections.map((conn) => (
                    <div key={conn.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-md p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                {conn.connectorLogo
                                    ? <img src={conn.connectorLogo} alt="" className="w-9 h-9 rounded-lg bg-white object-contain p-1" />
                                    : <Landmark size={28} className="text-zinc-400" />}
                                <div className="min-w-0">
                                    <div className="font-bold truncate">{conn.connectorName}</div>
                                    <div className="text-xs text-zinc-500">
                                        <span className={`mr-2 px-1.5 py-0.5 rounded font-semibold ${conn.contexto === 'PJ' ? 'bg-emerald-900/60 text-emerald-300' : 'bg-zinc-800 text-zinc-300'}`}>{conn.contexto}</span>
                                        {conn.lastSyncAt ? `Sincronizado ${new Date(conn.lastSyncAt).toLocaleString('pt-BR')}` : 'Nunca sincronizado'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => sync(conn)} disabled={busy !== null} title="Sincronizar" className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40 transition-colors">
                                    <RefreshCw size={18} className={busy === conn.id ? 'animate-spin' : ''} />
                                </button>
                                <button onClick={() => remove(conn)} disabled={busy !== null} title="Desconectar" className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 disabled:opacity-40 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {conn.error && <div className="mt-3 text-xs text-red-400">{conn.error}</div>}

                        {conn.accounts.length > 0 && (
                            <div className="mt-4 flex flex-col divide-y divide-zinc-800">
                                {conn.accounts.map((acc) => (
                                    <div key={acc.id} className="flex items-center justify-between py-2 text-sm">
                                        <span className="flex items-center gap-2 text-zinc-300">
                                            {acc.tipo === 'CREDIT' ? <CreditCard size={14} className="text-zinc-500" /> : <Landmark size={14} className="text-zinc-500" />}
                                            {acc.nome}{acc.numero ? <span className="text-zinc-600">· {acc.numero}</span> : null}
                                        </span>
                                        <span className={`font-semibold tabular-nums ${acc.tipo === 'CREDIT' ? 'text-red-300' : 'text-zinc-100'}`}>
                                            {acc.tipo === 'CREDIT' ? 'Fatura ' : ''}{brl(acc.saldo)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {status?.configured && (
                <div className="relative mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                        {(['PF', 'PJ'] as const).map((c) => (
                            <button
                                key={c}
                                onClick={() => setNewContexto(c)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${newContexto === c ? (c === 'PJ' ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-white') : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {c === 'PF' ? 'Pessoal (PF)' : 'Orion (PJ)'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={openWidget}
                        disabled={busy !== null}
                        className="flex-1 px-5 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center gap-2 shadow-lg transition-colors"
                    >
                        {busy === 'connect' ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
                        Conectar novo banco
                    </button>
                </div>
            )}

            {connectToken && (
                <PluggyConnect
                    connectToken={connectToken}
                    includeSandbox={status?.includeSandbox}
                    onSuccess={({ item }) => handleSuccess(item.id)}
                    onError={({ message: text }) => {
                        setMessage({ kind: 'error', text });
                    }}
                    onClose={() => {
                        setConnectToken(null);
                        setBusy((b) => (b === 'connect' ? null : b));
                    }}
                />
            )}
        </div>
    );
}
