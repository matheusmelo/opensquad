import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface UploadResult {
  fileName: string;
  bank: string;
  transactionCount: number;
  anomalies: number;
}

export function PDFUploader() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 300);

      const res = await fetch("http://localhost:3001/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);

      const data = await res.json();
      setResult({
        fileName: file.name,
        bank: data.bank || "unknown",
        transactionCount: data.transactions?.length || 0,
        anomalies: data.anomalies?.length || 0,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 10_000_000,
  });

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-emerald-500 bg-emerald-950/20"
            : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/30"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-zinc-500 mb-4" />
        <p className="text-zinc-300 font-medium">
          {isDragActive ? "Drop your PDF here..." : "Drag & drop a bank statement PDF"}
        </p>
        <p className="text-sm text-zinc-500 mt-1">or click to browse • Max 10MB</p>
      </div>

      {uploading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              <span className="text-sm text-zinc-300">Processing PDF...</span>
              <span className="ml-auto text-sm text-zinc-500">{progress}%</span>
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-emerald-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="h-5 w-5" /> Upload Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-zinc-400" />
              <span className="text-zinc-300">{result.fileName}</span>
              <Badge variant="secondary">{result.bank}</Badge>
            </div>
            <div className="flex gap-4 text-sm text-zinc-400">
              <span>{result.transactionCount} transactions parsed</span>
              {result.anomalies > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertTriangle className="h-3 w-3" /> {result.anomalies} anomalies
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/transactions"}>
              View Transactions →
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-800/50">
          <CardContent className="pt-6 flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle className="h-4 w-4" /> {error}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
