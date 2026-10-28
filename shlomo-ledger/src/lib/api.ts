export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export type Contexto = 'PF' | 'PJ';
export type Pulmao = 1 | 2 | 3;
export type Natureza = 'despesa' | 'receita' | 'estorno' | 'transferencia';

export interface Bucket {
    key: string;
    total: number;
    count: number;
}

export interface Summary {
    mes: string;
    meses: string[];
    receita: number;
    despesas: number;
    estornos: number;
    transferencias: number;
    pulmoes: { pulmao: Pulmao; total: number; count: number; categorias: Bucket[] }[];
    semPulmao: { total: number; count: number; categorias: Bucket[] };
    categorias: Bucket[];
    contas: { id: string; nome: string; tipo: 'BANK' | 'CREDIT'; saldo: number; numero: string | null }[];
}

export interface HistoryPoint {
    mes: string;
    receita: number;
    p1: number;
    p2: number;
    p3: number;
    semPulmao: number;
}

export interface Transaction {
    id: string;
    data: string;
    descricao: string;
    valor: number;
    contexto: Contexto;
    pulmao: Pulmao | null;
    categoria: string;
    confianca: number;
    natureza: Natureza;
    origem: string;
    bankAccount: { nome: string; tipo: 'BANK' | 'CREDIT' } | null;
}

export interface TransactionPage {
    items: Transaction[];
    total: number;
    soma: number;
    page: number;
    pageSize: number;
}

export interface TransactionFilters {
    contexto: Contexto;
    mes?: string;
    pulmao?: Pulmao | 'none';
    natureza?: Natureza;
    categoria?: string;
    q?: string;
    sort?: 'data' | 'valor';
    page?: number;
    pageSize?: number;
}

export type TransactionPatch = Partial<Pick<Transaction, 'pulmao' | 'categoria' | 'natureza' | 'contexto'>> & { regra?: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Erro ${res.status}`);
    return body as T;
}

const qs = (params: object) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
    }
    return search.toString();
};

export const ledger = {
    summary: (contexto: Contexto, mes?: string) => request<Summary>(`/api/ledger/summary?${qs({ contexto, mes })}`),
    history: (contexto: Contexto, months = 6) => request<HistoryPoint[]>(`/api/ledger/history?${qs({ contexto, months })}`),
    transactions: (f: TransactionFilters) => request<TransactionPage>(`/api/ledger/transactions?${qs(f)}`),
    categories: (contexto: Contexto) => request<string[]>(`/api/ledger/categories?${qs({ contexto })}`),
    update: (id: string, patch: TransactionPatch) =>
        request<{ transaction: Transaction; aplicadas: number }>(`/api/ledger/transactions/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(patch),
        }),
};

// ---------- Formatação ----------

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function monthLabel(mes: string, long = false) {
    const [y, m] = mes.split('-').map(Number);
    if (!long) return `${MONTHS[m - 1]}/${String(y).slice(2)}`;
    const name = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${y}`;
}

export const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

// ---------- Metas dos pulmões (preferência local) ----------

export interface Metas {
    /** Renda usada como base dos tetos; null = receita que entrou no mês */
    rendaMensal: number | null;
    percentuais: Record<Pulmao, number>;
}

const METAS_KEY = 'shlomo-ledger:metas';
export const DEFAULT_METAS: Metas = { rendaMensal: null, percentuais: { 1: 50, 2: 20, 3: 30 } };

export function loadMetas(): Metas {
    try {
        const raw = localStorage.getItem(METAS_KEY);
        if (raw) return { ...DEFAULT_METAS, ...JSON.parse(raw) };
    } catch {
        // storage indisponível (aba privada etc.): usa o padrão
    }
    return DEFAULT_METAS;
}

export function saveMetas(metas: Metas) {
    try {
        localStorage.setItem(METAS_KEY, JSON.stringify(metas));
    } catch {
        // sem storage a meta vale só nesta sessão
    }
}
