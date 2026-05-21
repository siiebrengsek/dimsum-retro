import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth.store';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AlertModal } from '../../components/AlertModal';
import { addToQueue } from '../../utils/offlineQueue';
import { getTodayDate } from '../../utils/dateUtils';

const STORAGE_KEY_HARI_INI = 'dimsum_stock_hari_ini';
const STORAGE_KEY_SISA = 'dimsum_stock_sisa';

type PackagingItem = {
    id: number;
    name: string;
    unit: string;
};

type LocalData = Record<string, string>;

export const ReportStockInventory = () => {
    const [items, setItems] = useState<PackagingItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [alert, setAlert] = useState<{ type: 'info' | 'error' | 'success'; title: string; message: string } | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const user = useAuthStore((s) => s.user);
    const profile = useAuthStore((s) => s.profile);

    const [stockHariIni, setStockHariIni] = useState<LocalData>({});
    const [sisa, setSisa] = useState<LocalData>({});

    const [submittedHistory, setSubmittedHistory] = useState<any[]>([]);

    const loadLocalData = useCallback(() => {
        try {
            const savedHariIni = localStorage.getItem(STORAGE_KEY_HARI_INI);
            if (savedHariIni) setStockHariIni(JSON.parse(savedHariIni));

            const savedSisa = localStorage.getItem(STORAGE_KEY_SISA);
            if (savedSisa) setSisa(JSON.parse(savedSisa));
        } catch { }
    }, []);

    const saveLocalHariIni = useCallback((data: LocalData) => {
        try {
            localStorage.setItem(STORAGE_KEY_HARI_INI, JSON.stringify(data));
        } catch { }
    }, []);

    const saveLocalSisa = useCallback((data: LocalData) => {
        try {
            localStorage.setItem(STORAGE_KEY_SISA, JSON.stringify(data));
        } catch { }
    }, []);

    const clearLocalData = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY_HARI_INI);
            localStorage.removeItem(STORAGE_KEY_SISA);
        } catch { }
    }, []);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('packaging_items')
                .select('*')
                .order('name');
            if (error) throw error;
            setItems(data || []);
        } catch (err: any) {
            console.error(err);
            setAlert({ type: 'error', title: 'Gagal', message: 'Gagal memuat daftar barang - ' + err.message });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHistory = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('packaging_reports')
                .select('*, packaging_items!inner(name, unit)')
                .eq('staff_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);
            if (!error && data) setSubmittedHistory(data);
        } catch { }
    };

    useEffect(() => {
        fetchItems();
        loadLocalData();
    }, [loadLocalData]);

    const handleStockHariIniChange = (id: number, value: string) => {
        setStockHariIni((prev) => {
            const next = { ...prev, [id]: value };
            saveLocalHariIni(next);
            return next;
        });
    };

    const handleSisaChange = (id: number, value: string) => {
        setSisa((prev) => {
            const next = { ...prev, [id]: value };
            saveLocalSisa(next);
            return next;
        });
    };

    const getTerpakai = (id: number): number => {
        const hariIni = Number(stockHariIni[id]) || 0;
        const sisaVal = Number(sisa[id]) || 0;
        return Math.max(0, hariIni - sisaVal);
    };

    const handleKirimLaporan = () => {
        if (!user) return;
        setConfirmOpen(true);
    };

    const processLaporan = async () => {
        setIsSubmitting(true);
        try {
            const outlet = (profile as any)?.outlet || 'Unknown';

            const rows = items
                .map((item) => {
                    const stockHariIniVal = Number(stockHariIni[item.id]) || 0;
                    const sisaVal = Number(sisa[item.id]) || 0;
                    const terpakaiVal = Math.max(0, stockHariIniVal - sisaVal);
                    return stockHariIniVal > 0
                        ? { item_id: item.id, stock_hari_ini: stockHariIniVal, sisa: sisaVal, terpakai: terpakaiVal }
                        : null;
                })
                .filter(Boolean) as { item_id: number; stock_hari_ini: number; sisa: number; terpakai: number }[];

            if (rows.length === 0) {
                setAlert({ type: 'info', title: 'Info', message: 'Tidak ada data stock untuk dilaporkan.' });
                setIsSubmitting(false);
                return;
            }

            const inserts = rows.map((r) => ({
                staff_id: user!.id,
                item_id: r.item_id,
                outlet,
                report_date: getTodayDate(),
                stock_hari_ini: r.stock_hari_ini,
                sisa: r.sisa,
                terpakai: r.terpakai,
            }));

            const { error } = await supabase.from('packaging_reports').insert(inserts);
            if (error) throw error;

            setAlert({ type: 'success', title: 'Berhasil!', message: 'Laporan stock packaging berhasil dikirim ke Warehouse.' });
            clearLocalData();
            setStockHariIni({});
            setSisa({});
            fetchHistory();

        } catch {
            for (const item of items) {
                const stockHariIniVal = Number(stockHariIni[item.id]) || 0;
                if (stockHariIniVal > 0) {
                    addToQueue('packaging_reports', 'insert', {
                        staff_id: user!.id, item_id: item.id, outlet: (profile as any)?.outlet || 'Unknown',
                report_date: getTodayDate(),
                        stock_hari_ini: stockHariIniVal,
                        sisa: Number(sisa[item.id]) || 0,
                        terpakai: Math.max(0, stockHariIniVal - (Number(sisa[item.id]) || 0)),
                    });
                }
            }
            setAlert({ type: 'info', title: 'Offline', message: 'Tidak ada koneksi. Data disimpan di lokal dan akan dikirim otomatis saat online.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalTerpakai = items.reduce((sum, item) => sum + getTerpakai(item.id), 0);

    return (
        <div className="p-4 sm:p-6 pb-48 max-w-4xl mx-auto h-full scroll-smooth">
            <div className="bg-[#FF6B6B] bg-opacity-10 rounded-xl p-4 mb-6">
                <h1 className="text-[#FF6B6B] font-bold text-lg">Stock Packaging Hari Ini</h1>
            </div>

            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-white font-extrabold text-xl tracking-tight">Input Stock</h2>
                <span className="text-sm text-gray-400">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>

            <p className="text-[#888] text-sm mb-6 leading-relaxed">
                Isi stock packaging hari ini dan sisa setelah pemakaian. Stock Hari Ini akan tersimpan otomatis. Setelah Sisa diisi dan laporan dikirim, data akan dikirim ke Warehouse.
            </p>

            {/* Desktop table header */}
            <div className="hidden sm:grid grid-cols-12 gap-3 mb-2 px-4">
                <div className="col-span-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Barang</div>
                <div className="col-span-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Stock Hari Ini</div>
                <div className="col-span-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Sisa</div>
                <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Terpakai</div>
            </div>

            <div className="space-y-3">
                {items.map((item) => {
                    const terpakai = getTerpakai(item.id);
                    return (
                        <div key={item.id} className="bg-[#1A1A2E] rounded-xl p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                {/* Item name */}
                                <div className="sm:col-span-4">
                                    <h3 className="text-white text-base font-bold">{item.name}</h3>
                                    <p className="text-[#888] text-xs">{item.unit}</p>
                                </div>

                                {/* Stock Hari Ini */}
                                <div className="sm:col-span-3">
                                    <label className="block text-[#888] text-xs mb-1 sm:hidden">Stock Hari Ini</label>
                                    <input
                                        type="number"
                                        value={stockHariIni[item.id] || ''}
                                        onChange={(e) => handleStockHariIniChange(item.id, e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-[#252540] border border-[#303050] text-white text-center rounded-lg p-3 outline-none focus:border-[#FF6B6B] min-h-[44px] text-base"
                                    />
                                </div>

                                {/* Sisa */}
                                <div className="sm:col-span-3">
                                    <label className="block text-[#888] text-xs mb-1 sm:hidden">Sisa</label>
                                    <input
                                        type="number"
                                        value={sisa[item.id] || ''}
                                        onChange={(e) => handleSisaChange(item.id, e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-[#252540] border border-[#303050] text-white text-center rounded-lg p-3 outline-none focus:border-[#F5A623] min-h-[44px] text-base"
                                    />
                                </div>

                                {/* Terpakai */}
                                <div className="sm:col-span-2">
                                    <label className="block text-[#888] text-xs mb-1 sm:hidden">Terpakai</label>
                                    <div className={`text-center font-bold text-lg py-2 rounded-lg ${terpakai > 0 ? 'text-[#FF6B6B]' : 'text-gray-500'}`}>
                                        {terpakai}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {isLoading && (
                    <div className="py-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {!isLoading && items.length === 0 && (
                    <div className="py-12 text-center text-gray-500">
                        Belum ada item packaging. Admin perlu menambahkan item terlebih dahulu.
                    </div>
                )}
            </div>

            {/* Summary */}
            {!isLoading && items.length > 0 && (
                <div className="mt-6 bg-[#111118] rounded-xl p-4 border border-[#1A1A2E]">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm font-semibold">Total Terpakai</span>
                        <span className="text-[#FF6B6B] font-bold text-lg">{totalTerpakai}</span>
                    </div>
                </div>
            )}

            {/* Submitted History */}
            <div className="mt-6 mb-28">
                <button
                    onClick={() => {
                        setShowHistory(!showHistory);
                        if (!showHistory && submittedHistory.length === 0) fetchHistory();
                    }}
                    className="flex items-center gap-2 text-[#888] hover:text-white transition text-sm font-semibold"
                >
                    {showHistory ? '▼' : '▶'} Riwayat Laporan ({submittedHistory.length})
                </button>
                {showHistory && submittedHistory.length > 0 && (
                    <div className="mt-3 bg-[#111118] rounded-2xl border border-[#1A1A2E] overflow-hidden">
                        <div className="hidden sm:block">
                            <table className="w-full text-left">
                                <thead className="bg-[#1A1A2E]">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Tanggal</th>
                                        <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Barang</th>
                                        <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Stock</th>
                                        <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Sisa</th>
                                        <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Terpakai</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1A1A2E]">
                                    {submittedHistory.map((h: any) => (
                                        <tr key={h.id} className="hover:bg-[#1A1A2E]/50 transition">
                                            <td className="px-4 py-3 text-xs text-gray-400">
                                                {new Date(h.report_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-white font-medium">{h.packaging_items?.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-300 text-right">{h.stock_hari_ini}</td>
                                            <td className="px-4 py-3 text-sm text-gray-300 text-right">{h.sisa}</td>
                                            <td className="px-4 py-3 text-sm text-[#FF6B6B] font-bold text-right">{h.terpakai}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden divide-y divide-[#1A1A2E]">
                            {submittedHistory.slice(0, 20).map((h: any) => (
                                <div key={h.id} className="px-4 py-3">
                                    <div className="flex justify-between items-center">
                                        <p className="text-white text-sm font-medium">{h.packaging_items?.name}</p>
                                        <p className="text-[#FF6B6B] text-xs font-bold">{h.terpakai} terpakai</p>
                                    </div>
                                    <p className="text-gray-500 text-xs">
                                        Stock: {h.stock_hari_ini} | Sisa: {h.sisa} | {new Date(h.report_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {showHistory && submittedHistory.length === 0 && (
                    <p className="text-gray-500 text-sm mt-2">Belum ada laporan yang dikirim.</p>
                )}
            </div>

            {/* Fixed Bottom Button */}
            <div className="fixed bottom-0 left-0 right-0 sm:left-72 p-4 bg-gradient-to-t from-[#0D0D0D] from-40% to-transparent pointer-events-none">
                <button
                    onClick={handleKirimLaporan}
                    disabled={isSubmitting || isLoading}
                    className="w-full bg-[#FF6B6B] text-white font-bold py-3.5 px-4 rounded-xl shadow-[0_4px_8px_rgba(255,107,107,0.3)] pointer-events-auto hover:bg-red-500 disabled:opacity-50 transition min-h-[48px] text-base"
                >
                    {isSubmitting ? 'Mengirim...' : 'Kirim Laporan ke Warehouse'}
                </button>
            </div>

            <ConfirmModal
                open={confirmOpen}
                title="Kirim Laporan Stock"
                message="Laporan stock packaging hari ini akan dikirim ke Warehouse. Data akan direset setelah dikirim. Lanjutkan?"
                confirmLabel="Ya, Kirim"
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
