import { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Check, X, CreditCard, Landmark } from 'lucide-react';
import { brl, dayLabel, ledger, type Natureza, type Pulmao, type Transaction, type TransactionFilters, type TransactionPage } from '../lib/api';
import { metaFor, NATUREZA_LABEL } from '../lib/pulmoes';

interface TransactionListProps {
    /** Filtros fixos da tela (contexto, mês, pulmão) */
    base: TransactionFilters;
    showFilters?: boolean;
    pageSize?: number;
    /** Chamado depois de uma reclassificação, para a tela recalcular os totais */
    onChanged?: () => void;
}

// Sugestão de texto para "aplicar a parecidos": o nome do estabelecimento
function suggestRule(descricao: string) {
    const segment = descricao.split(/\||\s-\s/).pop() ?? descricao;
    const word = segment.split(/[\s*]+/).find((w) => w.length >= 3 && !/\d/.test(w));
    return (word ?? segment).trim().toLowerCase();
}

export function TransactionList({ base, showFilters = true, pageSize = 25, onChanged }: TransactionListProps) {
    const [q, setQ] = useState('');
    const [query, setQuery] = useState('');
    const [natureza, setNatureza] = useState<Natureza | ''>('');
    const [categoria, setCategoria] = useState('');
    const [sort, setSort] = useState<'data' | 'valor'>('data');
    const [page, setPage] = useState(1);
    const [result, setResult] = useState<TransactionPage | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [editing, setEditing] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reload, setReload] = useState(0);

    const baseKey = JSON.stringify(base);

    // Debounce da busca por texto
    useEffect(() => {
        const t = setTimeout(() => {
            setQuery(q);
            setPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => {
        let active = true;
        ledger
            .transactions({ ...base, q: query || undefined, natureza: natureza || base.natureza, categoria: categoria || base.categoria, sort, page, pageSize })
            .then((r) => {
                if (!active) return;
                setResult(r);
                setError(null);
            })
            .catch((err: Error) => active && setError(err.message));
        return () => {
            active = false;
        };
        // base entra pela chave serializada para não refazer a busca a cada render
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseKey, query, natureza, categoria, sort, page, pageSize, reload]);

    useEffect(() => {
        let active = true;
        ledger.categories(base.contexto).then((c) => active && setCategories(c)).catch(() => {});
        return () => {
            active = false;
        };
    }, [base.contexto, reload]);

    const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

    const handleSaved = () => {
        setEditing(null);
        setReload((n) => n + 1);
        onChanged?.();
    };

    return (
        <div className="flex flex-col gap-4 min-w-0">
            {showFilters && (
                <div className="flex flex-col sm:flex-row gap-2">
                    <label className="flex-1 flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 focus-within:border-zinc-600">
                        <Search size={16} className="text-zinc-500" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Buscar descrição…"
                            className="bg-transparent outline-none text-sm flex-1 min-w-0"
                        />
                    </label>
                    {!base.pulmao && (
                        <select value={natureza} onChange={(e) => { setNatureza(e.target.value as Natureza | ''); setPage(1); }} className="select">
                            <option value="">Todas as naturezas</option>
                            {(Object.keys(NATUREZA_LABEL) as Natureza[]).map((n) => <option key={n} value={n}>{NATUREZA_LABEL[n]}</option>)}
                        </select>
                    )}
                    <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setPage(1); }} className="select max-w-full sm:max-w-48">
                        <option value="">Todas as categorias</option>
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={sort} onChange={(e) => setSort(e.target.value as 'data' | 'valor')} className="select">
                        <option value="data">Mais recentes</option>
                        <option value="valor">Maiores valores</option>
                    </select>
                </div>
            )}

            {error && <div className="text-sm text-red-400">Erro ao carregar lançamentos: {error}</div>}

            {result && (
                <div className="text-xs text-zinc-500">
                    {result.total} lançamento{result.total === 1 ? '' : 's'} · soma {brl(result.soma)}
                </div>
            )}

            <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-left border-collapse min-w-[560px]">
                    <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500 text-sm">
                            <th className="pb-3 font-medium w-20">Data</th>
                            <th className="pb-3 font-medium">Descrição</th>
                            <th className="pb-3 font-medium">Classificação</th>
                            <th className="pb-3 font-medium text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {result?.items.map((tx) => (
                            <TransactionRow
                                key={tx.id}
                                tx={tx}
                                categories={categories}
                                editing={editing === tx.id}
                                onEdit={() => setEditing(editing === tx.id ? null : tx.id)}
                                onSaved={handleSaved}
                            />
                        ))}
                        {result && result.items.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-zinc-500">Nenhum lançamento com esses filtros.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 text-sm text-zinc-400">
                    <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30" aria-label="Página anterior">
                        <ChevronLeft size={18} />
                    </button>
                    Página {page} de {totalPages}
                    <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30" aria-label="Próxima página">
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}
        </div>
    );
}

interface RowProps {
    tx: Transaction;
    categories: string[];
    editing: boolean;
    onEdit: () => void;
    onSaved: () => void;
}

