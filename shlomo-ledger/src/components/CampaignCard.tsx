export function CampaignCard() {
    return (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-xl hover:border-emerald-500/50 transition-colors">
            <h3 className="font-bold text-lg mb-4 text-emerald-400 flex items-center gap-2">
                <span>🎯</span> Meta Ads - Captação
            </h3>
            <div className="flex justify-between mb-6">
                <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold mb-1">Investido</p>
                    <p className="font-bold text-2xl text-white">R$ 5.230</p>
                </div>
                <div className="text-right">
                    <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold mb-1">ROAS Previsto</p>
                    <p className="font-bold text-2xl text-emerald-400">3.5x</p>
                </div>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 mb-2">
                <div className="bg-emerald-500 h-2 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" style={{ width: '65%' }}></div>
            </div>
            <p className="text-xs font-semibold text-emerald-500 mt-2 text-right">Fase Ativa - Bom Engajamento</p>
        </div>
    );
}
