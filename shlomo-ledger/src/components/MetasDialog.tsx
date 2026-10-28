import { useState } from 'react';
import { Target } from 'lucide-react';
import { brl, DEFAULT_METAS, type Metas, type Pulmao } from '../lib/api';
import { PULMOES } from '../lib/pulmoes';

interface MetasDialogProps {
    metas: Metas;
    receitaDoMes: number;
    onSave: (metas: Metas) => void;
    onClose: () => void;
}

export function MetasDialog({ metas, receitaDoMes, onSave, onClose }: MetasDialogProps) {
    const [renda, setRenda] = useState(metas.rendaMensal?.toString() ?? '');
    const [pct, setPct] = useState(metas.percentuais);

    const rendaNum = renda.trim() ? Number(renda.replace(/\./g, '').replace(',', '.')) : null;
    const base = rendaNum ?? receitaDoMes;
    const soma = pct[1] + pct[2] + pct[3];
    const invalid = (rendaNum !== null && (!Number.isFinite(rendaNum) || rendaNum <= 0)) || soma > 100;

    return (
        <div className="bg-zinc-950 border border-zinc-800 p-6 sm:p-8 rounded-3xl w-full max-w-lg mx-auto shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
                <span className="p-2 rounded-md bg-zinc-800"><Target size={22} className="text-amber-400" /></span>
                <h3 className="text-2xl font-bold">Metas dos pulmões</h3>
            </div>
            <p className="text-sm text-zinc-500 mb-6">
                O teto de cada pulmão é uma porcentagem da renda. Se a sua renda entra pela PJ, informe aqui quanto vai para a PF por mês (pró-labore).
            </p>

            <label className="flex flex-col gap-1 mb-6">
                <span className="text-sm font-semibold text-zinc-300">Renda mensal PF</span>
                <input
                    inputMode="decimal"
                    value={renda}
                    onChange={(e) => setRenda(e.target.value)}
                    placeholder={`Vazio = receita do mês (${brl(receitaDoMes)})`}
                    className="select"
                />
            </label>

            <div className="flex flex-col gap-4">
                {([1, 2, 3] as Pulmao[]).map((p) => (
                    <div key={p} className="flex items-center gap-3">
                        <span className={`w-28 text-sm font-semibold ${PULMOES[p].text}`}>{PULMOES[p].nome}</span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={pct[p]}
                            onChange={(e) => setPct({ ...pct, [p]: Number(e.target.value) })}
                            className="flex-1 accent-amber-500"
                            aria-label={`Percentual do ${PULMOES[p].titulo}`}
                        />
                        <span className="w-12 text-right tabular-nums text-sm">{pct[p]}%</span>
                        <span className="w-28 text-right tabular-nums text-sm text-zinc-400">{brl((base * pct[p]) / 100)}</span>
                    </div>
                ))}
            </div>

            <div className={`mt-4 text-sm ${soma > 100 ? 'text-red-400' : 'text-zinc-500'}`}>
                Total: {soma}% {soma < 100 && `· ${100 - soma}% livre para reserva/investimento`}
                {soma > 100 && ' · passa de 100%'}
            </div>

            <div className="flex justify-between gap-2 mt-8">
                <button onClick={() => { setRenda(''); setPct(DEFAULT_METAS.percentuais); }} className="px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800">
                    Restaurar padrão
                </button>
                <div className="flex gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800">Cancelar</button>
                    <button
                        onClick={() => onSave({ rendaMensal: rendaNum, percentuais: pct })}
                        disabled={invalid}
                        className="px-5 py-2 rounded-lg text-sm font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950"
                    >
                        Salvar metas
                    </button>
                </div>
            </div>
        </div>
    );
}
