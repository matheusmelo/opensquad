import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ActivityEvent } from '../types/activity';

export function useAgentTimeline(agentId: string) {
    const [timeline, setTimeline] = useState<ActivityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!agentId) return;
        let mounted = true;

        const fetchTimeline = async () => {
            try {
                setLoading(true);
                const data = await api.agents.timeline(agentId);
                if (mounted) {
                    setTimeline(data);
                    setError(null);
                }
            } catch (err) {
                console.error('Failed to fetch timeline for', agentId, err);
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Failed to fetch timeline');
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchTimeline();
        const interval = setInterval(fetchTimeline, 5000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [agentId]);

    return { events: timeline, loading, error };
}
