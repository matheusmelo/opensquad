import { useState } from 'react';
import { UploadCloud, CheckCircle, FileText } from 'lucide-react';

export function PDFUploader({ onUploadComplete }: { onUploadComplete: () => void }) {
    const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');
    const [file, setFile] = useState<File | null>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setStatus('uploading');

            const formData = new FormData();
            formData.append('fatura', selectedFile);

            try {
                const response = await fetch('http://localhost:3001/api/upload/fatura', {
                    method: 'POST',
                    body: formData,
                });
                await response.json();

                setStatus('processing');

                // Simulating polling logic visually
                setTimeout(() => {
                    setStatus('done');
                    setTimeout(() => {
                        onUploadComplete();
                    }, 1500);
                }, 3000);
            } catch (err) {
                console.error(err);
                setStatus('idle');
            }
        }
    };

    return (
        <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-3xl w-full max-w-md mx-auto text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/10 to-transparent pointer-events-none"></div>

            <h3 className="text-2xl font-bold mb-6">Upload de Fatura</h3>

            {status === 'idle' && (
                <label className="cursor-pointer flex flex-col items-center justify-center p-12 border-2 border-dashed border-zinc-700/50 rounded-2xl hover:border-zinc-500 hover:bg-zinc-800/50 transition-all">
                    <UploadCloud size={48} className="text-zinc-500 mb-4" />
                    <span className="font-semibold text-zinc-300">Arraste a fatura ou clique aqui</span>
                    <span className="text-sm text-zinc-500 mt-2">Suporta PDF</span>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
                </label>
            )}

            {status === 'uploading' && (
                <div className="flex flex-col items-center py-12">
                    <FileText size={48} className="text-blue-500 mb-4 animate-pulse" />
                    <span className="font-semibold text-blue-400">Enviando {file?.name}...</span>
                </div>
            )}

            {status === 'processing' && (
                <div className="flex flex-col items-center py-12">
                    <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4"></div>
                    <span className="font-semibold text-amber-500">Processando na Squad Shlomo Engineering...</span>
                </div>
            )}

            {status === 'done' && (
                <div className="flex flex-col items-center py-12">
                    <CheckCircle size={48} className="text-emerald-500 mb-4" />
                    <span className="font-semibold text-emerald-400">✅ Fatura Classificada!</span>
                </div>
            )}
        </div>
    );
}
