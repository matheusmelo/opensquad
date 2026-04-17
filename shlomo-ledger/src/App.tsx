import { useState } from 'react';

// Heroicons removed to avoid dependencies in the MVP — using emojis for now.

export default function App() {
  const [context, setContext] = useState<'PF' | 'PJ'>('PF');

  return (
    <div className="min-h-screen p-6 md:p-12 flex flex-col gap-8 tracking-tight">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
            Shlomo Ledger
          </h1>
          <p className="text-zinc-400 mt-1">Governança Financeira Baseada em Princípios de Sabedoria</p>
        </div>

        <div className="flex bg-zinc-900/50 p-1 rounded-xl backdrop-blur-md border border-zinc-800">
          <button
            onClick={() => setContext('PF')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${context === 'PF' ? 'bg-zinc-800 shadow-md text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Gestão Pessoal (PF)
          </button>
          <button
            onClick={() => setContext('PJ')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${context === 'PJ' ? 'bg-business shadow-md text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Gestão Orion (PJ)
          </button>
        </div>
      </header>

      {context === 'PF' ? (
        <PersonalDashboard />
      ) : (
        <BusinessDashboard />
      )}
    </div>
  );
}

function PersonalDashboard() {
  const data = {
    revenue: 15400.00,
    lung1: { label: 'Pulmão 1: Essenciais', total: 6000, max: 7700, icon: '🏠', color: 'bg-p1', text: 'text-p1', bgLight: 'bg-p1/20', borderColor: 'border-p1/30' },
    lung2: { label: 'Pulmão 2: Eventuais', total: 1500, max: 3080, icon: '🔧', color: 'bg-p2', text: 'text-p2-light', bgLight: 'bg-p2/20', borderColor: 'border-p2/30' },
    lung3: { label: 'Pulmão 3: Lazer', total: 3200, max: 4620, icon: '✈️', color: 'bg-p3', text: 'text-p3-light', bgLight: 'bg-p3/20', borderColor: 'border-p3/30' },
  };

  const totalExpenses = data.lung1.total + data.lung2.total + data.lung3.total;
  const balance = data.revenue - totalExpenses;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 p-6 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 blur-3xl rounded-full bg-amber-500 w-32 h-32"></div>
          <div>
            <h2 className="text-zinc-400 font-medium">Receita Total do Mês</h2>
            <div className="mt-2 text-4xl font-bold tracking-tighter">
              R$ {data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-8">
            <h2 className="text-zinc-400 font-medium">Saldo Livre</h2>
            <div className="mt-1 text-2xl font-bold text-emerald-400">
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <LungCard lung={data.lung1} />
          <LungCard lung={data.lung2} />
          <LungCard lung={data.lung3} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-8 rounded-3xl bg-zinc-900 shadow-xl border border-zinc-800">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
            <span className="p-2 rounded-md bg-zinc-800">📊</span>
            Distribuição da Renda
          </h3>
          {/* Visual breakdown bar */}
          <div className="h-6 w-full rounded-full flex overflow-hidden shadow-inner bg-zinc-800/50 mt-4">
            <div className="h-full bg-p1 transition-all duration-1000 ease-out" style={{ width: `${(data.lung1.total / data.revenue) * 100}%` }}></div>
            <div className="h-full bg-p2 transition-all duration-1000 ease-out delay-150" style={{ width: `${(data.lung2.total / data.revenue) * 100}%` }}></div>
            <div className="h-full bg-p3 transition-all duration-1000 ease-out delay-300" style={{ width: `${(data.lung3.total / data.revenue) * 100}%` }}></div>
          </div>
          <div className="flex justify-between mt-4 text-sm font-medium">
            <span className="text-p1-light flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-p1"></span>{(data.lung1.total / data.revenue * 100).toFixed(1)}% Essencial</span>
            <span className="text-p2-light flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-p2"></span>{(data.lung2.total / data.revenue * 100).toFixed(1)}% Eventual</span>
            <span className="text-p3-light flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-p3"></span>{(data.lung3.total / data.revenue * 100).toFixed(1)}% Lazer</span>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-zinc-900 shadow-xl border border-zinc-800 flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex flex-col justify-center items-center text-3xl mb-4">🔮</div>
          <h3 className="text-xl font-bold mb-2">Engenharia de Dados em Construção</h3>
          <p className="text-zinc-400">O robô está finalizando os algoritmos de extração de faturas em PDF para popular este dashboard em tempo real.</p>
        </div>
      </div>
    </div>
  );
}

function LungCard({ lung }: { lung: any }) {
  const percentage = (lung.total / lung.max) * 100;

  return (
    <div className={`p-6 rounded-3xl flex flex-col justify-between border shadow-lg relative overflow-hidden bg-zinc-900 ${lung.borderColor} group hover:-translate-y-1 transition-all duration-300`}>
      <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40 ${lung.color}`}></div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner ${lung.bgLight}`}>
            {lung.icon}
          </div>
          <h3 className="font-semibold text-zinc-200">{lung.label}</h3>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <div className="text-sm font-medium text-zinc-500 uppercase tracking-widest mb-1">Gasto Atual</div>
            <div className={`text-3xl font-extrabold ${lung.text} tracking-tighter`}>
              R$ {lung.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-zinc-500 uppercase tracking-widest mb-1">Teto (Meta)</div>
            <div className="text-lg font-bold text-zinc-300 tracking-tighter">
              R$ {lung.max.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="w-full bg-zinc-800 rounded-full h-2 shadow-inner overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ease-out ${lung.color}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
        <p className="text-right text-xs mt-2 font-medium text-zinc-400">
          {percentage.toFixed(1)}% consumido
        </p>
      </div>
    </div>
  );
}

function BusinessDashboard() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-12 rounded-3xl border border-business/30 bg-gradient-to-br from-zinc-900 to-zinc-950 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-business blur-3xl opacity-10"></div>
        <div className="text-6xl mb-6">🚀</div>
        <h2 className="text-3xl font-bold mb-4 drop-shadow-md">Dashboard Orion & Carreira Musical</h2>
        <p className="text-zinc-400 max-w-xl text-lg">
          Em breve as métricas corporativas, lançamentos, perpétuos e o seu lado de investimentos corporativos estarão categorizados aqui, com isolamento total dos seus gastos de vida pessoal.
        </p>
      </div>
    </div>
  );
}
