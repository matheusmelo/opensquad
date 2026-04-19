import { useState } from 'react';
import { useWhatsAppMessages } from '../hooks/useWhatsAppMessages';
import { Send, Mic } from 'lucide-react';

export function WhatsAppPanel() {
    const { messages, sendCommand } = useWhatsAppMessages();
    const [text, setText] = useState('');
    const targetNumber = '5531998032532@c.us';

    const handleSend = () => {
        if (!text.trim()) return;
        sendCommand(targetNumber, text);
        setText('');
    };

    const quickCommands = ['/status', '/agentes', '/custos', '/relatorio'];

    return (
        <div className="flex h-full w-full bg-zinc-950 overflow-hidden">
            {/* Chat List */}
            <div className="flex-[2] flex flex-col border-r border-zinc-800">
                <header className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="font-semibold text-zinc-100 text-sm">WhatsApp Bot Online</span>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-2xl px-5 py-3 text-sm shadow-lg ${msg.from === 'user' ? 'bg-emerald-600/90 text-white border border-emerald-500' : 'bg-zinc-800 border border-zinc-700 text-zinc-200'}`}>
                                {msg.audioTranscript && (
                                    <div className="flex items-center gap-2 text-zinc-300 italic mb-2 text-xs bg-black/20 p-2 rounded-lg">
                                        <Mic size={14} /> Transcrição de Áudio
                                    </div>
                                )}
                                <div className="leading-relaxed whitespace-pre-wrap">{msg.text || msg.audioTranscript}</div>
                                {msg.attachments?.map((att, i) => (
                                    <div key={i} className="mt-3 text-xs flex items-center gap-2 bg-black/30 p-2 rounded-lg border border-white/10">
                                        {att.kind === 'pdf' ? '📄' : '🖼️'} {att.name}
                                    </div>
                                ))}
                                <div className={`text-[10px] mt-2 text-right font-medium opacity-60 ${msg.from === 'user' ? 'text-emerald-100' : 'text-zinc-400'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {messages.length === 0 && <div className="text-center text-zinc-500 mt-10">Nenhuma mensagem no histórico mock.</div>}
                </div>
            </div>

            {/* Input / Quick Commands */}
            <div className="flex-1 bg-zinc-900 p-6 flex flex-col">
                <h3 className="font-semibold text-zinc-300 mb-4 text-sm flex items-center gap-2"><span>⚡</span> Comandos Rápidos</h3>
                <div className="grid grid-cols-2 gap-3 mb-10">
                    {quickCommands.map(cmd => (
                        <button key={cmd} onClick={() => sendCommand(targetNumber, cmd)} className="bg-zinc-800 hover:bg-emerald-900/50 hover:border-emerald-500/50 border border-zinc-700 text-zinc-300 py-3 rounded-xl text-xs font-semibold transition-all">
                            {cmd}
                        </button>
                    ))}
                </div>

                <h3 className="font-semibold text-zinc-300 mb-4 text-sm flex items-center gap-2"><span>💬</span> Teste Interativo</h3>
                <div className="flex-1 flex flex-col gap-3">
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        className="flex-1 w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 text-sm text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
                        placeholder="Digite um comando customizado..."
                    />
                    <button onClick={handleSend} className="bg-emerald-600 hover:bg-emerald-500 text-white h-12 rounded-xl font-bold flex items-center justify-center gap-3 transition-colors shadow-lg shadow-emerald-900/20 mt-auto">
                        <Send size={18} /> ENVIAR (Via Dashboard)
                    </button>
                </div>
            </div>
        </div>
    );
}
