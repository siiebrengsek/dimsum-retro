import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { getTransactions } from '../../utils/transactions';
import type { Transaction } from '../../utils/transactions';
import { getTodayDate } from '../../utils/dateUtils';
import { FaBox, FaWarehouse, FaUsers, FaHistory, FaChevronDown, FaChevronRight, FaMoneyBillWave, FaSyncAlt } from 'react-icons/fa';

type SaleRow = {
    id: string;
    payment_method: string;
    amount: number;
    items_json: any[];
    staff_id: string;
    profiles?: { username?: string; email?: string; outlet?: string } | null;
};

type StaffSummary = {
    staffId: string;
    name: string;
    outlet: string;
    tunai: number;
    gojek: number;
    grab: number;
    shoppe: number;
    qris: number;
    total: number;
    count: number;
};

type PackagingReport = {
    id: number;
    staff_id: string;
    item_id: number;
    outlet: string;
    stock_hari_ini: number;
    sisa: number;
    terpakai: number;
    packaging_items: { name: string; unit: string };
};

const paymentMethodMap: Record<string, string> = {
    tunai: 'tunai',
    gofood: 'gojek',
    grab: 'grab',
    shoppe: 'shoppe',
    qris: 'qris',
};

const paymentColumns = [
    { key: 'tunai', label: 'Tunai', color: 'text-green-600', bg: 'bg-green-500' },
    { key: 'gojek', label: 'Gojek', color: 'text-green-500', bg: 'bg-green-400' },
    { key: 'grab', label: 'Grab', color: 'text-red-500', bg: 'bg-red-400' },
    { key: 'shoppe', label: 'Shopee', color: 'text-orange-500', bg: 'bg-orange-400' },
    { key: 'qris', label: 'QRIS', color: 'text-purple-600', bg: 'bg-purple-500' },
];

