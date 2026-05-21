import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth.store';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AlertModal } from '../../components/AlertModal';
import { addToQueue } from '../../utils/offlineQueue';

const STORAGE_KEY = 'dimsum_inventory_pemakaian';

export const ReportInventory = () => {
    const [items, setItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [alert, setAlert] = useState<{ type: 'info' | 'error' | 'success'; title: string; message: string } | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const user = useAuthStore((s) => s.user);

    const [pemakaian, setPemakaian] = useState<Record<string, string>>({});

    const historyLog: any[] = JSON.parse(localStorage.getItem('dimsum_inventory_history') || '[]');

    const loadLocalData = useCallback(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setPemakaian(JSON.parse(saved));
        } catch { }
    }, []);

    const saveLocalData = useCallback((data: Record<string, string>) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch { }
    }, []);

    const fetchInventory = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .order('item_name');
            if (error) throw error;
            setItems(data || []);
        } catch (err: any) {
            console.error(err);
            setAlert({ type: 'error', title: 'Gagal', message: 'Gagal memuat inventori - ' + err.message });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
        loadLocalData();
    }, [loadLocalData]);

    const handlePemakaianChange = (id: string, text: string) => {
        setPemakaian((prev) => {
            const next = { ...prev, [id]: text };
            saveLocalData(next);
            return next;
        });
    };

    const handleKirimLaporan = () => {
        if (!user) return;
        setConfirmOpen(true);
    };

    const processLaporan = async () => {
        setIsSubmitting(true);
        try {
            const updates = items
                .map((p) => {
                    const pake = Number(pemakaian[p.id]) || 0;
                    return pake > 0 ? { id: p.id, name: p.item_name, pakai: pake, stokAwal: Number(p.quantity) } : null;
                })
                .filter(Boolean) as { id: string; name: string; pakai: number; stokAwal: number }[];

            if (updates.length === 0) {
                setAlert({ type: 'info', title: 'Info', message: 'Tidak ada data pemakaian untuk dilaporkan.' });
                setIsSubmitting(false);
                return;
            }

            const historyLog: any[] = [];

            for (const update of updates) {
                const newStock = Math.max(0, update.stokAwal - update.pakai);

                const { error: updateErr } = await supabase
                    .from('inventory')
                    .update({ quantity: newStock })
                    .eq('id', update.id);

                if (updateErr) throw updateErr;

                historyLog.push({
                    item_name: update.name,
                    stok_awal: update.stokAwal,
                    terpakai: update.pakai,
                    stok_akhir: newStock,
                    created_at: new Date().toISOString(),
                });
            }

            const existing = JSON.parse(localStorage.getItem('dimsum_inventory_history') || '[]');
            existing.unshift(...historyLog);
            localStorage.setItem('dimsum_inventory_history', JSON.stringify(existing.slice(0, 200)));

            setAlert({ type: 'success', title: 'Berhasil!', message: 'Laporan berhasil dikirim dan stok warehouse telah diperbarui.' });
            setPemakaian({});
            saveLocalData({});
            fetchInventory();

        } catch {
            for (const update of updates) {
                addToQueue('inventory', 'update', { id: update.id, quantity: Math.max(0, update.stokAwal - update.pakai) });
            }
            setAlert({ type: 'info', title: 'Offline', message: 'Tidak ada koneksi. Data disimpan di lokal dan akan dikirim otomatis saat online.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 pb-28 max-w-3xl mx-auto h-full scroll-smooth">
            <div className="bg-[#FF6B6B] bg-opacity-10 rounded-xl p-4 mb-6">
                <h1 className="text-[#FF6B6B] font-bold text-lg">Pemakaian Bahan Baku</h1>
            </div>

            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-white font-extrabold text-xl tracking-tight">Lapor Pemakaian</h2>
            </div>

            <p className="text-[#888] text-sm mb-6 leading-relaxed">
                Isi jumlah pemakaian (kekurangan barang di outlet). Mengisi form ini akan langsung mengurangi stok di Warehouse.
            </p>

            <div className="space-y-3">
                {items.map((item) => (
                    <div key={item.id} className="bg-[#1A1A2E] rounded-xl p-4 mb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div className="flex-1">
                            <h3 className="text-white text-base font-bold mb-1">{item.item_name}</h3>
                            <p className="text-[#888] text-xs">{item.unit}</p>
                        </div>

                        <div className="w-full sm:w-40">
                            <label className="block text-[#888] text-xs mb-1.5 text-center">Jumlah Dipakai</label>
                            <input
                                type="number"
                                value={pemakaian[item.id] || ''}
                                onChange={(e) => handlePemakaianChange(item.id, e.target.value)}
                                placeholder="0"
                                className="w-full bg-[#252540] border border-[#303050] text-white text-center rounded-lg p-3 outline-none focus:border-[#FF6B6B] min-h-[44px] text-base"
                            />
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="py-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            {/* History */}
            <div className="mt-6 mb-28">
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 text-[#888] hover:text-white transition text-sm font-semibold"
                >
                    {showHistory ? '▼' : '▶'} Riwayat Pemakaian ({historyLog.length})
                </button>
                {showHistory && historyLog.length > 0 && (
                    <div className="mt-3 bg-[#111118] rounded-2xl border border-[#1A1A2E] overflow-hidden">
                        <div className="hidden sm:block">
                            <table className="w-full text-left">
                                <thead className="bg-[#1A1A2E]">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Waktu</th>
                                        <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Item</th>
                                        <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Stok Awal</th>
                                        <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Terpakai</th>
                                        <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Stok Akhir</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1A1A2E]">
                                    {historyLog.map((h, i) => (
                                        <tr key={i} className="hover:bg-[#1A1A2E]/50 transition">
                                            <td className="px-4 py-3 text-xs text-gray-400">
                                                {new Date(h.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-white font-medium">{h.item_name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-300 text-right">{h.stok_awal}</td>
                                            <td className="px-4 py-3 text-sm text-[#FF6B6B] font-bold text-right">{h.terpakai}</td>
                                            <td className="px-4 py-3 text-sm text-green-400 font-bold text-right">{h.stok_akhir}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden divide-y divide-[#1A1A2E]">
                            {historyLog.slice(0, 20).map((h, i) => (
                                <div key={i} className="px-4 py-3">
                                    <div className="flex justify-between items-center">
                                        <p className="text-white text-sm font-medium">{h.item_name}</p>
                                        <p className="text-[#FF6B6B] text-xs font-bold">{h.terpakai} terpakai</p>
                                    </div>
                                    <p className="text-gray-500 text-xs">
                                        {h.stok_awal} → {h.stok_akhir} | {new Date(h.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {showHistory && historyLog.length === 0 && (
                    <p className="text-gray-500 text-sm mt-2">Belum ada riwayat pemakaian.</p>
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 sm:left-72 p-4 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D] to-transparent pointer-events-none">
                <button
                    onClick={handleKirimLaporan}
                    disabled={isSubmitting || isLoading}
                    className="w-full bg-[#FF6B6B] text-white font-bold py-3.5 px-4 rounded-xl shadow-[0_4px_8px_rgba(255,107,107,0.3)] pointer-events-auto hover:bg-red-500 disabled:opacity-50 transition min-h-[48px] text-base"
                >
                    {isSubmitting ? 'Memproses...' : 'Potong Stok Warehouse'}
                </button>
            </div>

            <ConfirmModal
                open={confirmOpen}
                title="Potong Stok Warehouse"
                message="Laporan pemakaian akan langsung mengurangi stok bahan baku di Warehouse. Lanjutkan?"
                confirmLabel="Ya, Potong"
                cancelLabel="Batal"
                onConfirm={() => { setConfirmOpen(false); processLaporan(); }}
                onCancel={() => setConfirmOpen(false)}
            />
            <AlertModal
                open={!!alert}
                type={alert?.type}
                title={alert?.title || ''}
                message={alert?.message || ''}
                onClose={() => setAlert(null)}
            />
        </div>
    );
};
