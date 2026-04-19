import { PDFUploader } from "@/components/PDFUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export function UploadPage() {
  return (
    <div className="p-6 overflow-y-auto w-full flex-1 bg-zinc-950">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Upload Bank Statement</h1>
        <p className="text-zinc-500 text-sm mt-1">Upload a PDF statement to auto-classify transactions via Shlomo Engine</p>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        <PDFUploader />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-zinc-300">
              <FileText className="h-4 w-4" /> Supported Banks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-sm text-zinc-400">
              <span className="flex items-center gap-2">🟣 Nubank</span>
              <span className="flex items-center gap-2">🟠 Itaú</span>
              <span className="flex items-center gap-2">🔴 Bradesco</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