function TransactionRow({ tx, categories, editing, onEdit, onSaved }: RowProps) {
    const meta = metaFor(tx.natureza === 'despesa' ? tx.pulmao : null);
    const Icon = meta.icon;
    const isIn = tx.natureza === 'receita' || tx.natureza === 'estorno';

    return (
        <>
            <tr className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${editing ? 'bg-zinc-800/30' : ''}`}>
                <td className="py-3 text-sm text-zinc-400 whitespace-nowrap">{dayLabel(tx.data)}</td>
                <td className="py-3 pr-3">
                    <div className="font-medium text-zinc-200 break-words">{tx.descricao}</div>
                    {tx.bankAccount && (
                        <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                            {tx.bankAccount.tipo === 'CREDIT' ? <CreditCard size={12} /> : <Landmark size={12} />}
                            {tx.bankAccount.nome}
                        </div>
                    )}
                </td>
                <td className="py-3 pr-3">
                    <button onClick={onEdit} title="Reclassificar" className="flex flex-col items-start gap-1 text-left">
                        {tx.natureza === 'despesa' ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border whitespace-nowrap ${meta.chip}`}>
                                <Icon size={14} /> {tx.pulmao ? meta.nome : 'Sem pulmão'}
                            </span>
                        ) : (
                            <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border bg-zinc-800 text-zinc-400 border-zinc-700">
                                {NATUREZA_LABEL[tx.natureza]}
                            </span>
                        )}
                        <span className="text-xs text-zinc-500">
                            {tx.categoria}
                            {tx.confianca < 0.5 && <span className="ml-1 text-amber-400" title="Classificação com baixa confiança">· revisar</span>}
                        </span>
                    </button>
                </td>
                <td className={`py-3 text-right font-bold tabular-nums whitespace-nowrap ${isIn ? 'text-emerald-400' : 'text-zinc-100'}`}>
                    {isIn ? '+ ' : ''}{brl(tx.valor)}
                </td>
            </tr>
            {editing && (
                <tr className="bg-zinc-800/30 border-b border-zinc-800">
                    <td colSpan={4} className="pb-4">
                        <EditPanel tx={tx} categories={categories} onCancel={onEdit} onSaved={onSaved} />
                    </td>
                </tr>
            )}
        </>
    );
}

function EditPanel({ tx, categories, onCancel, onSaved }: { tx: Transaction; categories: string[]; onCancel: () => void; onSaved: () => void }) {
    const [pulmao, setPulmao] = useState<Pulmao | null>(tx.pulmao);
    const [categoria, setCategoria] = useState(tx.categoria);
    const [natureza, setNatureza] = useState<Natureza>(tx.natureza);
    const [contexto, setContexto] = useState(tx.contexto);
    const [applyAll, setApplyAll] = useState(false);
    const [regra, setRegra] = useState(() => suggestRule(tx.descricao));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            await ledger.update(tx.id, {
                pulmao: natureza === 'despesa' && contexto === 'PF' ? pulmao : null,
                categoria: categoria.trim() || tx.categoria,
                natureza,
                contexto,
                regra: applyAll ? regra : undefined,
            });
            onSaved();
        } catch (err) {
            setError((err as Error).message);
            setSaving(false);
        }
    };

    const listId = `cats-${tx.id}`;

    return (
        <div className="flex flex-col gap-3 pt-3 px-1">
            <div className="flex flex-wrap gap-2 items-center">
                <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                    {([1, 2, 3, null] as (Pulmao | null)[]).map((p) => {
                        const m = metaFor(p);
                        const active = pulmao === p;
                        return (
                            <button
                                key={String(p)}
                                onClick={() => setPulmao(p)}
                                disabled={natureza !== 'despesa' || contexto === 'PJ'}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30 ${active ? `${m.chip} border` : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {p ? `P${p} ${m.nome}` : 'Sem pulmão'}
                            </button>
                        );
                    })}
                </div>
                <select value={natureza} onChange={(e) => setNatureza(e.target.value as Natureza)} className="select">
                    {(Object.keys(NATUREZA_LABEL) as Natureza[]).map((n) => <option key={n} value={n}>{NATUREZA_LABEL[n]}</option>)}
                </select>
                <select value={contexto} onChange={(e) => setContexto(e.target.value as 'PF' | 'PJ')} className="select">
                    <option value="PF">PF</option>
                    <option value="PJ">PJ</option>
                </select>
                <input
                    list={listId}
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    placeholder="Categoria"
                    className="select flex-1 min-w-40"
                />
                <datalist id={listId}>
                    {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
            </div>

            <label className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} className="accent-emerald-500" />
                Aplicar a todos os lançamentos que contêm
                <input
                    value={regra}
                    onChange={(e) => setRegra(e.target.value)}
                    disabled={!applyAll}
                    className="select py-1 w-40 disabled:opacity-40"
                />
                e criar regra para os próximos
            </label>

            {error && <div className="text-sm text-red-400">{error}</div>}

            <div className="flex gap-2 justify-end">
                <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800 flex items-center gap-1">
                    <X size={14} /> Cancelar
                </button>
                <button
                    onClick={save}
                    disabled={saving || (applyAll && regra.trim().length < 3)}
                    className="px-4 py-1.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center gap-1"
                >
                    <Check size={14} /> {saving ? 'Salvando…' : 'Salvar'}
                </button>
            </div>
        </div>
    );
}
