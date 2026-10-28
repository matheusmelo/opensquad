import { Home, Wrench, Plane, ShieldQuestion, type LucideIcon } from 'lucide-react';
import type { Pulmao } from './api';

export interface PulmaoMeta {
    pulmao: Pulmao | null;
    nome: string;
    titulo: string;
    descricao: string;
    icon: LucideIcon;
    color: string; // cor sólida (gráficos)
    bar: string;
    text: string;
    chip: string;
    border: string;
}

export const PULMOES: Record<Pulmao, PulmaoMeta> = {
    1: {
        pulmao: 1,
        nome: 'Essenciais',
        titulo: 'Pulmão 1: Essenciais',
        descricao: 'Moradia, mercado, contas fixas, saúde básica e transporte do dia a dia.',
        icon: Home,
        color: 'var(--color-p1)',
        bar: 'bg-p1',
        text: 'text-p1-light',
        chip: 'bg-p1/20 text-p1-light border-p1/30',
        border: 'border-p1/30',
    },
    2: {
        pulmao: 2,
        nome: 'Eventuais',
        titulo: 'Pulmão 2: Eventuais',
        descricao: 'Gastos que não acontecem todo mês: manutenção, compras pontuais, farmácia.',
        icon: Wrench,
        color: 'var(--color-p2)',
        bar: 'bg-p2',
        text: 'text-p2-light',
        chip: 'bg-p2/30 text-p2-light border-p2/40',
        border: 'border-p2/40',
    },
    3: {
        pulmao: 3,
        nome: 'Lazer',
        titulo: 'Pulmão 3: Lazer',
        descricao: 'Restaurantes, delivery, viagens, assinaturas e entretenimento.',
        icon: Plane,
        color: 'var(--color-p3)',
        bar: 'bg-p3',
        text: 'text-p3-light',
        chip: 'bg-p3/20 text-p3-light border-p3/30',
        border: 'border-p3/30',
    },
};

export const SEM_PULMAO: PulmaoMeta = {
    pulmao: null,
    nome: 'Sem pulmão',
    titulo: 'Fora dos pulmões',
    descricao: 'Despesas que não entram na regra dos 3 pulmões (IOF, PJ, não classificadas).',
    icon: ShieldQuestion,
    color: '#71717a',
    bar: 'bg-zinc-500',
    text: 'text-zinc-300',
    chip: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    border: 'border-zinc-700',
};

export const metaFor = (p: Pulmao | null) => (p ? PULMOES[p] : SEM_PULMAO);

export const NATUREZA_LABEL = {
    despesa: 'Despesa',
    receita: 'Receita',
    estorno: 'Estorno',
    transferencia: 'Transferência',
} as const;
