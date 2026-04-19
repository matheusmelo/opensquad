import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSquadStore } from "@/store/useSquadStore";
import { useEffect } from "react";

export function useMetrics(period: "today" | "week" | "month" = "today") {
  const setMetrics = useSquadStore((s) => s.setMetrics);

  const costsQ = useQuery({
    queryKey: ["metrics", "costs", period],
    queryFn: () => api.metrics.costs(period),
    refetchInterval: 10_000,
  });

  const throughputQ = useQuery({
    queryKey: ["metrics", "throughput", period],
    queryFn: () => api.metrics.throughput(period),
    refetchInterval: 10_000,
  });

  const topFilesQ = useQuery({
    queryKey: ["metrics", "topFiles"],
    queryFn: () => api.metrics.topFiles(),
    refetchInterval: 30_000,
  });

  const leaderboardQ = useQuery({
    queryKey: ["metrics", "leaderboard"],
    queryFn: () => api.metrics.leaderboard(),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (costsQ.data) setMetrics(costsQ.data);
  }, [costsQ.data, setMetrics]);

  return {
    costs: costsQ.data ?? null,
    throughput: throughputQ.data ?? [],
    topFiles: topFilesQ.data ?? [],
    leaderboard: leaderboardQ.data ?? [],
    loading: costsQ.isLoading || throughputQ.isLoading,
  };
}
