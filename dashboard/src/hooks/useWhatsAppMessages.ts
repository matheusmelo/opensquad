import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { WhatsAppMessage } from '../types/activity';

export function useWhatsAppMessages() {
    const [messages, setMessages] = useState<WhatsAppMessage[]>([]);

    useEffect(() => {
        const fetchMsgs = async () => {
            try {
                const data = await api.whatsapp.messages(50);
                setMessages(data);
            } catch (e) {
                console.error(e);
            }
        };
        fetchMsgs();
        const int = setInterval(fetchMsgs, 5000);
        return () => clearInterval(int);
    }, []);

    const sendCommand = async (phoneNumber: string, text: string) => {
        // optimistic
        const opt: WhatsAppMessage = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            from: 'user',
            phoneNumber,
            text
        };
        setMessages(prev => [...prev, opt]);

        try {
            await api.whatsapp.send(phoneNumber, text);
        } catch (err) {
            console.error(err);
            setMessages(prev => prev.filter(m => m.id !== opt.id)); // Revert on failure
        }
    };

    return { messages, sendCommand };
}
