import { useState, type ReactNode } from 'react';
import { Activity, Landmark, Target, Wallet, ShieldQuestion, ChevronRight, CreditCard, TrendingUp } from 'lucide-react';
import { LungCard } from './components/LungCard';
import { MonthlyOverview } from './components/MonthlyOverview';
import { TransactionTable } from './components/TransactionTable';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { PDFUploader } from './components/PDFUploader';
import { AgentMonitor } from './components/AgentMonitor';
import { BankConnections } from './components/BankConnections';
import { MetasDialog } from './components/MetasDialog';
import { PulmaoScreen } from './screens/PulmaoScreen';
import { TransactionsScreen } from './screens/TransactionsScreen';

import { CampaignCard } from './components/CampaignCard';
import { LaunchTimeline } from './components/LaunchTimeline';
import { RoyaltyTracker } from './components/RoyaltyTracker';

import { brl, loadMetas, monthLabel, saveMetas, type Contexto, type Metas, type Pulmao, type Summary } from './lib/api';
import { PULMOES } from './lib/pulmoes';
import { useLedger } from './lib/useLedger';

type Screen = { name: 'dashboard' } | { name: 'pulmao'; pulmao: Pulmao | null } | { name: 'transacoes' };

export default function App() {
  const [context, setContext] = useState<Contexto | 'MONITOR'>('PF');
  const [showUploader, setShowUploader] = useState(false);
  const [showBanks, setShowBanks] = useState(false);
  const [showMetas, setShowMetas] = useState(false);
  const [version, setVersion] = useState(0);
  const [mes, setMes] = useState<string | undefined>();
  const [screen, setScreen] = useState<Screen>({ name: 'dashboard' });
  const [metas, setMetas] = useState<Metas>(loadMetas);

  const refresh = () => setVersion((n) => n + 1);
  const ledgerContext: Contexto = context === 'PJ' ? 'PJ' : 'PF';
  const { summary, history, error } = useLedger(ledgerContext, mes, version);

  const switchContext = (c: Contexto | 'MONITOR') => {
    setContext(c);
    setMes(undefined);
    setScreen({ name: 'dashboard' });
  };

  const rendaBase = summary ? (metas.rendaMensal ?? summary.receita) : 0;
  const tetoFor = (p: Pulmao) => (rendaBase > 0 ? (rendaBase * metas.percentuais[p]) / 100 : null);

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-10 flex flex-col gap-8 tracking-tight">
      {/* HEADER */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
            Shlomo Ledger
          </h1>
          <p className="text-zinc-400 mt-2 font-medium">Governança Financeira Baseada em Princípios de Sabedoria</p>
        </div>

        <div className="flex bg-zinc-900/80 p-1.5 rounded-xl backdrop-blur-md border border-zinc-800 shadow-xl overflow-x-auto max-w-full items-center gap-2">
          <button
            onClick={() => setShowUploader(true)}
            className="px-4 py-2.5 rounded-lg font-bold transition-all whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-sm"
          >
            + Upload Fatura
          </button>
          <button
            onClick={() => setShowBanks(true)}
            className="px-4 py-2.5 rounded-lg font-bold transition-all whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-sm"
          >
            <Landmark size={18} />
            Conectar banco
          </button>

          <div className="w-px h-8 bg-zinc-700 mx-2 shrink-0"></div>

          <button
            onClick={() => switchContext('PF')}
            className={`px-5 py-2.5 rounded-lg font-bold transition-all whitespace-nowrap ${context === 'PF' ? 'bg-zinc-800 shadow-sm text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Gestão Pessoal (PF)
          </button>
          <button
            onClick={() => switchContext('PJ')}
            className={`px-5 py-2.5 rounded-lg font-bold transition-all whitespace-nowrap ${context === 'PJ' ? 'bg-emerald-700 shadow-sm text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Gestão Orion (PJ)
          </button>
          <button
            onClick={() => switchContext('MONITOR')}
            className={`px-4 py-2.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-2 ${context === 'MONITOR' ? 'bg-purple-600 shadow-sm text-white' : 'text-purple-400 hover:text-purple-300'}`}
          >
            <Activity size={18} />
            Agentes
          </button>
        </div>
      </header>

      {/* UPLOADER MODAL */}
      {showUploader && (
        <Modal onClose={() => setShowUploader(false)}>
          <PDFUploader onUploadComplete={() => {
            setShowUploader(false);
            refresh();
          }} />
        </Modal>
      )}

      {/* OPEN FINANCE (PLUGGY) MODAL */}
      {showBanks && (
        <Modal onClose={() => setShowBanks(false)} wide>
          <BankConnections onSynced={refresh} />
        </Modal>
      )}

      {showMetas && summary && (
        <Modal onClose={() => setShowMetas(false)}>
          <MetasDialog
            metas={metas}
            receitaDoMes={summary.receita}
            onClose={() => setShowMetas(false)}
            onSave={(m) => {
              setMetas(m);
              saveMetas(m);
              setShowMetas(false);
            }}
          />
        </Modal>
      )}

      {context !== 'MONITOR' && error && (
        <div className="rounded-2xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          Não foi possível carregar os dados do orchestrator ({error}). Confira se ele está rodando na porta 3001.
        </div>
      )}

      {/* RENDER DASHBOARDS */}
      {context === 'MONITOR' ? (
        <AgentMonitor />
      ) : !summary ? (
        !error && <div className="text-zinc-500">Carregando…</div>
      ) : screen.name === 'pulmao' ? (
        <PulmaoScreen
          pulmao={screen.pulmao}
          summary={summary}
          history={history}
          teto={screen.pulmao ? tetoFor(screen.pulmao) : null}
          onBack={() => setScreen({ name: 'dashboard' })}
          onChanged={refresh}
        />
      ) : screen.name === 'transacoes' ? (
        <TransactionsScreen
          contexto={ledgerContext}
          mes={summary.mes}
          meses={summary.meses}
          onBack={() => setScreen({ name: 'dashboard' })}
          onChanged={refresh}
        />
      ) : context === 'PF' ? (
        <PersonalDashboard
          summary={summary}
          history={history}
          metas={metas}
          rendaBase={rendaBase}
          tetoFor={tetoFor}
          onMes={setMes}
          onOpen={(s) => setScreen(s)}
          onMetas={() => setShowMetas(true)}
          onChanged={refresh}
        />
      ) : (
        <BusinessDashboard summary={summary} history={history} onMes={setMes} onOpen={(s) => setScreen(s)} onChanged={refresh} />
      )}
    </div>
  );
}

function Modal({ children, onClose, wide = false }: { children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`relative w-full ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
        <button onClick={onClose} className="absolute -top-12 right-0 text-white hover:text-zinc-300 font-bold">
          Fechar (X)
        </button>
        {children}
      </div>
    </div>
  );
}

function MonthPicker({ summary, onMes }: { summary: Summary; onMes: (mes: string) => void }) {
  return (
    <select value={summary.mes} onChange={(e) => onMes(e.target.value)} className="select text-base font-semibold" aria-label="Mês">
      {(summary.meses.length ? summary.meses : [summary.mes]).map((m) => (
        <option key={m} value={m}>{monthLabel(m, true)}</option>
      ))}
    </select>
  );
}

interface PersonalDashboardProps {
  summary: Summary;
  history: ReturnType<typeof useLedger>['history'];
  metas: Metas;
  rendaBase: number;
  tetoFor: (p: Pulmao) => number | null;
  onMes: (mes: string) => void;
  onOpen: (screen: Screen) => void;
  onMetas: () => void;
  onChanged: () => void;
}

function PersonalDashboard({ summary, history, metas, rendaBase, tetoFor, onMes, onOpen, onMetas, onChanged }: PersonalDashboardProps) {
  const gastoPulmoes = summary.pulmoes.reduce((acc, p) => acc + p.total, 0);
  const saldo = rendaBase - gastoPulmoes - summary.semPulmao.total;
  const cartao = summary.contas.filter((c) => c.tipo === 'CREDIT').reduce((acc, c) => acc + c.saldo, 0);
  const emConta = summary.contas.filter((c) => c.tipo === 'BANK').reduce((acc, c) => acc + c.saldo, 0);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthPicker summary={summary} onMes={onMes} />
        <button onClick={onMetas} className="px-4 py-2 rounded-xl text-sm font-semibold border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 flex items-center gap-2">
          <Target size={16} className="text-amber-400" /> Metas dos pulmões
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 blur-3xl rounded-full bg-amber-500 w-32 h-32"></div>
          <div>
            <h2 className="text-zinc-400 font-semibold uppercase tracking-wider text-sm mb-2">
              {metas.rendaMensal ? 'Renda mensal (meta)' : 'Receita do mês'}
            </h2>
            <div className="text-4xl font-extrabold tracking-tighter text-white tabular-nums">{brl(rendaBase)}</div>
            {metas.rendaMensal !== null && (
              <div className="text-xs text-zinc-500 mt-1">Entrou na conta: {brl(summary.receita)}</div>
            )}
            {!metas.rendaMensal && summary.receita < gastoPulmoes && (
              <button onClick={onMetas} className="text-xs text-amber-400 hover:text-amber-300 mt-2 text-left">
                Receita abaixo dos gastos: se a renda entra pela PJ, informe o pró-labore →
              </button>
            )}
          </div>
          <div className="border-t border-zinc-800/50 pt-5">
            <h2 className="text-zinc-400 font-semibold uppercase tracking-wider text-sm mb-2">Saldo livre</h2>
            <div className={`text-3xl font-extrabold tracking-tighter tabular-nums ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{brl(saldo)}</div>
            <div className="text-xs text-zinc-500 mt-1">Renda − pulmões − despesas fora dos pulmões</div>
          </div>
          <div className="border-t border-zinc-800/50 pt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-zinc-500 flex items-center gap-1"><Wallet size={14} /> Em conta</div>
              <div className="font-bold tabular-nums">{brl(emConta)}</div>
            </div>
            <div>
              <div className="text-zinc-500 flex items-center gap-1"><CreditCard size={14} /> Fatura aberta</div>
              <div className="font-bold tabular-nums text-red-300">{brl(cartao)}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {summary.pulmoes.map((p) => (
            <LungCard
              key={p.pulmao}
              meta={PULMOES[p.pulmao]}
              total={p.total}
              count={p.count}
              categorias={p.categorias}
              teto={tetoFor(p.pulmao)}
              onOpen={() => onOpen({ name: 'pulmao', pulmao: p.pulmao })}
            />
          ))}
        </div>
      </div>

      <button
        onClick={() => onOpen({ name: 'pulmao', pulmao: null })}
        className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/60 text-left transition-colors"
      >
        <span className="flex items-center gap-3">
          <ShieldQuestion size={20} className="text-zinc-400" />
          <span>
            <span className="font-semibold">Fora dos pulmões: {brl(summary.semPulmao.total)}</span>
            <span className="text-zinc-500 text-sm block">
              {summary.semPulmao.count} despesas (IOF e não classificadas) · {brl(summary.transferencias)} em transferências e pagamento de fatura não entram na conta
            </span>
          </span>
        </span>
        <ChevronRight size={18} className="text-zinc-500 shrink-0" />
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyOverview history={history} />
        <CategoryBreakdown categorias={summary.categorias.slice(0, 8)} barClass="bg-amber-500" title="Para onde foi o dinheiro" />
      </div>

      <TransactionTable contexto="PF" mes={summary.mes} onViewAll={() => onOpen({ name: 'transacoes' })} onChanged={onChanged} />
    </div>
  );
}

interface BusinessDashboardProps {
  summary: Summary;
  history: ReturnType<typeof useLedger>['history'];
  onMes: (mes: string) => void;
  onOpen: (screen: Screen) => void;
  onChanged: () => void;
}

function BusinessDashboard({ summary, history, onMes, onOpen, onChanged }: BusinessDashboardProps) {
  const resultado = summary.receita - summary.despesas;
  const caixa = summary.contas.filter((c) => c.tipo === 'BANK').reduce((acc, c) => acc + c.saldo, 0);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-zinc-900 border border-emerald-900/30 p-6 sm:p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute right-0 w-64 h-64 rounded-full bg-emerald-500 blur-[100px] opacity-10"></div>
        <div className="relative">
          <h2 className="text-3xl font-extrabold text-white">Centro de Comando PJ</h2>
          <p className="text-emerald-400 text-lg">Orion Agência Web & Lançamentos Musicais</p>
        </div>
        <div className="relative"><MonthPicker summary={summary} onMes={onMes} /></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Kpi label="Faturamento" value={brl(summary.receita)} className="text-emerald-400" icon={<TrendingUp size={16} />} />
        <Kpi label="Despesas" value={brl(summary.despesas)} className="text-red-300" />
        <Kpi label="Resultado" value={brl(resultado)} className={resultado >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <Kpi label="Caixa nas contas" value={brl(caixa)} icon={<Wallet size={16} />} />
      </div>
      <p className="-mt-4 text-xs text-zinc-500">
        {brl(summary.transferencias)} em transferências (Pix para pessoas, pró-labore, aplicações) ficam fora do resultado.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryBreakdown categorias={summary.categorias.slice(0, 8)} barClass="bg-emerald-600" title="Despesas por categoria" />
        <MonthlyOverview history={history} business title="Faturamento x despesas" />
      </div>

      <TransactionTable contexto="PJ" mes={summary.mes} onViewAll={() => onOpen({ name: 'transacoes' })} onChanged={onChanged} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CampaignCard />
        <LaunchTimeline />
        <RoyaltyTracker />
      </div>
    </div>
  );
}

function Kpi({ label, value, className = 'text-zinc-100', icon }: { label: string; value: string; className?: string; icon?: ReactNode }) {
  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 border border-zinc-800">
      <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-1">{icon}{label}</div>
      <div className={`text-xl sm:text-2xl font-extrabold tracking-tighter tabular-nums ${className}`}>{value}</div>
    </div>
  );
}
