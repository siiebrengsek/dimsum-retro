import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getTransactions } from '../../utils/transactions';
import type { Transaction } from '../../utils/transactions';
import { getTodayDate } from '../../utils/dateUtils';
import { FaBox, FaWarehouse, FaUsers, FaHistory, FaChevronDown, FaChevronRight, FaSignOutAlt } from 'react-icons/fa';
import { useAuthStore } from '../../stores/auth.store';
import { Link } from 'react-router-dom';

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

    const [sales, setSales] = useState<SaleRow[]>([]);
    const [localTx, setLocalTx] = useState<Transaction[]>([]);
    const [dimsumTerjual, setDimsumTerjual] = useState(0);
    const [packagingReports, setPackagingReports] = useState<PackagingReport[]>([]);
    const [stockMenipisCount, setStockMenipisCount] = useState(0);
    const [staffProfiles, setStaffProfiles] = useState<{ id: string; outlet: string | null; username: string }[]>([]);
    const [stockReporterIds, setStockReporterIds] = useState<Set<string>>(new Set());
    const [packagingOutletSet, setPackagingOutletSet] = useState<Set<string>>(new Set());
    const [collapsedStaff, setCollapsedStaff] = useState<Set<string>>(new Set());
    const [productSort, setProductSort] = useState<Record<string, { key: string; dir: 'asc' | 'desc' }>>({});

    const profile = useAuthStore((s) => s.profile);
    const signOut = useAuthStore((s) => s.signOut);

    const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

    const fetchLocalSales = (date: string) => {
        const all = getTransactions();
        setLocalTx(all.filter((t) => t.createdAt.startsWith(date)));
    };

    const fetchStockReports = async (date: string) => {
        try {
            const { data } = await supabase
                .from('stock_reports')
                .select('terjual, reported_by')
                .eq('report_date', date);
            const total = (data || []).reduce((sum, r) => sum + (r.terjual || 0), 0);
            setDimsumTerjual(total);
            const ids = new Set((data || []).map((r) => r.reported_by).filter(Boolean));
            setStockReporterIds(ids);
        } catch (err) {
            console.error('Error fetching stock reports:', err);
        }
    };

    const fetchPackagingReports = async (date: string) => {
        try {
            const { data } = await supabase
                .from('packaging_reports')
                .select('*, packaging_items!inner(name, unit)')
                .eq('report_date', date);
            setPackagingReports(data || []);
            const outlets = new Set((data || []).map((r) => r.outlet).filter(Boolean));
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
                .lte('stock', 5);
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

    useEffect(() => {
        fetchLocalSales(selectedDate);
        const interval = setInterval(() => fetchLocalSales(selectedDate), 10000);
        return () => clearInterval(interval);
    }, [selectedDate]);

    useEffect(() => {
        const fetchAll = async () => {
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
            } catch (err) {
                console.error('Error fetching sales:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAll();
        fetchStockReports(selectedDate);
        fetchPackagingReports(selectedDate);
        fetchStockMenipis();
        fetchStaffProfiles();

        const interval = setInterval(() => {
            fetchAll();
            fetchStockReports(selectedDate);
            fetchPackagingReports(selectedDate);
            fetchStockMenipis();
        }, 30000);

        return () => clearInterval(interval);
    }, [selectedDate]);

    const totals = { tunai: 0, gojek: 0, grab: 0, shoppe: 0, qris: 0 };
    for (const s of sales) {
        const m = s.payment_method === 'gofood' ? 'gojek' : s.payment_method;
        if (m in totals) (totals as any)[m] += Number(s.amount || 0);
    }
    for (const t of localTx) {
        const m = paymentMethodMap[t.paymentMethod] || t.paymentMethod;
        if (m in totals) (totals as any)[m] += t.total;
    }

    const totalOmset = Object.values(totals).reduce((a, b) => a + b, 0);
    const omsetCash = totals.tunai;
    const omsetOnline = totals.gojek + totals.grab + totals.shoppe + totals.qris;
    const totalTransaksi = sales.length + localTx.length;

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
        staffId: 'local',
        name: 'Staff (Lokal)',
        outlet: '',
        tunai: 0, gojek: 0, grab: 0, shoppe: 0, qris: 0,
        total: 0, count: 0,
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
            if (existing) {
                existing.totalQty += item.quantity;
                existing.totalRevenue += item.price * item.quantity;
            } else {
                pMap.set(item.productName, { name: item.productName, totalQty: item.quantity, totalRevenue: item.price * item.quantity });
            }
        }
    }
    if (localTx.length > 0) {
        const staffKey = 'Staff (Lokal)';
        if (!perStaffProducts.has(staffKey)) perStaffProducts.set(staffKey, new Map());
        const pMap = perStaffProducts.get(staffKey)!;
        for (const t of localTx) {
            for (const item of t.items) {
                const existing = pMap.get(item.productName);
                if (existing) {
                    existing.totalQty += item.quantity;
                    existing.totalRevenue += item.price * item.quantity;
                } else {
                    pMap.set(item.productName, { name: item.productName, totalQty: item.quantity, totalRevenue: item.price * item.quantity });
                }
            }
        }
    }

    const allProducts = new Map<string, { name: string; totalQty: number; totalRevenue: number }>();
    for (const pMap of perStaffProducts.values()) {
        for (const [name, p] of pMap) {
            const existing = allProducts.get(name);
            if (existing) {
                existing.totalQty += p.totalQty;
                existing.totalRevenue += p.totalRevenue;
            } else {
                allProducts.set(name, { ...p });
            }
        }
    }
    const topProducts = Array.from(allProducts.values())
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 5);

    const cupTehReports = packagingReports.filter((r) => r.packaging_items?.name === 'Cup Teh');
    const cupTehTerpakai = cupTehReports.reduce((sum, r) => sum + r.terpakai, 0);

    const outletStatuses = new Map<string, { outlet: string; dimsum: boolean; packaging: boolean }>();
    for (const sp of staffProfiles) {
        const outlet = sp.outlet || sp.username || 'Unknown';
        if (!outletStatuses.has(outlet)) {
            outletStatuses.set(outlet, { outlet, dimsum: false, packaging: false });
        }
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
    const allComplete = outletStatusList.every((o) => o.dimsum && o.packaging);
    const submittedCount = outletStatusList.filter((o) => o.dimsum || o.packaging).length;

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-14 sm:h-16 items-center">
                        <div className="flex items-center gap-2 min-w-0">
                            <FaWarehouse className="text-primary-600 text-lg sm:text-2xl shrink-0" />
                            <span className="font-bold text-base sm:text-xl text-gray-900 truncate">Super Dashboard</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                            <span className="text-xs sm:text-sm text-gray-500 hidden xs:inline">
                                <span className="font-semibold text-gray-900">{profile?.role}</span>
                            </span>
                            <button
                                onClick={() => signOut()}
                                className="flex items-center gap-1.5 text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium transition-colors px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg hover:bg-red-50"
                            >
                                <FaSignOutAlt />
                                <span className="hidden xs:inline">Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
                {/* Header with Date */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ringkasan Semua Data</h1>
                        <p className="text-sm text-gray-500">Semua laporan dalam satu tampilan — real-time</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 font-medium">Tanggal:</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm py-1.5"
                        />
                        {localTx.length > 0 && (
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
                        {/* Row 1: Financial KPIs */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Omset Cash</p>
                                <p className="text-lg sm:text-2xl font-bold text-green-600 mt-1">{formatRupiah(omsetCash)}</p>
                                <p className="text-[10px] text-gray-400">Pembayaran Tunai</p>
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
                                <p className="text-[10px] text-gray-400">{sales.length} DB + {localTx.length} lokal</p>
                            </div>
                        </div>

                        {/* Row 2: Operational KPIs */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                            <Link to="/admin/stock-history" className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow block">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                                    <FaHistory className="inline mr-1 text-orange-500" />
                                    Cup Teh Terpakai
                                </p>
                                <p className="text-lg sm:text-2xl font-bold text-orange-600 mt-1">{cupTehTerpakai}</p>
                                <p className="text-[10px] text-gray-400">dari laporan packaging staff</p>
                            </Link>
                            <Link to="/admin/stock" className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow block">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                                    <FaBox className="inline mr-1 text-primary-600" />
                                    Dimsum Terjual
                                </p>
                                <p className="text-lg sm:text-2xl font-bold text-primary-600 mt-1">{dimsumTerjual}</p>
                                <p className="text-[10px] text-gray-400">dari laporan dimsum staff</p>
                            </Link>
                            <Link to="/admin/stock" className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow block">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                                    <FaWarehouse className="inline mr-1 text-red-500" />
                                    Stok Menipis
                                </p>
                                <p className={`text-lg sm:text-2xl font-bold mt-1 ${stockMenipisCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {stockMenipisCount} produk
                                </p>
                                <p className="text-[10px] text-gray-400">stok ≤ 5 — perlu restock</p>
                            </Link>
                            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                                    <FaUsers className="inline mr-1 text-purple-500" />
                                    Laporan Staff
                                </p>
                                <p className="text-lg sm:text-2xl font-bold text-purple-600 mt-1">
                                    {submittedCount}/{outletStatusList.length}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                    {allComplete ? 'Semua lengkap ✅' : `${outletStatusList.length - submittedCount} outlet belum lengkap`}
                                </p>
                            </div>
                        </div>

                        {/* Row 3: Payment Breakdown + Top Products (2 columns) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                            {/* Payment Method Breakdown */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">Metode Pembayaran</h3>
                                </div>
                                <div className="p-4 sm:p-6 space-y-3">
                                    {paymentColumns.map((pm) => {
                                        const val = (totals as any)[pm.key] || 0;
                                        const pct = totalOmset > 0 ? (val / totalOmset) * 100 : 0;
                                        return (
                                            <div key={pm.key}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-medium text-gray-700">{pm.label}</span>
                                                    <span className="text-gray-900 font-semibold">{formatRupiah(val)} <span className="text-gray-400 font-normal">({pct.toFixed(1)}%)</span></span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                                    <div
                                                        className={`${pm.bg} h-2.5 rounded-full transition-all duration-500`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Top 5 Products */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">Top 5 Produk Terjual</h3>
                                </div>
                                {topProducts.length === 0 ? (
                                    <div className="p-6 text-center text-gray-400 text-sm">Belum ada data produk terjual hari ini.</div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {topProducts.map((p, i) => (
                                            <div key={p.name} className="px-4 sm:px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-300'}`}>
                                                    {i + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                                                    <p className="text-xs text-gray-400">{p.totalQty} pcs terjual</p>
                                                </div>
                                                <span className="text-sm font-bold text-primary-600 shrink-0">{formatRupiah(p.totalRevenue)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 4: Staff Report Status */}
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

                        {/* Row 5: Per-Staff Sales (collapsible) */}
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
                                            {staffList.map((s) => {
                                                const cash = s.tunai;
                                                const online = s.gojek + s.grab + s.shoppe + s.qris;
                                                return (
                                                    <tr key={s.staffId} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-gray-900 text-sm">{s.name}</td>
                                                        {paymentColumns.map((pm) => (
                                                            <td key={pm.key} className="px-4 py-3 text-right text-gray-700 text-sm">{(s as any)[pm.key] > 0 ? formatRupiah((s as any)[pm.key]) : '-'}</td>
                                                        ))}
                                                        <td className="px-4 py-3 text-right font-semibold text-green-600 text-sm">{formatRupiah(cash)}</td>
                                                        <td className="px-4 py-3 text-right font-semibold text-blue-600 text-sm">{formatRupiah(online)}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-gray-900 text-sm">{formatRupiah(s.total)}</td>
                                                        <td className="px-4 py-3 text-right text-gray-500 text-sm">{s.count}</td>
                                                    </tr>
                                                );
                                            })}
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
                                    {staffList.map((s) => {
                                        const cash = s.tunai;
                                        const online = s.gojek + s.grab + s.shoppe + s.qris;
                                        return (
                                            <div key={s.staffId} className="p-4">
                                                <p className="font-bold text-gray-900 text-sm mb-2">{s.name} ({s.count} trx)</p>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    <div className="bg-green-50 rounded-lg p-2"><span className="text-gray-500">Cash</span><br /><span className="font-semibold text-green-600">{formatRupiah(cash)}</span></div>
                                                    <div className="bg-blue-50 rounded-lg p-2"><span className="text-gray-500">Online</span><br /><span className="font-semibold text-blue-600">{formatRupiah(online)}</span></div>
                                                    <div className="col-span-2 bg-gray-50 rounded-lg p-2 text-center"><span className="text-gray-500">Total</span><br /><span className="font-bold">{formatRupiah(s.total)}</span></div>
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {paymentColumns.filter(pm => (s as any)[pm.key] > 0).map(pm => (
                                                        <span key={pm.key} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{pm.label}: {(s as any)[pm.key].toLocaleString('id-ID')}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Row 6: Products per Staff (collapsible accordion) */}
                        {perStaffProducts.size > 0 && (
                            Array.from(perStaffProducts.entries()).map(([staffKey, pMap]) => {
                                const sortState = productSort[staffKey] || { key: '', dir: 'asc' };
                                let products = Array.from(pMap.values());
                                if (sortState.key === 'name') {
                                    products.sort((a, b) => sortState.dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
                                } else if (sortState.key === 'qty') {
                                    products.sort((a, b) => sortState.dir === 'asc' ? a.totalQty - b.totalQty : b.totalQty - a.totalQty);
                                } else {
                                    products.sort((a, b) => b.totalRevenue - a.totalRevenue);
                                }
                                const staffTotal = products.reduce((sum, p) => sum + p.totalRevenue, 0);
                                const isCollapsed = collapsedStaff.has(staffKey);

                                const toggleSort = (key: string) => {
                                    setProductSort(prev => {
                                        const current = prev[staffKey];
                                        if (current?.key === key) {
                                            return { ...prev, [staffKey]: { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } };
                                        }
                                        return { ...prev, [staffKey]: { key, dir: 'asc' } };
                                    });
                                };

                                const sortIcon = (key: string) => {
                                    if (sortState.key !== key) return '';
                                    return sortState.dir === 'asc' ? ' ↑' : ' ↓';
                                };

                                return (
                                    <div key={staffKey} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
                                        <button
                                            onClick={() => setCollapsedStaff(prev => {
                                                const next = new Set(prev);
                                                if (next.has(staffKey)) next.delete(staffKey);
                                                else next.add(staffKey);
                                                return next;
                                            })}
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
                                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase cursor-pointer select-none hover:text-primary-600 transition-colors" onClick={() => toggleSort('name')}>
                                                                    Produk<span className="text-primary-500">{sortIcon('name')}</span>
                                                                </th>
                                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right cursor-pointer select-none hover:text-primary-600 transition-colors" onClick={() => toggleSort('qty')}>
                                                                    Terjual<span className="text-primary-500">{sortIcon('qty')}</span>
                                                                </th>
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
                            })
                        )}

                        {/* Navigation to all admin pages */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">Menu Halaman Admin</h3>
                        </div>
                        <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            <Link to="/admin/inventory"
                                className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all group">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors shrink-0">
                                    <FaBox />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">Inventory</p>
                                    <p className="text-[10px] text-gray-400">Bahan Baku</p>
                                </div>
                            </Link>
                            <Link to="/admin/stock"
                                className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all group">
                                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-200 transition-colors shrink-0">
                                    <FaWarehouse />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">Stock Dimsum</p>
                                    <p className="text-[10px] text-gray-400">Produk & Laporan Staff</p>
                                </div>
                            </Link>
                            <Link to="/admin/sales"
                                className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all group">
                                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600 group-hover:bg-yellow-200 transition-colors shrink-0">
                                    <FaHistory />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">Sales Analysis</p>
                                    <p className="text-[10px] text-gray-400">Penjualan Per Staff</p>
                                </div>
                            </Link>
                            <Link to="/admin/stock-history"
                                className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all group">
                                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 group-hover:bg-orange-200 transition-colors shrink-0">
                                    <FaHistory />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">Stock History</p>
                                    <p className="text-[10px] text-gray-400">Packaging Staff</p>
                                </div>
                            </Link>
                            <Link to="/admin/staff"
                                className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all group">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors shrink-0">
                                    <FaUsers />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">Staff Mgmt</p>
                                    <p className="text-[10px] text-gray-400">Atur Profil Staff</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </main>
    </div>
);
};
