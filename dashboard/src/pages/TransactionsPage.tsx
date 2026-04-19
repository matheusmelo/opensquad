import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, ChevronDown, ChevronUp, Search, Filter } from "lucide-react";

interface Transaction {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  contexto: string;
  pulmao: number;
  categoria: string;
  confianca: number;
}

export function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("data");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterContexto, setFilterContexto] = useState<string>("all");

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["transactions", search],
    queryFn: async () => {
      const res = await fetch(`http://localhost:3001/api/transactions?search=${search}`);
      return res.json();
    },
    refetchInterval: 10_000,
  });

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const filtered = transactions
    .filter((t) => filterContexto === "all" || t.contexto === filterContexto)
    .sort((a, b) => {
      const aVal = a[sortField as keyof Transaction];
      const bVal = b[sortField as keyof Transaction];
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-zinc-600" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 text-emerald-400" /> : <ChevronDown className="h-3 w-3 text-emerald-400" />;
  };

  const pulmaoLabel = (p: number) => p === 1 ? "Essenciais" : p === 2 ? "Eventuais" : p === 3 ? "Lazer" : "-";
  const pulmaoColor = (p: number) => p === 1 ? "default" : p === 2 ? "secondary" : "outline";

  return (
    <div className="p-6 overflow-y-auto w-full flex-1 bg-zinc-950">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">Transactions</h1>
        <p className="text-zinc-500 text-sm mt-1">View & edit classified financial transactions</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-sm font-medium text-zinc-300">
              {filtered.length} transactions
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <div className="flex gap-1">
                {["all", "PF", "PJ"].map((ctx) => (
                  <Button
                    key={ctx}
                    variant={filterContexto === ctx ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterContexto(ctx)}
                  >
                    {ctx === "all" ? "All" : ctx}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-xs">
                    <th className="text-left p-3 cursor-pointer hover:text-zinc-200" onClick={() => toggleSort("data")}>
                      <span className="flex items-center gap-1">Date <SortIcon field="data" /></span>
                    </th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-right p-3 cursor-pointer hover:text-zinc-200" onClick={() => toggleSort("valor")}>
                      <span className="flex items-center justify-end gap-1">Amount <SortIcon field="valor" /></span>
                    </th>
                    <th className="text-center p-3">Context</th>
                    <th className="text-center p-3">Pulmão</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-right p-3">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                      <td className="p-3 text-zinc-400 font-mono text-xs">{tx.data?.split("T")[0]}</td>
                      <td className="p-3 text-zinc-200 max-w-[250px] truncate">{tx.descricao}</td>
                      <td className={`p-3 text-right font-mono font-medium ${tx.valor < 0 ? "text-red-400" : "text-emerald-400"}`}>
                        R$ {Math.abs(tx.valor).toFixed(2)}
                      </td>
                      <td className="p-3 text-center"><Badge variant="outline">{tx.contexto}</Badge></td>
                      <td className="p-3 text-center"><Badge variant={pulmaoColor(tx.pulmao) as "default" | "secondary" | "outline"}>{pulmaoLabel(tx.pulmao)}</Badge></td>
                      <td className="p-3 text-zinc-300">{tx.categoria}</td>
                      <td className="p-3 text-right">
                        <span className={`font-mono text-xs ${tx.confianca >= 0.8 ? "text-emerald-400" : tx.confianca >= 0.5 ? "text-amber-400" : "text-red-400"}`}>
                          {(tx.confianca * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="p-12 text-center text-zinc-500">
                      <Filter className="mx-auto h-8 w-8 mb-2 opacity-40" />
                      No transactions found. Upload a PDF to get started.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
