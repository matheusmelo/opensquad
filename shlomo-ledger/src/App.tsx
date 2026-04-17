import { useState } from 'react';
import { Home, Ruler, Plane, Activity } from 'lucide-react';
import { LungCard } from './components/LungCard';
import { MonthlyOverview } from './components/MonthlyOverview';
import { TransactionTable } from './components/TransactionTable';
import { PDFUploader } from './components/PDFUploader';
import { AgentMonitor } from './components/AgentMonitor';

import { CampaignCard } from './components/CampaignCard';
import { LaunchTimeline } from './components/LaunchTimeline';
import { RoyaltyTracker } from './components/RoyaltyTracker';

export default function App() {
  const [context, setContext] = useState<'PF' | 'PJ' | 'MONITOR'>('PF');
  const [showUploader, setShowUploader] = useState(false);

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 flex flex-col gap-8 tracking-tight">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
            Shlomo Ledger
          </h1>
          <p className="text-zinc-400 mt-2 font-medium">Governança Financeira Baseada em Princípios de Sabedoria</p>
        </div>

        <div className="flex bg-zinc-900/80 p-1.5 rounded-xl backdrop-blur-md border border-zinc-800 shadow-xl overflow-x-auto w-full md:w-auto items-center gap-2">
          <button
            onClick={() => setShowUploader(true)}
            className="px-4 py-2.5 rounded-lg font-bold transition-all whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-sm"
          >
            + Upload Fatura
          </button>

          <div className="w-px h-8 bg-zinc-700 mx-2"></div>

          <button
            onClick={() => setContext('PF')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold transition-all whitespace-nowrap ${context === 'PF' ? 'bg-zinc-800 shadow-sm text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Gestão Pessoal (PF)
          </button>
          <button
            onClick={() => setContext('PJ')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold transition-all whitespace-nowrap ${context === 'PJ' ? 'bg-emerald-700 shadow-sm text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Gestão Orion (PJ)
          </button>
          <button
            onClick={() => setContext('MONITOR')}
            className={`px-4 py-2.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-2 ${context === 'MONITOR' ? 'bg-purple-600 shadow-sm text-white' : 'text-purple-400 hover:text-purple-300'}`}
          >
            <Activity size={18} />
            Agentes
          </button>
        </div>
      </header>

      {/* UPLOADER MODAL */}
      {showUploader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative">
            <button
              onClick={() => setShowUploader(false)}
              className="absolute -top-12 right-0 text-white hover:text-zinc-300 font-bold"
            >
              Fechar (X)
            </button>
            <PDFUploader onUploadComplete={() => {
              setShowUploader(false);
            }} />
          </div>
        </div>
      )}

      {/* RENDER DASHBOARDS */}
      {context === 'MONITOR' ? (
        <AgentMonitor />
      ) : context === 'PF' ? (
        <PersonalDashboard key={showUploader ? 'uploading' : 'ready'} />
      ) : (
        <BusinessDashboard />
      )}
    </div>
  );
}

function PersonalDashboard() {
  const data = {
    revenue: 15400.00,
    lung1: { label: 'Pulmão 1: Essenciais', total: 6000, max: 7700, icon: <Home />, colorClass: 'bg-p1', textClass: 'text-p1-light', bgLightClass: 'bg-p1/20', borderClass: 'border-p1/30' },
    lung2: { label: 'Pulmão 2: Eventuais', total: 1500, max: 3080, icon: <Ruler />, colorClass: 'bg-p2', textClass: 'text-p2-light', bgLightClass: 'bg-p2/30', borderClass: 'border-p2/40' },
    lung3: { label: 'Pulmão 3: Lazer', total: 3200, max: 4620, icon: <Plane />, colorClass: 'bg-p3', textClass: 'text-p3-light', bgLightClass: 'bg-p3/20', borderClass: 'border-p3/30' },
  };

  const totalExpenses = data.lung1.total + data.lung2.total + data.lung3.total;
  const balance = data.revenue - totalExpenses;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 p-8 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 blur-3xl rounded-full bg-amber-500 w-32 h-32"></div>
          <div>
            <h2 className="text-zinc-400 font-semibold uppercase tracking-wider text-sm mb-2">Receita Total do Mês</h2>
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-white">
              R$ {data.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-8 border-t border-zinc-800/50 pt-6">
            <h2 className="text-zinc-400 font-semibold uppercase tracking-wider text-sm mb-2">Saldo Livre</h2>
            <div className="text-3xl font-extrabold text-emerald-400 tracking-tighter">
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <LungCard lung={data.lung1} />
          <LungCard lung={data.lung2} />
          <LungCard lung={data.lung3} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyOverview />
        <TransactionTable />
      </div>
    </div>
  );
}

function BusinessDashboard() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-zinc-900 border border-emerald-900/30 p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute right-0 w-64 h-64 rounded-full bg-emerald-500 blur-[100px] opacity-10"></div>
        <div>
          <h2 className="text-3xl font-extrabold text-white">Centro de Comando PJ</h2>
          <p className="text-emerald-400 text-lg">Orion Agência Web & Lançamentos Musicais</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CampaignCard />
        <LaunchTimeline />
        <RoyaltyTracker />
      </div>
    </div>
  );
}
