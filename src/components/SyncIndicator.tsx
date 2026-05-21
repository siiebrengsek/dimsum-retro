import { useState, useEffect } from 'react';
import { getQueueLength, processQueue } from '../utils/offlineQueue';

export const SyncIndicator = () => {
    const [pending, setPending] = useState(getQueueLength());
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        const update = () => setPending(getQueueLength());
        window.addEventListener('sync-complete', update);
        const interval = setInterval(update, 5000);
        return () => {
            window.removeEventListener('sync-complete', update);
            clearInterval(interval);
        };
    }, []);

    if (pending === 0) return null;

    const handleSync = async () => {
        setSyncing(true);
        await processQueue();
        setPending(getQueueLength());
        setSyncing(false);
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 bg-[#F5A623] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl hover:bg-orange-600 transition disabled:opacity-60"
            >
                {syncing ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <span>☁️</span>
                )}
                {syncing ? 'Menyinkronkan...' : `${pending} data pending`}
            </button>
        </div>
    );
};