export const Dashboard = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [selectedOutlet, setSelectedOutlet] = useState<string | null>(null);

    const [sales, setSales] = useState<SaleRow[]>([]);
    const [localTx, setLocalTx] = useState<Transaction[]>([]);
    const [packagingReports, setPackagingReports] = useState<PackagingReport[]>([]);
    const [stockMenipisCount, setStockMenipisCount] = useState(0);
    const [staffProfiles, setStaffProfiles] = useState<{ id: string; outlet: string | null; username: string }[]>([]);
    const [stockReporterIds, setStockReporterIds] = useState<Set<string>>(new Set());
    const [packagingOutletSet, setPackagingOutletSet] = useState<Set<string>>(new Set());
    const [staffExpenses, setStaffExpenses] = useState<{ staff_id: string; amount: number; description: string; profiles?: { outlet?: string; username?: string } | null }[]>([]);
    const [enrichedStockReports, setEnrichedStockReports] = useState<any[]>([]);
    const [collapsedStaff, setCollapsedStaff] = useState<Set<string>>(new Set());
    const [productSort, setProductSort] = useState<Record<string, { key: string; dir: 'asc' | 'desc' }>>({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const [mutations, setMutations] = useState<any[]>([]);

    const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;
    const isFiltered = selectedOutlet !== null;

    const fetchLocalSales = (date: string) => {
        const all = getTransactions();
        setLocalTx(all.filter((t) => t.createdAt.startsWith(date)));
    };

    const dedupeStockReports = (items: any[]): any[] => {
        const seen = new Map<string, any>();
        for (const r of items) {
            const outlet = r.profiles?.outlet || r.reported_by;
            const key = `${r.product_name}|${outlet}|${r.report_date}`;
            const existing = seen.get(key);
            if (!existing || new Date(r.created_at) > new Date(existing.created_at)) {
                seen.set(key, r);
            }
        }
        return Array.from(seen.values());
    };

    const fetchStockReportsWithStore = async (date: string) => {
        try {
            const { data } = await supabase
                .from('stock_reports')
                .select('*')
                .eq('report_date', date)
                .order('created_at', { ascending: false });

            const enriched = await Promise.all((data || []).map(async (r) => {
                let outlet: string | null = null;
                if (r.reported_by) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('outlet')
                        .eq('id', r.reported_by)
                        .maybeSingle();
                    outlet = profile?.outlet || null;
                }
                return { ...r, profiles: outlet ? { outlet } : null };
            }));

            const deduped = dedupeStockReports(enriched);
            setEnrichedStockReports(deduped);
            const total = deduped.reduce((sum, r) => sum + (r.terjual || 0), 0);

            const ids = new Set((data || []).map((r) => r.reported_by).filter(Boolean));
            setStockReporterIds(ids);
            return total;
        } catch (err) {
            console.error('Error fetching stock reports:', err);
            return 0;
        }
    };

    const fetchPackagingReports = async (date: string) => {
        try {
            const { data } = await supabase
                .from('packaging_reports')
                .select('*, packaging_items!inner(name, unit)')
                .eq('report_date', date)
                .order('created_at', { ascending: false });
            const deduped = (data || []).reduce((acc: any[], r) => {
                const key = `${r.staff_id}|${r.item_id}`;
                if (!acc.some((x) => `${x.staff_id}|${x.item_id}` === key)) acc.push(r);
                return acc;
            }, []);
            setPackagingReports(deduped || []);
            const outlets = new Set((deduped || []).map((r) => r.outlet).filter(Boolean));
            setPackagingOutletSet(outlets);
        } catch (err) {
            console.error('Error fetching packaging reports:', err);
        }
    };

    const fetchStockMenipis = async () => {
        try {
            const { data } = await supabase
                .from('products')
                .select('id')
                .lte('stock', 250);
            setStockMenipisCount(data?.length || 0);
        } catch (err) {
            console.error('Error fetching low stock:', err);
        }
    };

    const fetchStaffProfiles = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, outlet, username')
                .neq('role', 'admin_warehouse');
            setStaffProfiles(data || []);
        } catch (err) {
            console.error('Error fetching staff profiles:', err);
        }
    };

    const fetchStaffExpenses = async (date: string) => {
        try {
            const { data } = await supabase
                .from('staff_expenses')
                .select('*, profiles!inner(outlet, username)')
                .eq('report_date', date);
            setStaffExpenses(data || []);
        } catch (err) {
            console.error('Error fetching staff expenses:', err);
        }
    };

    const fetchInventoryMutations = async (date: string) => {
        try {
            const { data } = await supabase
                .from('inventory_mutations')
                .select('*')
                .eq('report_date', date)
                .gt('quantity', 0)
                .order('created_at', { ascending: false });
            setMutations(data || []);
        } catch (err) {
            console.error('Error fetching inventory mutations:', err);
        }
    };

    useEffect(() => {
        fetchLocalSales(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                const [salesData] = await Promise.all([
                    supabase.from('sales').select('*').eq('transaction_date', selectedDate).order('created_at', { ascending: false }),
                ]);
                const enriched = await Promise.all((salesData.data || []).map(async (r) => {
                    let p: { username?: string; email?: string; outlet?: string } | null = null;
                    if (r.staff_id) {
                        const { data: pp } = await supabase.from('profiles').select('username, email, outlet').eq('id', r.staff_id).maybeSingle();
                        p = pp;
                    }
                    return { ...r, profiles: p };
                }));
                setSales(enriched as any);
            } catch {} finally { setIsLoading(false); }
        };
        init();
        fetchStockReportsWithStore(selectedDate);
        fetchPackagingReports(selectedDate);
        fetchStockMenipis();
        fetchStaffProfiles();
        fetchStaffExpenses(selectedDate);
        fetchInventoryMutations(selectedDate);
    }, [selectedDate]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        fetchLocalSales(selectedDate);
        try {
            const [salesData] = await Promise.all([
                supabase.from('sales').select('*').eq('transaction_date', selectedDate).order('created_at', { ascending: false }),
            ]);
            const enriched = await Promise.all((salesData.data || []).map(async (r) => {
                let p: { username?: string; email?: string; outlet?: string } | null = null;
                if (r.staff_id) {
                    const { data: pp } = await supabase.from('profiles').select('username, email, outlet').eq('id', r.staff_id).maybeSingle();
                    p = pp;
                }
                return { ...r, profiles: p };
            }));
            setSales(enriched as any);
        } catch {}
        await Promise.all([
            fetchStockReportsWithStore(selectedDate),
            fetchPackagingReports(selectedDate),
            fetchStockMenipis(),
            fetchStaffExpenses(selectedDate),
            fetchInventoryMutations(selectedDate),
        ]);
        setIsRefreshing(false);
    };

    // Computed data
    const staffOutletMap = useMemo(() => {
        const m = new Map<string, string>();
        for (const sp of staffProfiles) m.set(sp.id, sp.outlet || sp.username || 'Unknown');
        return m;
    }, [staffProfiles]);

    const outletList = useMemo(() => {
        const set = new Set<string>();
        for (const sp of staffProfiles) set.add(sp.outlet || sp.username || 'Unknown');
        return Array.from(set).sort();
    }, [staffProfiles]);

    const filteredSales = useMemo(() => {
        if (!isFiltered) return sales;
        return sales.filter((s) => (s.profiles?.outlet || staffOutletMap.get(s.staff_id) || '') === selectedOutlet);
    }, [sales, isFiltered, selectedOutlet, staffOutletMap]);

    const filteredPackaging = useMemo(() => {
        if (!isFiltered) return packagingReports;
        return packagingReports.filter((r) => r.outlet === selectedOutlet);
    }, [packagingReports, isFiltered, selectedOutlet]);

    const filteredExpenses = useMemo(() => {
        if (!isFiltered) return staffExpenses;
        return staffExpenses.filter((e) => (e.profiles?.outlet || staffOutletMap.get(e.staff_id) || '') === selectedOutlet);
    }, [staffExpenses, isFiltered, selectedOutlet, staffOutletMap]);

    const filteredDimsumTerjual = useMemo(() => {
        if (!isFiltered) return enrichedStockReports.reduce((sum, r) => sum + (r.terjual || 0), 0);
        return enrichedStockReports
            .filter((r) => r.profiles?.outlet === selectedOutlet)
            .reduce((sum, r) => sum + (r.terjual || 0), 0);
    }, [enrichedStockReports, isFiltered, selectedOutlet]);

    const packagingByOutlet = useMemo(() => {
        const map = new Map<string, PackagingReport[]>();
        for (const r of filteredPackaging) {
            const outlet = r.outlet || 'Unknown';
            if (!map.has(outlet)) map.set(outlet, []);
            map.get(outlet)!.push(r);
        }
        return map;
    }, [filteredPackaging]);

    const cupTehReports = filteredPackaging.filter((r) => r.packaging_items?.name === 'Cup Teh');
    const cupTehTerpakai = cupTehReports.reduce((sum, r) => sum + r.terpakai, 0);

    const totals = { tunai: 0, gojek: 0, grab: 0, shoppe: 0, qris: 0 };
    for (const s of filteredSales) {
        const m = s.payment_method === 'gofood' ? 'gojek' : s.payment_method;
        if (m in totals) (totals as any)[m] += Number(s.amount || 0);
    }
    if (!isFiltered) {
        for (const t of localTx) {
            const m = paymentMethodMap[t.paymentMethod] || t.paymentMethod;
            if (m in totals) (totals as any)[m] += t.total;
        }
    }
    const totalOmset = Object.values(totals).reduce((a, b) => a + b, 0);
    const omsetCash = totals.tunai;
    const omsetOnline = totals.gojek + totals.grab + totals.shoppe + totals.qris;
    const totalTransaksi = isFiltered ? filteredSales.length : filteredSales.length + localTx.length;
    const totalExpensesAmount = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const omsetCashBersih = Math.max(0, omsetCash - totalExpensesAmount);

    // Produk Terjual breakdown per metode bayar
    const produkTerjualList = useMemo(() => {
        const map = new Map<string, { tunai: number; gojek: number; grab: number; shoppe: number; qris: number; total: number }>();
        const addItems = (pm: string, items: any[]) => {
            const m = paymentMethodMap[pm] || pm;
            if (!(m in ({ tunai: 1, gojek: 1, grab: 1, shoppe: 1, qris: 1 }))) return;
            for (const item of items) {
                const name = item.productName || item.name || 'Unknown';
                if (!map.has(name)) map.set(name, { tunai: 0, gojek: 0, grab: 0, shoppe: 0, qris: 0, total: 0 });
                const entry = map.get(name)!;
                const qty = Number(item.quantity) || 0;
                (entry as any)[m] += qty;
                entry.total += qty;
            }
        };
        for (const s of filteredSales) {
            addItems(s.payment_method, s.items_json || []);
        }
        if (!isFiltered) {
            for (const t of localTx) {
                addItems(t.paymentMethod, t.items);
            }
        }
        return Array.from(map.entries()).map(([name, vals]) => ({ name, ...vals })).sort((a, b) => b.total - a.total);
    }, [filteredSales, localTx, isFiltered]);

    // Per-Staff data (only for unfiltered)
    const staffMap = new Map<string, StaffSummary>();
    for (const s of sales) {
        const sid = s.staff_id || 'unknown';
        if (!staffMap.has(sid)) {
            staffMap.set(sid, {
                staffId: sid,
                name: s.profiles?.outlet || s.profiles?.username || s.profiles?.email || sid.slice(0, 8),
                outlet: s.profiles?.outlet || '',
                tunai: 0, gojek: 0, grab: 0, shoppe: 0, qris: 0,
                total: 0, count: 0,
            });
        }
        const row = staffMap.get(sid)!;
        const m = s.payment_method === 'gofood' ? 'gojek' : s.payment_method;
        if (m in totals) (row as any)[m] += Number(s.amount || 0);
        row.total += Number(s.amount || 0);
        row.count += 1;
    }
    const localStaffEntry: StaffSummary = {
        staffId: 'local', name: 'Staff (Lokal)', outlet: '',
        tunai: 0, gojek: 0, grab: 0, shoppe: 0, qris: 0, total: 0, count: 0,
    };
    for (const t of localTx) {
        const m = paymentMethodMap[t.paymentMethod] || t.paymentMethod;
        if (m in localStaffEntry) (localStaffEntry as any)[m] += t.total;
        localStaffEntry.total += t.total;
        localStaffEntry.count += 1;
    }
    if (localTx.length > 0) staffMap.set('local', localStaffEntry);
    const staffList = Array.from(staffMap.values());

    const perStaffProducts = new Map<string, Map<string, { name: string; totalQty: number; totalRevenue: number }>>();
    const getStaffKey = (s: SaleRow) => s.profiles?.outlet || s.profiles?.username || s.staff_id?.slice(0, 8) || 'unknown';
    for (const s of sales) {
        const staffKey = getStaffKey(s);
        if (!perStaffProducts.has(staffKey)) perStaffProducts.set(staffKey, new Map());
        const pMap = perStaffProducts.get(staffKey)!;
        const items = s.items_json || [];
        for (const item of items) {
            const existing = pMap.get(item.productName);
            if (existing) { existing.totalQty += item.quantity; existing.totalRevenue += item.price * item.quantity; }
            else { pMap.set(item.productName, { name: item.productName, totalQty: item.quantity, totalRevenue: item.price * item.quantity }); }
        }
    }
    if (localTx.length > 0) {
        const staffKey = 'Staff (Lokal)';
        if (!perStaffProducts.has(staffKey)) perStaffProducts.set(staffKey, new Map());
        const pMap = perStaffProducts.get(staffKey)!;
        for (const t of localTx) {
            for (const item of t.items) {
                const existing = pMap.get(item.productName);
                if (existing) { existing.totalQty += item.quantity; existing.totalRevenue += item.price * item.quantity; }
                else { pMap.set(item.productName, { name: item.productName, totalQty: item.quantity, totalRevenue: item.price * item.quantity }); }
            }
        }
    }

    // Outlet status (for unfiltered)
    const outletStatuses = new Map<string, { outlet: string; dimsum: boolean; packaging: boolean }>();
    for (const sp of staffProfiles) {
        const outlet = sp.outlet || sp.username || 'Unknown';
        if (!outletStatuses.has(outlet)) outletStatuses.set(outlet, { outlet, dimsum: false, packaging: false });
    }
    for (const id of stockReporterIds) {
        const sp = staffProfiles.find((p) => p.id === id);
        if (sp) {
            const outlet = sp.outlet || sp.username || 'Unknown';
            const existing = outletStatuses.get(outlet);
            if (existing) existing.dimsum = true;
        }
    }
    for (const outlet of packagingOutletSet) {
        const existing = outletStatuses.get(outlet);
        if (existing) existing.packaging = true;
    }
    const outletStatusList = Array.from(outletStatuses.values());

    return (
        <>
        <div className="p-4 sm:p-6">
            <div className="max-w-full mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                            {isFiltered ? `Dashboard — ${selectedOutlet}` : 'Ringkasan Semua Data'}
                        </h1>
                        <p className="text-sm text-gray-500">Semua laporan dalam satu tampilan</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select value={selectedOutlet ?? ''} onChange={(e) => setSelectedOutlet(e.target.value || null)}
                            className="rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm py-1.5"
                        >
                            <option value="">Semua Outlet</option>
                            {outletList.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <label className="text-xs text-gray-500 font-medium">Tanggal:</label>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                            className="rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm py-1.5"
                        />
                        {localTx.length > 0 && !isFiltered && (
                            <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" title={`${localTx.length} transaksi lokal`} />
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-12 flex justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
                    </div>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Omset Cash Bersih</p>
                                <p className="text-lg sm:text-2xl font-bold text-green-600 mt-1">{formatRupiah(omsetCashBersih)}</p>
                                <p className="text-[10px] text-gray-400">Tunai dikurangi pengeluaran staff</p>
                            </div>
                            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Omset Online</p>
                                <p className="text-lg sm:text-2xl font-bold text-blue-600 mt-1">{formatRupiah(omsetOnline)}</p>
                                <p className="text-[10px] text-gray-400">QRIS + GoFood + Grab + Shopee</p>
                            </div>
                            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Omset</p>
                                <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{formatRupiah(totalOmset)}</p>
                                <p className="text-[10px] text-gray-400">Cash + Online</p>
                            </div>
                            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Transaksi</p>
                                <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{totalTransaksi}</p>
                                <p className="text-[10px] text-gray-400">{filteredSales.length} transaksi</p>
                            </div>
                        </div>

                        {/* Operational KPIs */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider"><FaHistory className="inline mr-1 text-orange-500" />Cup Teh Terpakai</p>
                                <p className="text-lg sm:text-2xl font-bold text-orange-600 mt-1">{cupTehTerpakai}</p>
                                <p className="text-[10px] text-gray-400">dari laporan packaging staff</p>
                            </div>
                            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider"><FaBox className="inline mr-1 text-primary-600" />Dimsum Terjual</p>
                                <p className="text-lg sm:text-2xl font-bold text-primary-600 mt-1">{filteredDimsumTerjual}</p>
                                <p className="text-[10px] text-gray-400">dari laporan dimsum staff</p>
                            </div>
                            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider"><FaMoneyBillWave className="inline mr-1 text-green-500" />Pengeluaran Staff</p>
                                <p className="text-lg sm:text-2xl font-bold text-green-600 mt-1">{formatRupiah(filteredExpenses.reduce((s, e) => s + Number(e.amount), 0))}</p>
                                <p className="text-[10px] text-gray-400">total pengeluaran hari ini</p>
                            </div>
                            {!isFiltered ? (
                                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider"><FaWarehouse className="inline mr-1 text-red-500" />Stok Menipis</p>
                                    <p className={`text-lg sm:text-2xl font-bold mt-1 ${stockMenipisCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{stockMenipisCount} produk</p>
                                    <p className="text-[10px] text-gray-400">stok ≤ 250 pcs — perlu restock</p>
                                </div>
                            ) : (
                                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider"><FaUsers className="inline mr-1 text-purple-500" />Outlet</p>
                                    <p className="text-lg sm:text-2xl font-bold mt-1 text-gray-900">{filteredSales.length} transaksi</p>
                                    <p className="text-[10px] text-gray-400">total transaksi outlet ini</p>
                                </div>
                            )}
                        </div>

                        {/* Produk Terjual breakdown per metode bayar */}
                        {produkTerjualList.length > 0 && (() => {
                            const isCollapsed = collapsedSections.has('produkTerjual');
                            return (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                                <button onClick={() => { const n = new Set(collapsedSections); if (n.has('produkTerjual')) n.delete('produkTerjual'); else n.add('produkTerjual'); setCollapsedSections(n); }}
                                    className="w-full px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 hover:bg-gray-100/50 transition-colors cursor-pointer text-left"
                                >
                                    {isCollapsed ? <FaChevronRight className="text-gray-400 text-xs" /> : <FaChevronDown className="text-gray-400 text-xs" />}
                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base flex-1">Produk Terjual — Per Metode Pembayaran</h3>
                                    {!isCollapsed && <span className="text-xs text-gray-400 font-normal">{produkTerjualList.length} produk</span>}
                                </button>
                                {!isCollapsed && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50/50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-4 sm:px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Produk</th>
                                                <th className="px-3 py-3 text-xs font-bold text-primary-700 uppercase text-right">Total</th>
                                                {paymentColumns.map((pm) => (
                                                    <th key={pm.key} className="px-3 py-3 text-xs font-bold text-gray-500 uppercase text-right">{pm.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {produkTerjualList.map((p) => (
                                                <tr key={p.name} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 sm:px-6 py-3 text-sm font-semibold text-gray-900">{p.name}</td>
                                                    <td className="px-3 py-3 text-right text-sm font-bold text-primary-700">{p.total}</td>
                                                    {paymentColumns.map((pm) => (
                                                        <td key={pm.key} className="px-3 py-3 text-right text-sm text-gray-700">{(p as any)[pm.key] || '-'}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50/80">
                                            <tr>
                                                <td className="px-4 sm:px-6 py-3 text-sm font-bold text-gray-900">Total</td>
                                                <td className="px-3 py-3 text-right text-sm font-bold text-primary-700">{produkTerjualList.reduce((s, p) => s + p.total, 0)}</td>
                                                {paymentColumns.map((pm) => {
                                                    const total = produkTerjualList.reduce((s, p) => s + ((p as any)[pm.key] || 0), 0);
                                                    return <td key={pm.key} className="px-3 py-3 text-right text-sm font-bold text-gray-900">{total}</td>;
                                                })}
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                )}
                            </div>
                            );
                        })()}

                        {/* Packaging per Staff */}
                        {packagingByOutlet.size > 0 && (() => {
                            const isCollapsed = collapsedSections.has('packaging');
                            return (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                                <button onClick={() => { const n = new Set(collapsedSections); if (n.has('packaging')) n.delete('packaging'); else n.add('packaging'); setCollapsedSections(n); }}
                                    className="w-full px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 hover:bg-gray-100/50 transition-colors cursor-pointer text-left"
                                >
                                    {isCollapsed ? <FaChevronRight className="text-gray-400 text-xs" /> : <FaChevronDown className="text-gray-400 text-xs" />}
                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base flex-1">Penggunaan Packaging Per Staff</h3>
                                    {!isCollapsed && <span className="text-xs text-gray-400 font-normal">{packagingByOutlet.size} outlet</span>}
                                </button>
                                {!isCollapsed && (
                                <>
                                {Array.from(packagingByOutlet.entries()).sort().map(([outlet, reports]) => {
                                    const totalPerOutlet = reports.reduce((s, r) => s + r.terpakai, 0);
                                    return (
                                        <div key={outlet} className="border-b border-gray-50 last:border-b-0">
                                            <div className="px-4 sm:px-6 py-3 flex items-center justify-between bg-gray-50/30">
                                                <span className="font-bold text-gray-900 text-sm">{outlet}</span>
                                                <span className="text-xs text-gray-500">Total terpakai: <span className="font-semibold text-orange-600">{totalPerOutlet}</span></span>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-gray-50/50">
                                                        <tr>
                                                            <th className="px-4 sm:px-6 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Barang</th>
                                                            <th className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-right">Stock</th>
                                                            <th className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-right">Sisa</th>
                                                            <th className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-right">Terpakai</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {reports.map((r) => (
                                                            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 sm:px-6 py-2.5 text-sm font-medium text-gray-900">
                                                                    {r.packaging_items?.name}
                                                                    <span className="text-xs text-gray-400 ml-1">({r.packaging_items?.unit})</span>
                                                                </td>
                                                                <td className="px-3 py-2.5 text-right text-sm text-gray-700">{r.stock_hari_ini}</td>
                                                                <td className="px-3 py-2.5 text-right text-sm text-gray-700">{r.sisa}</td>
                                                                <td className="px-3 py-2.5 text-right text-sm font-bold text-orange-600">{r.terpakai}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })}
                                </>
                                )}
                            </div>
                            );
                        })()}

                        {/* Pengeluaran Staff table */}
                        {filteredExpenses.length > 0 && (() => {
                            const isCollapsed = collapsedSections.has('expenses');
                            return (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                                <button onClick={() => { const n = new Set(collapsedSections); if (n.has('expenses')) n.delete('expenses'); else n.add('expenses'); setCollapsedSections(n); }}
                                    className="w-full px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 hover:bg-gray-100/50 transition-colors cursor-pointer text-left"
                                >
                                    {isCollapsed ? <FaChevronRight className="text-gray-400 text-xs" /> : <FaChevronDown className="text-gray-400 text-xs" />}
                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base flex-1"><FaMoneyBillWave className="inline mr-1.5 text-green-500" />Pengeluaran Staff</h3>
                                    {!isCollapsed && <span className="text-xs text-gray-400 font-normal">{formatRupiah(filteredExpenses.reduce((s, e) => s + Number(e.amount), 0))}</span>}
                                </button>
                                {!isCollapsed && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50/50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-4 sm:px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Staff / Outlet</th>
                                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Nominal</th>
                                                <th className="px-4 sm:px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Keterangan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredExpenses.map((exp, i) => (
                                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 sm:px-6 py-3 text-sm font-semibold text-gray-900">{exp.profiles?.outlet || exp.profiles?.username || exp.staff_id.slice(0, 8)}</td>
                                                    <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{formatRupiah(Number(exp.amount))}</td>
                                                    <td className="px-4 sm:px-6 py-3 text-sm text-gray-600">{exp.description}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50/80">
                                            <tr>
                                                <td className="px-4 sm:px-6 py-3 text-sm font-bold text-gray-900">Total</td>
                                                <td className="px-4 py-3 text-right text-sm font-bold text-green-700">{formatRupiah(filteredExpenses.reduce((s, e) => s + Number(e.amount), 0))}</td>
                                                <td className="px-4 sm:px-6 py-3" />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                )}
                            </div>
                            );
                        })()}

                        {/* Riwayat Pemakaian Bahan */}
                        {mutations.length > 0 && (() => {
                            const isCollapsed = collapsedSections.has('riwayatBahan');
                            const byOutlet = mutations.reduce((acc: Record<string, any[]>, r: any) => {
                                const outlet = r.outlet || 'Unknown';
                                if (!acc[outlet]) acc[outlet] = [];
                                acc[outlet].push(r);
                                return acc;
                            }, {});
                            return (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                                <button onClick={() => { const n = new Set(collapsedSections); if (n.has('riwayatBahan')) n.delete('riwayatBahan'); else n.add('riwayatBahan'); setCollapsedSections(n); }}
                                    className="w-full px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2 hover:bg-gray-100/50 transition-colors cursor-pointer text-left"
                                >
                                    {isCollapsed ? <FaChevronRight className="text-gray-400 text-xs" /> : <FaChevronDown className="text-gray-400 text-xs" />}
                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base flex-1"><FaHistory className="inline mr-1.5 text-orange-500" />Riwayat Pemakaian Bahan</h3>
                                    {!isCollapsed && <span className="text-xs text-gray-400 font-normal">{mutations.length} item</span>}
                                </button>
                                {!isCollapsed && (
                                <>
                                {Object.entries(byOutlet).sort(([a], [b]) => a.localeCompare(b)).map(([outlet, items]) => (
                                    <div key={outlet} className="border-b border-gray-50 last:border-b-0">
                                        <div className="px-4 sm:px-6 py-3 flex items-center justify-between bg-gray-50/30">
                                            <span className="font-bold text-gray-900 text-sm">{outlet}</span>
                                            <span className="text-xs text-gray-500">{items.length} item</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50/50">
                                                    <tr>
                                                        <th className="px-4 sm:px-6 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                                                        <th className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-right">Stok Awal</th>
                                                        <th className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-right">Terpakai</th>
                                                        <th className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-right">Stok Akhir</th>
                                                        <th className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase text-right">Waktu</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {items.map((r: any) => (
                                                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-4 sm:px-6 py-2.5 text-sm font-medium text-gray-900">{r.item_name}</td>
                                                            <td className="px-3 py-2.5 text-right text-sm text-gray-700">{r.stock_before}</td>
                                                            <td className="px-3 py-2.5 text-right text-sm font-bold text-orange-600">{r.quantity}</td>
                                                            <td className="px-3 py-2.5 text-right text-sm text-green-600 font-semibold">{r.stock_after}</td>
                                                            <td className="px-3 py-2.5 text-right text-xs text-gray-400">{new Date(r.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                                </>
                                )}
                            </div>
                            );
                        })()}

                        {/* Full sections — only for "Semua Outlet" */}
                        {!isFiltered && (
                            <>
                                {/* Staff Report Status */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                                    <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                        <h3 className="font-bold text-gray-900 text-sm sm:text-base">Status Laporan Staff — Hari Ini</h3>
                                        <p className="text-xs text-gray-500">Laporan dimsum (D) & packaging (P) per outlet</p>
                                    </div>
                                    {outletStatusList.length === 0 ? (
                                        <div className="p-6 text-center text-gray-400 text-sm">Tidak ada data staff.</div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                                    <tr>
                                                        <th className="px-4 sm:px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Outlet</th>
                                                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Dimsum</th>
                                                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Packaging</th>
                                                        <th className="px-4 sm:px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {outletStatusList.map((o) => (
                                                        <tr key={o.outlet} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-4 sm:px-6 py-3 text-sm font-semibold text-gray-900">{o.outlet}</td>
                                                            <td className="px-4 py-3 text-center text-lg">{o.dimsum ? '✅' : '❌'}</td>
                                                            <td className="px-4 py-3 text-center text-lg">{o.packaging ? '✅' : '❌'}</td>
                                                            <td className="px-4 sm:px-6 py-3 text-center">
                                                                {o.dimsum && o.packaging ? (
                                                                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">Lengkap</span>
                                                                ) : (
                                                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">Belum</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Products per Staff */}
                                {perStaffProducts.size > 0 && Array.from(perStaffProducts.entries()).map(([staffKey, pMap]) => {
                                    const sortState = productSort[staffKey] || { key: '', dir: 'asc' };
                                    let products = Array.from(pMap.values());
                                    if (sortState.key === 'name') products.sort((a, b) => sortState.dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
                                    else if (sortState.key === 'qty') products.sort((a, b) => sortState.dir === 'asc' ? a.totalQty - b.totalQty : b.totalQty - a.totalQty);
                                    else products.sort((a, b) => b.totalRevenue - a.totalRevenue);
                                    const staffTotal = products.reduce((sum, p) => sum + p.totalRevenue, 0);
                                    const isCollapsed = collapsedStaff.has(staffKey);
                                    return (
                                        <div key={staffKey} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
                                            <button onClick={() => setCollapsedStaff(prev => { const next = new Set(prev); if (next.has(staffKey)) next.delete(staffKey); else next.add(staffKey); return next; })}
                                                className="w-full px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center hover:bg-gray-100/50 transition-colors cursor-pointer text-left"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isCollapsed ? <FaChevronRight className="text-gray-400 text-xs" /> : <FaChevronDown className="text-gray-400 text-xs" />}
                                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">Produk Terjual — {staffKey}</h3>
                                                </div>
                                                <span className="text-xs text-gray-500 font-medium">{formatRupiah(staffTotal)}</span>
                                            </button>
                                            {!isCollapsed && (
                                                <>
                                                    <div className="hidden sm:block overflow-x-auto">
                                                        <table className="w-full text-left border-collapse">
                                                            <thead className="bg-gray-50/50">
                                                                <tr>
                                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase cursor-pointer select-none hover:text-primary-600 transition-colors" onClick={() => setProductSort(prev => { const c = prev[staffKey]; return { ...prev, [staffKey]: { key: 'name', dir: c?.key === 'name' ? (c.dir === 'asc' ? 'desc' : 'asc') : 'asc' } }; })}>Produk</th>
                                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right cursor-pointer select-none hover:text-primary-600 transition-colors" onClick={() => setProductSort(prev => { const c = prev[staffKey]; return { ...prev, [staffKey]: { key: 'qty', dir: c?.key === 'qty' ? (c.dir === 'asc' ? 'desc' : 'asc') : 'asc' } }; })}>Terjual</th>
                                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Pendapatan</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-50">
                                                                {products.map((p) => (
                                                                    <tr key={p.name} className="hover:bg-gray-50">
                                                                        <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                                                                        <td className="px-6 py-4 text-right text-gray-600">{p.totalQty}</td>
                                                                        <td className="px-6 py-4 text-right font-semibold text-primary-600">{formatRupiah(p.totalRevenue)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    <div className="sm:hidden divide-y divide-gray-50">
                                                        {products.map((p) => (
                                                            <div key={p.name} className="px-4 py-3 flex justify-between items-center">
                                                                <span className="text-sm font-medium text-gray-900">{p.name}</span>
                                                                <span className="text-sm text-gray-600">{p.totalQty}x <span className="text-primary-600 font-semibold">{formatRupiah(p.totalRevenue)}</span></span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                }                                )}

                                {/* Per-Staff Sales */}
                                {staffList.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                                        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">Penjualan Per Staff / Outlet</h3>
                                        </div>
                                        <div className="hidden sm:block overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-gray-50/50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Staff / Outlet</th>
                                                        {paymentColumns.map((pm) => (
                                                            <th key={pm.key} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">{pm.label}</th>
                                                        ))}
                                                        <th className="px-4 py-3 text-xs font-bold text-green-700 uppercase text-right">Cash</th>
                                                        <th className="px-4 py-3 text-xs font-bold text-blue-700 uppercase text-right">Online</th>
                                                        <th className="px-4 py-3 text-xs font-bold text-gray-900 uppercase text-right">Total</th>
                                                        <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Trx</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {staffList.map((s) => (
                                                        <tr key={s.staffId} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-900 text-sm">{s.name}</td>
                                                            {paymentColumns.map((pm) => (
                                                                <td key={pm.key} className="px-4 py-3 text-right text-gray-700 text-sm">{(s as any)[pm.key] > 0 ? formatRupiah((s as any)[pm.key]) : '-'}</td>
                                                            ))}
                                                            <td className="px-4 py-3 text-right font-semibold text-green-600 text-sm">{formatRupiah(s.tunai)}</td>
                                                            <td className="px-4 py-3 text-right font-semibold text-blue-600 text-sm">{formatRupiah(s.gojek + s.grab + s.shoppe + s.qris)}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-gray-900 text-sm">{formatRupiah(s.total)}</td>
                                                            <td className="px-4 py-3 text-right text-gray-500 text-sm">{s.count}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-gray-50/80 font-bold">
                                                        <td className="px-4 py-3 text-gray-900 text-sm">Total Semua Staff</td>
                                                        {paymentColumns.map((pm) => (
                                                            <td key={pm.key} className="px-4 py-3 text-right text-gray-900 text-sm">{formatRupiah((totals as any)[pm.key] || 0)}</td>
                                                        ))}
                                                        <td className="px-4 py-3 text-right text-green-700 text-sm">{formatRupiah(omsetCash)}</td>
                                                        <td className="px-4 py-3 text-right text-blue-700 text-sm">{formatRupiah(omsetOnline)}</td>
                                                        <td className="px-4 py-3 text-right text-gray-900 text-sm">{formatRupiah(totalOmset)}</td>
                                                        <td className="px-4 py-3 text-right text-gray-900 text-sm">{totalTransaksi}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="sm:hidden divide-y divide-gray-50">
                                            {staffList.map((s) => (
                                                <div key={s.staffId} className="p-4">
                                                    <p className="font-bold text-gray-900 text-sm mb-2">{s.name} ({s.count} trx)</p>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="bg-green-50 rounded-lg p-2"><span className="text-gray-500">Cash</span><br /><span className="font-semibold text-green-600">{formatRupiah(s.tunai)}</span></div>
                                                        <div className="bg-blue-50 rounded-lg p-2"><span className="text-gray-500">Online</span><br /><span className="font-semibold text-blue-600">{formatRupiah(s.gojek + s.grab + s.shoppe + s.qris)}</span></div>
                                                        <div className="col-span-2 bg-gray-50 rounded-lg p-2 text-center"><span className="text-gray-500">Total</span><br /><span className="font-bold">{formatRupiah(s.total)}</span></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </>
                        )}
                    </>
                )}
            </div>

            <button onClick={handleRefresh} disabled={isRefreshing}
                className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-primary-600 text-white px-5 py-3.5 rounded-full shadow-lg hover:bg-primary-700 transition-all disabled:opacity-70"
                title="Refresh data"
            >
                <FaSyncAlt className={isRefreshing ? 'animate-spin' : ''} />
                <span className="text-sm font-semibold">Refresh</span>
            </button>
        </div>
        </>
    );
};
