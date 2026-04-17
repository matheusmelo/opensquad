import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export function MonthlyOverview() {
    const [data, setData] = useState<any[]>([
        { name: 'Jan', Essenciais: 5000, Eventuais: 1000, Lazer: 2000, Receita: 10000 },
        { name: 'Fev', Essenciais: 4800, Eventuais: 1200, Lazer: 1500, Receita: 10000 },
        { name: 'Mar', Essenciais: 5200, Eventuais: 800, Lazer: 2500, Receita: 11000 },
        { name: 'Abr', Essenciais: 5100, Eventuais: 1500, Lazer: 1000, Receita: 10500 }
    ]);

    useEffect(() => {
        fetch('http://localhost:3001/api/finance/summary')
            .then(res => res.json())
            .then(summary => {
                setData(prev => {
                    const hasAtual = prev.find(p => p.name === 'Atual');
                    if (hasAtual) return prev;
                    return [
                        ...prev,
                        {
                            name: 'Atual',
                            Essenciais: summary.pulmoes_ativos?.Essenciais || 0,
                            Eventuais: summary.pulmoes_ativos?.Eventuais || 0,
                            Lazer: summary.pulmoes_ativos?.Lazer || 0,
                            Receita: summary.receita || 15400
                        }
                    ];
                });
            })
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="p-8 rounded-3xl bg-zinc-900 shadow-xl border border-zinc-800 flex flex-col w-full h-[400px]">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <span className="p-2 rounded-md bg-zinc-800">📈</span>
                Visão Mensal (3 Pulmões vs Receita)
            </h3>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value / 1000}k`} />
                        <Tooltip
                            cursor={{ fill: '#27272a', opacity: 0.4 }}
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#f4f4f5' }}
                            itemStyle={{ fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                        <Bar dataKey="Essenciais" stackId="a" fill="var(--color-p1)" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="Eventuais" stackId="a" fill="var(--color-p2)" />
                        <Bar dataKey="Lazer" stackId="a" fill="var(--color-p3)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
