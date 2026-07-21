import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth.store';
import { ConfirmModal } from '../../components/ConfirmModal';
import { AlertModal } from '../../components/AlertModal';
import { addToQueue } from '../../utils/offlineQueue';
import { getTodayDate } from '../../utils/dateUtils';

const STORAGE_KEY = 'dimsum_report_data';
const STORAGE_KEY_HARI_INI = 'dimsum_stock_hari_ini';
const STORAGE_KEY_SISA = 'dimsum_stock_sisa';

type PackagingItem = {
    id: number;
    name: string;
    unit: string;
};

type LocalData = Record<string, string>;

const ProductRow = ({
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
        <p className={`mt-3 text-[#888] text-sm text-right ${Number(stockBatas) > 0 ? '' : 'invisible'}`}>
            Terjual: <span className="text-[#F5A623] font-bold text-base">{terjual}</span>
        </p>
    </div>
);

export const ReportDimsum = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [alert, setAlert] = useState<{ type: 'info' | 'error' | 'success'; title: string; message: string } | null>(null);
    const user = useAuthStore((s) => s.user);
    const profile = useAuthStore((s) => s.profile);

    const [stockBatas, setStockBatas] = useState<Record<string, string>>({});
    const [sisaDimsum, setSisaDimsum] = useState<Record<string, string>>({});
    const [expenses, setExpenses] = useState<{ amount: string; description: string }[]>([]);
    const stockBatasRef = useRef(stockBatas);
    const sisaDimsumRef = useRef(sisaDimsum);
    const expensesRef = useRef(expenses);
    stockBatasRef.current = stockBatas;
    sisaDimsumRef.current = sisaDimsum;
    expensesRef.current = expenses;

    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDescription, setExpenseDescription] = useState('');

    const [submitVersion, setSubmitVersion] = useState(0);
    const [packagingItems, setPackagingItems] = useState<PackagingItem[]>([]);
    const [isPackagingLoading, setIsPackagingLoading] = useState(true);
    const [isPackagingSubmitting, setIsPackagingSubmitting] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [stockHariIni, setStockHariIni] = useState<LocalData>({});
    const [sisa, setSisa] = useState<LocalData>({});
    const [submittedHistory, setSubmittedHistory] = useState<any[]>([]);
    const [inventoryMap, setInventoryMap] = useState<Record<number, string[]>>({});

    const loadLocalData = useCallback(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setStockBatas(parsed.stockBatas || {});
                setSisaDimsum(parsed.sisaDimsum || {});
                setExpenses(parsed.expenses || []);
            }
        } catch { }
    }, []);

    const saveLocalData = useCallback((stock: Record<string, string>, sisa: Record<string, string>, exp: { amount: string; description: string }[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ stockBatas: stock, sisaDimsum: sisa, expenses: exp }));
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

    // Packaging handlers ----------------------------------------------------

    const loadPackagingLocalData = useCallback(() => {
        try {
            const savedHariIni = localStorage.getItem(STORAGE_KEY_HARI_INI);
            if (savedHariIni) setStockHariIni(JSON.parse(savedHariIni));
            const savedSisa = localStorage.getItem(STORAGE_KEY_SISA);
            if (savedSisa) setSisa(JSON.parse(savedSisa));
        } catch { }
    }, []);

    const savePackagingLocalHariIni = useCallback((data: LocalData) => {
        try { localStorage.setItem(STORAGE_KEY_HARI_INI, JSON.stringify(data)); } catch { }
    }, []);

    const savePackagingLocalSisa = useCallback((data: LocalData) => {
        try { localStorage.setItem(STORAGE_KEY_SISA, JSON.stringify(data)); } catch { }
    }, []);

    const clearPackagingLocalData = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY_HARI_INI);
            localStorage.removeItem(STORAGE_KEY_SISA);
        } catch { }
    }, []);

    const fetchPackagingItems = async () => {
        setIsPackagingLoading(true);
        try {
            const [packRes, invRes] = await Promise.all([
                supabase.from('packaging_items').select('*').order('name'),
                supabase.from('inventory').select('id, item_name'),
            ]);
            if (packRes.error) throw packRes.error;
            setPackagingItems(packRes.data || []);

            // Build mapping: packaging item name -> inventory IDs
            const map: Record<number, string[]> = {};
            const invItems = invRes.data || [];
            for (const p of packRes.data || []) {
                const name = (p.name || '').toLowerCase();
                const matched = invItems
                    .filter((inv) => inv.item_name.toLowerCase().includes(name))
                    .map((inv) => inv.id);
                if (matched.length > 0) map[p.id] = matched;
            }
            setInventoryMap(map);
        } catch (err: any) {
            console.error(err);
            setAlert({ type: 'error', title: 'Gagal', message: 'Gagal memuat daftar barang - ' + err.message });
        } finally {
            setIsPackagingLoading(false);
        }
    };

    const fetchPackagingHistory = async () => {
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
        fetchPackagingItems();
        loadPackagingLocalData();
    }, [loadPackagingLocalData]);

    const handleStockBatasChange = (id: number, text: string) => {
        const next = { ...stockBatas, [id]: text };
        setStockBatas(next);
        saveLocalData(next, sisaDimsum, expenses);
    };

    const handleSisaDimsumChange = (id: number, text: string) => {
        const next = { ...sisaDimsum, [id]: text };
        setSisaDimsum(next);
        saveLocalData(stockBatas, next, expenses);
    };

    const handleAddExpense = () => {
        if (!expenseAmount || !expenseDescription) return;
        const next = [...expenses, { amount: expenseAmount, description: expenseDescription }];
        setExpenses(next);
        saveLocalData(stockBatas, sisaDimsum, next);
        setExpenseAmount('');
        setExpenseDescription('');
    };

    const handleRemoveExpense = (index: number) => {
        const next = expenses.filter((_, i) => i !== index);
        setExpenses(next);
        saveLocalData(stockBatas, sisaDimsum, next);
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
        const sb = stockBatasRef.current;
        const sd = sisaDimsumRef.current;
        const exps = expensesRef.current;

        const reports = products
            .filter(p => Number(sb[p.id]) > 0)
            .map(p => ({
                product_id: p.id,
                product_name: p.name,
                stock_bawaan: Number(sb[p.id]) || 0,
                sisa_dimsum: Number(sd[p.id]) || 0,
                terjual: Math.max(0, (Number(sb[p.id]) || 0) - (Number(sd[p.id]) || 0)),
                reported_by: user?.id,
                report_date: today,
            }));

        if (reports.length === 0) {
            setAlert({ type: 'info', title: 'Info', message: 'Isi Stok Bawaan terlebih dahulu.' });
            setIsSubmitting(false);
            return;
        }

        try {
            const { data: oldReports, error: fetchError } = await supabase
                .from('stock_reports')
                .select('product_id, terjual')
                .eq('report_date', today)
                .eq('reported_by', user?.id);

            if (fetchError) throw fetchError;

            const oldTerjualMap = new Map<number, number>(
                (oldReports || []).map(r => [r.product_id, r.terjual])
            );

            const { error: deleteError } = await supabase
                .from('stock_reports')
                .delete()
                .eq('report_date', today)
                .eq('reported_by', user?.id);

            if (deleteError) throw deleteError;

            const { error: insertError } = await supabase
                .from('stock_reports')
                .insert(reports);

            if (insertError) throw insertError;

            for (const r of reports) {
                const oldTerjual = oldTerjualMap.get(r.product_id) || 0;

                if (oldTerjual > 0) {
                    const { error: reverseError } = await supabase.rpc('deduct_stock_on_report', {
                        p_product_id: r.product_id,
                        p_quantity: -oldTerjual,
                        p_created_by: user?.id,
                        p_note: `Revisi: ${r.product_name}`,
                    });
                    if (reverseError) throw reverseError;
                }

                const { error: deductError } = await supabase.rpc('deduct_stock_on_report', {
                    p_product_id: r.product_id,
                    p_quantity: r.terjual,
                    p_created_by: user?.id,
                    p_note: `Laporan: ${r.product_name}`,
                });
                if (deductError) throw deductError;
            }

            if (exps.length > 0) {
                const { error: delExp } = await supabase
                    .from('staff_expenses')
                    .delete()
                    .eq('report_date', today)
                    .eq('staff_id', user?.id);
                if (delExp) throw delExp;

                const expenseInserts = exps.map(e => ({
                    staff_id: user?.id,
                    amount: Number(e.amount),
                    description: e.description,
                    report_date: today,
                }));
                const { error: expError } = await supabase.from('staff_expenses').insert(expenseInserts);
                if (expError) throw expError;
            }

            setAlert({ type: 'success', title: 'Berhasil!', message: 'Laporan berhasil dikirim ke Admin. Stok terpusat otomatis terpotong.' });
            setStockBatas({});
            setSisaDimsum({});
            setExpenses([]);
            setSubmitVersion(v => v + 1);
            saveLocalData({}, {}, []);
        } catch {
            addToQueue('stock_reports', 'insert', reports);
            if (expenses.length > 0) {
                addToQueue('staff_expenses', 'insert', expenses.map(e => ({
                    staff_id: user?.id,
                    amount: Number(e.amount),
                    description: e.description,
                    report_date: today,
                })));
            }
            setAlert({ type: 'info', title: 'Offline', message: 'Tidak ada koneksi. Data disimpan di lokal dan akan dikirim otomatis saat online.' });
            setStockBatas({});
            setSisaDimsum({});
            setExpenses([]);
            saveLocalData({}, {}, []);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStockHariIniChange = (id: number, value: string) => {
        setStockHariIni((prev) => {
            const next = { ...prev, [id]: value };
            savePackagingLocalHariIni(next);
            return next;
        });
    };

    const handleSisaChange = (id: number, value: string) => {
        setSisa((prev) => {
            const next = { ...prev, [id]: value };
            savePackagingLocalSisa(next);
            return next;
        });
    };

    const getTerpakai = (id: number): number => {
        const hariIni = Number(stockHariIni[id]) || 0;
        const sisaVal = Number(sisa[id]) || 0;
        return Math.max(0, hariIni - sisaVal);
    };

    const processPackagingLaporan = async () => {
        setIsPackagingSubmitting(true);
        try {
            const outlet = (profile as any)?.outlet || 'Unknown';

            const rows = packagingItems
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
                setIsPackagingSubmitting(false);
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

            // Also update inventory: kurangi stok & catat mutasi
            for (const r of rows) {
                if (r.terpakai <= 0) continue;
                const invIds = inventoryMap[r.item_id] || [];
                for (const invId of invIds) {
                    const { data: inv } = await supabase.from('inventory').select('quantity, item_name').eq('id', invId).maybeSingle();
                    if (inv) {
                        const stockBefore = Number(inv.quantity);
                        const newQty = Math.max(0, stockBefore - r.terpakai);
                        await supabase.from('inventory').update({ quantity: newQty }).eq('id', invId);
                        await supabase.from('inventory_mutations').insert([{
                            inventory_id: invId,
                            item_name: inv.item_name,
                            type: 'pemakaian',
                            quantity: r.terpakai,
                            stock_before: stockBefore,
                            stock_after: newQty,
                            source: 'packaging_report',
                            report_date: getTodayDate(),
                            outlet,
                        }]);
                    }
                }
            }

            setAlert({ type: 'success', title: 'Berhasil!', message: 'Laporan stock packaging berhasil dikirim ke Warehouse.' });
            clearPackagingLocalData();
            setStockHariIni({});
            setSisa({});
            fetchPackagingHistory();

        } catch {
            for (const item of packagingItems) {
                const stockHariIniVal = Number(stockHariIni[item.id]) || 0;
                if (stockHariIniVal > 0) {
                    const terpakai = Math.max(0, stockHariIniVal - (Number(sisa[item.id]) || 0));
                    const invIds = inventoryMap[item.id] || [];
                    addToQueue('packaging_reports', 'insert', {
                        staff_id: user!.id, item_id: item.id, outlet: (profile as any)?.outlet || 'Unknown',
                        report_date: getTodayDate(),
                        stock_hari_ini: stockHariIniVal,
                        sisa: Number(sisa[item.id]) || 0,
                        terpakai,
                        inventory_decrements: invIds.map((id) => ({ id, terpakai, item_name: item.name, outlet: (profile as any)?.outlet || 'Unknown' })),
                    });
                }
            }
            setAlert({ type: 'info', title: 'Offline', message: 'Tidak ada koneksi. Data disimpan di lokal dan akan dikirim otomatis saat online.' });
        } finally {
            setIsPackagingSubmitting(false);
        }
    };

    const totalTerpakai = packagingItems.reduce((sum, item) => sum + getTerpakai(item.id), 0);

    return (
        <div className="p-4 sm:p-6 pb-64 max-w-3xl mx-auto min-h-full scroll-smooth">
            {/* Dimsum Section */}
            <div className="bg-[#F5A623] bg-opacity-10 rounded-xl p-4 mb-6">
                <h1 className="text-[#F5A623] font-bold text-lg">Laporan Harian (Sisa Dimsum)</h1>
            </div>

            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-white font-extrabold text-xl tracking-tight">Sisa Dimsum</h2>
            </div>

            <p className="text-[#888] text-sm mb-6 leading-relaxed">
                Isi "Stok Bawaan" dan "Sisa Hari Ini". Data tersimpan otomatis ke lokal. Terjual dihitung otomatis. Laporan dikirim ke Admin.
            </p>

            <div key={submitVersion} className="space-y-3">
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

            <div className="bg-[#1A1A2E] rounded-xl p-4 mb-6">
                <h3 className="text-[#F5A623] font-bold text-base mb-4">Pengeluaran Hari Ini</h3>

                <div className="flex gap-3 mb-3">
                    <div className="flex-1">
                        <label className="block text-[#888] text-xs mb-1.5">Nominal (Rp)</label>
                        <input
                            type="number"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            placeholder="0"
                            className="w-full bg-[#252540] border border-[#303050] text-white rounded-lg p-3 outline-none focus:border-[#F5A623] min-h-[44px] text-base"
                        />
                    </div>
                    <div className="flex-[2]">
                        <label className="block text-[#888] text-xs mb-1.5">Keterangan</label>
                        <input
                            type="text"
                            value={expenseDescription}
                            onChange={(e) => setExpenseDescription(e.target.value)}
                            placeholder="Misal: Beli plastik, minyak, dll"
                            className="w-full bg-[#252540] border border-[#303050] text-white rounded-lg p-3 outline-none focus:border-[#F5A623] min-h-[44px] text-base"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={handleAddExpense}
                            disabled={!expenseAmount || !expenseDescription}
                            className="bg-[#F5A623] text-white font-bold px-4 py-3 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition min-h-[44px]"
                        >
                            Tambah
                        </button>
                    </div>
                </div>

                {expenses.length > 0 && (
                    <div className="space-y-2">
                        {expenses.map((exp, i) => (
                            <div key={i} className="flex items-center justify-between bg-[#252540] rounded-lg px-4 py-3">
                                <div>
                                    <span className="text-white font-bold">Rp {Number(exp.amount).toLocaleString('id-ID')}</span>
                                    <span className="text-[#888] text-sm ml-3">{exp.description}</span>
                                </div>
                                <button
                                    onClick={() => handleRemoveExpense(i)}
                                    className="text-red-400 hover:text-red-300 text-sm font-bold"
                                >
                                    Hapus
                                </button>
                            </div>
                        ))}
                        <p className="text-[#888] text-xs text-right">
                            Total: <span className="text-white font-bold">Rp {expenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString('id-ID')}</span>
                        </p>
                    </div>
                )}
            </div>

            {/* Packaging Section */}
            <div className="bg-[#FF6B6B] bg-opacity-10 rounded-xl p-4 mb-6 mt-10">
                <h1 className="text-[#FF6B6B] font-bold text-lg">Stock Packaging Hari Ini</h1>
            </div>

            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-white font-extrabold text-xl tracking-tight">Input Stock</h2>
                <span className="text-sm text-gray-400">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>

            <p className="text-[#888] text-sm mb-6 leading-relaxed">
                Isi stock packaging hari ini dan sisa setelah pemakaian. Stock Hari Ini akan tersimpan otomatis. Setelah Sisa diisi dan laporan dikirim, data akan dikirim ke Warehouse.
            </p>

            <div className="hidden sm:grid grid-cols-12 gap-3 mb-2 px-4">
                <div className="col-span-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Barang</div>
                <div className="col-span-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Stock Hari Ini</div>
                <div className="col-span-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Sisa</div>
                <div className="col-span-2 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Terpakai</div>
            </div>

            <div className="space-y-3">
                {packagingItems.map((item) => {
                    const terpakai = getTerpakai(item.id);
                    return (
                        <div key={item.id} className="bg-[#1A1A2E] rounded-xl p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                <div className="sm:col-span-4">
                                    <h3 className="text-white text-base font-bold">{item.name}</h3>
                                    <p className="text-[#888] text-xs">{item.unit}</p>
                                </div>
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

                {isPackagingLoading && (
                    <div className="py-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {!isPackagingLoading && packagingItems.length === 0 && (
                    <div className="py-12 text-center text-gray-500">
                        Belum ada item packaging. Admin perlu menambahkan item terlebih dahulu.
                    </div>
                )}
            </div>

            {!isPackagingLoading && packagingItems.length > 0 && (
                <div className="mt-6 bg-[#111118] rounded-xl p-4 border border-[#1A1A2E]">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm font-semibold">Total Terpakai</span>
                        <span className="text-[#FF6B6B] font-bold text-lg">{totalTerpakai}</span>
                    </div>
                </div>
            )}

            <div className="mt-6">
                <button
                    onClick={() => {
                        setShowHistory(!showHistory);
                        if (!showHistory && submittedHistory.length === 0) fetchPackagingHistory();
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

            {/* Fixed Bottom Button — Kirim Laporan */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-72 bg-[#0D0D0D] border-t border-[#1A1A2E] p-4 pointer-events-none">
                <button
                    onClick={handleKirimLaporan}
                    disabled={isSubmitting || isPackagingSubmitting || isLoading || isPackagingLoading}
                    className="w-full bg-[#F5A623] text-white font-bold py-3.5 px-4 rounded-xl shadow-[0_4px_8px_rgba(245,166,35,0.3)] pointer-events-auto hover:bg-orange-600 disabled:opacity-50 transition min-h-[48px] text-base"
                >
                    {isSubmitting || isPackagingSubmitting ? 'Mengirim...' : 'Kirim Laporan ke Admin'}
                </button>
            </div>

            <ConfirmModal
                open={confirmOpen}
                title="Kirim Laporan"
                message="Laporan sisa dimsum dan stock packaging akan dikirim ke Admin Warehouse. Lanjutkan?"
                confirmLabel="Ya, Kirim"
                cancelLabel="Batal"
                onConfirm={() => { setConfirmOpen(false); processLaporan(); processPackagingLaporan(); }}
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
