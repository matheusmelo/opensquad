export function RoyaltyTracker() {
    return (
        <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-xl flex flex-col justify-between">
            <h3 className="font-bold text-xl mb-6 text-zinc-200 flex items-center gap-2">
                <span>🎧</span> Royalties Musicais
            </h3>
            <table className="w-full text-left border-collapse">
                <tbody>
                    <tr className="border-b border-zinc-800/50">
                        <td className="py-3 font-medium text-zinc-300">Spotify</td>
                        <td className="py-3 text-right font-bold text-emerald-400">$ 450.00</td>
                    </tr>
                    <tr className="border-b border-zinc-800/50">
                        <td className="py-3 font-medium text-zinc-300">Apple Music</td>
                        <td className="py-3 text-right font-bold text-emerald-400">$ 120.00</td>
                    </tr>
                    <tr>
                        <td className="py-3 font-medium text-zinc-300">YouTube ContentID</td>
                        <td className="py-3 text-right font-bold text-emerald-400">$ 85.50</td>
                    </tr>
                </tbody>
            </table>
            <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-between items-center text-zinc-400">
                <span className="font-medium">Projeção Mensal Prevista</span>
                <span className="font-extrabold text-white text-2xl drop-shadow-md">$ 655.50</span>
            </div>
        </div>
    );
}
