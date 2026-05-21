import { supabase } from '../lib/supabase';

const QUEUE_KEY = 'offline_sync_queue';

type QueueItem = {
    id: string;
    table: string;
    operation: 'insert' | 'update';
    payload: any;
    createdAt: string;
};

const getQueue = (): QueueItem[] => {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

const saveQueue = (queue: QueueItem[]) => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const addToQueue = (table: string, operation: 'insert' | 'update', payload: any) => {
    const queue = getQueue();
    queue.push({ id: Date.now().toString(), table, operation, payload, createdAt: new Date().toISOString() });
    saveQueue(queue);
};

export const removeFromQueue = (id: string) => {
    saveQueue(getQueue().filter(q => q.id !== id));
};

export const getQueueLength = () => getQueue().length;

export const processQueue = async (): Promise<{ success: number; failed: number }> => {
    const queue = getQueue();
    if (queue.length === 0) return { success: 0, failed: 0 };

    let success = 0;
    let failed = 0;

    for (const item of queue) {
        try {
            let error = null;
            if (item.operation === 'insert') {
                const { error: e } = await supabase.from(item.table).insert(item.payload);
                error = e;
            } else if (item.operation === 'update') {
                const { id, ...rest } = item.payload;
                const { error: e } = await supabase.from(item.table).update(rest).eq('id', id);
                error = e;
            }
            if (error) throw error;
            removeFromQueue(item.id);
            success++;
        } catch {
            failed++;
        }
    }

    return { success, failed };
};

export const startAutoSync = (intervalMs = 30000) => {
    const sync = async () => {
        if (!navigator.onLine) return;
        const result = await processQueue();
        if (result.success > 0) {
            window.dispatchEvent(new CustomEvent('sync-complete', { detail: result }));
        }
    };

    window.addEventListener('online', sync);
    setInterval(sync, intervalMs);
    sync();
    return () => {
        window.removeEventListener('online', sync);
    };
};
