import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSquadStore } from "@/store/useSquadStore";
import { useEffect } from "react";

export function useLiveAgents() {
  const setLiveAgents = useSquadStore((s) => s.setLiveAgents);

  const query = useQuery({
    queryKey: ["agents", "live"],
    queryFn: () => api.agents.live(),
    refetchInterval: 3_000,
  });

  useEffect(() => {
    if (query.data) setLiveAgents(query.data);
  }, [query.data, setLiveAgents]);

  return {
    agents: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
  };
}
