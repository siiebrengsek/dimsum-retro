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
                const { inventory_decrements, ...payload } = item.payload;
                const { error: e } = await supabase.from(item.table).insert(payload);
                error = e;
                if (!error && inventory_decrements) {
                    for (const dec of inventory_decrements) {
                        const { data: inv } = await supabase.from('inventory').select('quantity, item_name').eq('id', dec.id).maybeSingle();
                        if (inv) {
                            const stockBefore = Number(inv.quantity);
                            const newQty = Math.max(0, stockBefore - dec.terpakai);
                            await supabase.from('inventory').update({ quantity: newQty }).eq('id', dec.id);
                            await supabase.from('inventory_mutations').insert([{
                                inventory_id: dec.id,
                                item_name: inv.item_name,
                                type: 'pemakaian',
                                quantity: dec.terpakai,
                                stock_before: stockBefore,
                                stock_after: newQty,
                                source: 'packaging_report',
                                report_date: payload.report_date || null,
                                outlet: dec.outlet || '',
                            }]);
                        }
                    }
                }
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
