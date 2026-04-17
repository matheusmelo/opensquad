export function LaunchTimeline() {
    return (
        <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-xl flex flex-col gap-4">
            <h3 className="font-bold text-xl text-zinc-200 mb-2">Timeline Meteórico</h3>

            <div className="flex items-center gap-4 group">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                <div className="flex-1">
                    <p className="font-bold text-white">Aquecimento (CPL 1-3)</p>
                    <p className="text-sm text-zinc-400">Concluído com sucesso</p>
                </div>
            </div>
            <div className="w-0.5 h-6 bg-zinc-800 ml-1.5 rounded"></div>

            <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 relative z-10"></div>
                    <div className="absolute w-5 h-5 rounded-full bg-amber-500/40 animate-ping"></div>
                </div>
                <div className="flex-1">
                    <p className="font-bold text-amber-400">Abertura de Carrinho</p>
                    <p className="text-sm text-amber-400/80 font-medium">Acontecendo agora - Grupos VIPs</p>
                </div>
            </div>
            <div className="w-0.5 h-6 bg-zinc-800 ml-1.5 rounded"></div>

            <div className="flex items-center gap-4 opacity-50">
                <div className="w-3 h-3 rounded-full bg-zinc-600"></div>
                <div className="flex-1 text-zinc-500">
                    <p className="font-bold">Fechamento Oficial</p>
                    <p className="text-sm">Módulo encerra em 48 horas</p>
                </div>
            </div>
        </div>
    );
}
