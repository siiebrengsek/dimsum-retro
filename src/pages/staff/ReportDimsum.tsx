import { useEffect, useState, memo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth.store';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AlertModal } from '../../components/AlertModal';
import { addToQueue } from '../../utils/offlineQueue';
import { getTodayDate } from '../../utils/dateUtils';

const STORAGE_KEY = 'dimsum_report_data';

const ProductRow = memo(({
    item,
    stockBatas,
    sisaDimsum,
    terjual,
    onStockBatasChange,
    onSisaDimsumChange
}: {
    item: any;
    stockBatas: string;
    sisaDimsum: string;
    terjual: number;
    onStockBatasChange: (id: number, val: string) => void;
    onSisaDimsumChange: (id: number, val: string) => void;
}) => (
    <div className="bg-[#1A1A2E] rounded-xl p-4 mb-3">
        <h3 className="text-white text-base font-bold mb-3">{item.name}</h3>

        <div className="flex gap-3">
            <div className="flex-1">
                <label className="block text-[#888] text-xs mb-1.5 text-center">Stok Bawaan</label>
                <input
                    type="number"
                    value={stockBatas || ''}
                    onChange={(e) => onStockBatasChange(item.id, e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#252540] border border-[#303050] text-white text-center rounded-lg p-3 outline-none focus:border-[#F5A623] min-h-[44px] text-base"
                />
            </div>
            <div className="flex-1">
                <label className="block text-[#888] text-xs mb-1.5 text-center">Sisa Hari Ini</label>
                <input
                    type="number"
                    value={sisaDimsum || ''}
                    onChange={(e) => onSisaDimsumChange(item.id, e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#252540] border border-[#303050] text-white text-center rounded-lg p-3 outline-none focus:border-[#F5A623] min-h-[44px] text-base"
                />
            </div>
        </div>
        {Number(stockBatas) > 0 && (
            <p className="mt-3 text-[#888] text-sm text-right">
                Terjual: <span className="text-[#F5A623] font-bold text-base">{terjual}</span>
            </p>
        )}
    </div>
));

export const ReportDimsum = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [alert, setAlert] = useState<{ type: 'info' | 'error' | 'success'; title: string; message: string } | null>(null);
    const user = useAuthStore((s) => s.user);

    const [stockBatas, setStockBatas] = useState<Record<string, string>>({});
    const [sisaDimsum, setSisaDimsum] = useState<Record<string, string>>({});

    const loadLocalData = useCallback(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setStockBatas(parsed.stockBatas || {});
                setSisaDimsum(parsed.sisaDimsum || {});
            }
        } catch { }
    }, []);

    const saveLocalData = useCallback((stock: Record<string, string>, sisa: Record<string, string>) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ stockBatas: stock, sisaDimsum: sisa }));
        } catch { }
    }, []);

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');
            if (error) throw error;
            setProducts(data || []);
        } catch (err) {
            console.error(err);
            setAlert({ type: 'error', title: 'Gagal', message: 'Gagal memuat produk dimsum' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        loadLocalData();
    }, [loadLocalData]);

    const handleStockBatasChange = (id: number, text: string) => {
        setStockBatas((prev) => {
            const next = { ...prev, [id]: text };
            saveLocalData(next, sisaDimsum);
            return next;
        });
    };

    const handleSisaDimsumChange = (id: number, text: string) => {
        setSisaDimsum((prev) => {
            const next = { ...prev, [id]: text };
            saveLocalData(stockBatas, next);
            return next;
        });
    };

    const getTerjual = (id: string) => {
        const bawa = Number(stockBatas[id]) || 0;
        const sisa = Number(sisaDimsum[id]) || 0;
        return Math.max(0, bawa - sisa);
    };

    const handleKirimLaporan = () => {
        if (!user) return;
        setConfirmOpen(true);
    };

    const processLaporan = async () => {
        setIsSubmitting(true);
        const today = getTodayDate();
        const reports = products
            .filter(p => Number(stockBatas[p.id]) > 0)
            .map(p => ({
                product_id: p.id,
                product_name: p.name,
                stock_bawaan: Number(stockBatas[p.id]) || 0,
                sisa_dimsum: Number(sisaDimsum[p.id]) || 0,
                terjual: getTerjual(p.id),
                reported_by: user?.id,
                report_date: today,
            }));
        try {
            if (reports.length === 0) {
                setAlert({ type: 'info', title: 'Info', message: 'Isi Stok Bawaan terlebih dahulu.' });
                setIsSubmitting(false);
                return;
            }

            const { error } = await supabase
                .from('stock_reports')
                .insert(reports);

            if (error) throw error;

            for (const r of reports) {
                const { error: deductError } = await supabase.rpc('deduct_stock_on_report', {
                    p_product_id: r.product_id,
                    p_quantity: r.terjual,
                    p_created_by: user?.id,
                    p_note: `Laporan: ${r.product_name}`,
                });
                if (deductError) console.error(`Gagal potong stok untuk ${r.product_name}:`, deductError);
            }

            setAlert({ type: 'success', title: 'Berhasil!', message: 'Laporan berhasil dikirim ke Admin. Stok terpusat otomatis terpotong.' });
            setStockBatas({});
            setSisaDimsum({});
            saveLocalData({}, {});
        } catch {
            addToQueue('stock_reports', 'insert', reports);
            setAlert({ type: 'info', title: 'Offline', message: 'Tidak ada koneksi. Data disimpan di lokal dan akan dikirim otomatis saat online.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 pb-48 max-w-3xl mx-auto h-full scroll-smooth">
            <div className="bg-[#F5A623] bg-opacity-10 rounded-xl p-4 mb-6">
                <h1 className="text-[#F5A623] font-bold text-lg">Laporan Harian (Sisa Dimsum)</h1>
            </div>

            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-white font-extrabold text-xl tracking-tight">Sisa Dimsum</h2>
            </div>

            <p className="text-[#888] text-sm mb-6 leading-relaxed">
                Isi "Stok Bawaan" dan "Sisa Hari Ini". Data tersimpan otomatis ke lokal. Terjual dihitung otomatis. Laporan dikirim ke Admin.
            </p>

            <div className="space-y-3">
                {isLoading ? (
                    <div className="py-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-[#F5A623] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="py-12 text-center text-[#888]">
                        <p className="text-lg mb-2">Belum ada produk dimsum.</p>
                        <p className="text-sm">Minta Admin untuk menambahkan produk terlebih dahulu.</p>
                    </div>
                ) : (
                    products.map((item) => (
                        <ProductRow
                            key={item.id}
                            item={item}
                            stockBatas={stockBatas[item.id] || ''}
                            sisaDimsum={sisaDimsum[item.id] || ''}
                            terjual={getTerjual(item.id)}
                            onStockBatasChange={handleStockBatasChange}
                            onSisaDimsumChange={handleSisaDimsumChange}
                        />
                    ))
                )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 sm:left-72 p-4 bg-gradient-to-t from-[#0D0D0D] from-40% to-transparent pointer-events-none">
                <button
                    onClick={handleKirimLaporan}
                    disabled={isSubmitting || isLoading}
                    className="w-full bg-[#F5A623] text-white font-bold py-3.5 px-4 rounded-xl shadow-[0_4px_8px_rgba(245,166,35,0.3)] pointer-events-auto hover:bg-orange-600 disabled:opacity-50 transition min-h-[48px] text-base"
                >
                    {isSubmitting ? 'Mengirim...' : 'Kirim Laporan ke Admin'}
                </button>
            </div>

            <ConfirmModal
                open={confirmOpen}
                title="Kirim Laporan"
                message="Laporan sisa dimsum akan dikirim ke Admin Warehouse. Lanjutkan?"
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
