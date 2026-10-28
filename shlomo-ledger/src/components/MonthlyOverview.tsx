import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Line, ComposedChart } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { brl, monthLabel, type HistoryPoint } from '../lib/api';
import { PULMOES } from '../lib/pulmoes';

const tooltipStyle = { backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#f4f4f5' };
const money = (value: number) => `R$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;

interface MonthlyOverviewProps {
    history: HistoryPoint[];
    /** Só um pulmão (tela de detalhe); sem isso empilha os três */
    pulmao?: 1 | 2 | 3;
    showReceita?: boolean;
    title?: string;
    /** PJ: despesas totais em barra e faturamento em linha, sem pulmões */
    business?: boolean;
}

export function MonthlyOverview({ history, pulmao, showReceita = true, title, business = false }: MonthlyOverviewProps) {
    const data = history.map((h) => ({
        name: monthLabel(h.mes),
        Essenciais: h.p1,
        Eventuais: h.p2,
        Lazer: h.p3,
        Receita: h.receita,
        Despesas: h.p1 + h.p2 + h.p3 + h.semPulmao,
        Faturamento: h.receita,
    }));

    const single = pulmao ? PULMOES[pulmao] : null;

    return (
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 shadow-xl border border-zinc-800 flex flex-col w-full h-[400px]">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <span className="p-2 rounded-md bg-zinc-800"><BarChart3 size={20} className="text-zinc-300" /></span>
                {title ?? (showReceita ? 'Visão mensal (3 pulmões vs receita)' : 'Visão mensal')}
            </h3>
            {data.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">Sem lançamentos ainda.</div>
            ) : (
                <div className="flex-1 w-full min-h-0 min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        {business ? (
                            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={money} />
                                <Tooltip cursor={{ fill: '#27272a', opacity: 0.4 }} contentStyle={tooltipStyle} formatter={(v) => brl(Number(v))} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                <Bar dataKey="Despesas" fill="#b91c1c" radius={[4, 4, 0, 0]} />
                                <Line dataKey="Faturamento" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                            </ComposedChart>
                        ) : single ? (
                            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={money} />
                                <Tooltip cursor={{ fill: '#27272a', opacity: 0.4 }} contentStyle={tooltipStyle} formatter={(v) => brl(Number(v))} />
                                <Bar dataKey={single.nome} fill={single.color} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        ) : (
                            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={money} />
                                <Tooltip cursor={{ fill: '#27272a', opacity: 0.4 }} contentStyle={tooltipStyle} formatter={(v) => brl(Number(v))} />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                                <Bar dataKey="Essenciais" stackId="a" fill={PULMOES[1].color} />
                                <Bar dataKey="Eventuais" stackId="a" fill={PULMOES[2].color} />
                                <Bar dataKey="Lazer" stackId="a" fill={PULMOES[3].color} radius={[4, 4, 0, 0]} />
                                {showReceita && <Line dataKey="Receita" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />}
                            </ComposedChart>
                        )}
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
