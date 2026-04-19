import { useState, useEffect, useRef } from 'react';
import { ActivityEvent } from '../types/activity';

export function useActivityStream() {
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        let reconnectTimeout: NodeJS.Timeout;
        let fallbackInterval: NodeJS.Timeout | undefined;

        const connect = () => {
            const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3002';
            const ws = new WebSocket(`${WS_URL}/ws/activity`);
            wsRef.current = ws;

            ws.onopen = () => {
                setConnected(true);
                clearInterval(fallbackInterval);
            };

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload.type === 'ACTIVITY_EVENT' && payload.data) {
                        setEvents((prev) => {
                            const newEvents = [payload.data, ...prev];
                            if (newEvents.length > 200) newEvents.length = 200;
                            return newEvents;
                        });
                    }
                } catch (e) {
                    console.error("WS parsing error", e);
                }
            };

            ws.onclose = () => {
                setConnected(false);
                reconnectTimeout = setTimeout(connect, 3000);
            };

            ws.onerror = () => {
                ws.close();
            };
        };

        connect();

        return () => {
            clearTimeout(reconnectTimeout);
            clearInterval(fallbackInterval);
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    return { events, connected };
}
