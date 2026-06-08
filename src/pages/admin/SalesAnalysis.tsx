import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FaChevronDown, FaChevronRight, FaFileAlt, FaSyncAlt } from 'react-icons/fa';
import { getTransactions } from '../../utils/transactions';
import type { Transaction } from '../../utils/transactions';
import { getTodayDate } from '../../utils/dateUtils';

type SaleRow = {
    id: string;
    payment_method: string;
    amount: number;
    items_json: any[];
    staff_id: string;
    transaction_date: string;
    created_at: string;
    profiles?: { username?: string; email?: string; outlet?: string } | null;
};

type StaffSummary = {
    staffId: string;
    name: string;
    tunai: number;
    gojek: number;
    grab: number;
    shoppe: number;
    qris: number;
    total: number;
    count: number;
};

type StockReport = {
    id: string;
    product_name: string;
    stock_bawaan: number;
    sisa_dimsum: number;
    terjual: number;
    reported_by: string;
    report_date: string;
    created_at: string;
    profiles?: { outlet?: string } | null;
};

const paymentMethodMap: Record<string, string> = {
    tunai: 'tunai',
    gofood: 'gojek',
    grab: 'grab',
    shoppe: 'shoppe',
    qris: 'qris',
};

export const SalesAnalysis = () => {
    const [sales, setSales] = useState<SaleRow[]>([]);
    const [localTx, setLocalTx] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [collapsedStaff, setCollapsedStaff] = useState<Set<string>>(new Set());
    const [productSort, setProductSort] = useState<Record<string, { key: string; dir: 'asc' | 'desc' }>>({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [reports, setReports] = useState<StockReport[]>([]);
    const [isReportsLoading, setIsReportsLoading] = useState(true);

    const fetchLocalSales = (date: string) => {
        const all = getTransactions();
        const filtered = all.filter((t) => t.createdAt.startsWith(date));
        setLocalTx(filtered);
    };

    useEffect(() => {
        fetchLocalSales(selectedDate);
    }, [selectedDate]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('sales')
                    .select('*')
                    .eq('transaction_date', selectedDate)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const enriched = await Promise.all((data || []).map(async (r) => {
                    let profile: { username?: string; email?: string; outlet?: string } | null = null;
                    if (r.staff_id) {
                        const { data: p } = await supabase
                            .from('profiles')
                            .select('username, email, outlet')
                            .eq('id', r.staff_id)
                            .maybeSingle();
                        profile = p;
                    }
                    return { ...r, profiles: profile };
                }));

                setSales(enriched as any);
            } catch (error) {
                console.error('Error fetching sales:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedDate]);

    const dedupeReports = (items: StockReport[]): StockReport[] => {
        const seen = new Map<string, StockReport>();
        for (const r of items) {
            const outlet = r.profiles?.outlet || r.reported_by;
            const key = `${r.product_name}|${outlet}|${r.report_date}`;
            const existing = seen.get(key);
            if (!existing ||
                new Date(r.created_at).getTime() > new Date(existing.created_at).getTime() ||
                (new Date(r.created_at).getTime() === new Date(existing.created_at).getTime() && r.id > existing.id)) {
                seen.set(key, r);
            }
        }
        return Array.from(seen.values()).sort((a, b) => {
            const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (timeDiff !== 0) return timeDiff;
            return Number(b.id) - Number(a.id);
        });
    };

    const fetchReports = async () => {
        setIsReportsLoading(true);
        try {
            const { data, error } = await supabase
                .from('stock_reports')
                .select('*')
                .eq('report_date', selectedDate)
                .order('report_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;

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

            const deduped = dedupeReports(enriched as StockReport[]);
            setReports(deduped);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setIsReportsLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [selectedDate]);

    const totals = {
        tunai: 0, gojek: 0, grab: 0, shoppe: 0, qris: 0,
    };
    for (const s of sales) {
        const m = s.payment_method === 'gofood' ? 'gojek' : s.payment_method;
        if (m in totals) (totals as any)[m] += Number(s.amount || 0);
    }
    for (const t of localTx) {
        const m = paymentMethodMap[t.paymentMethod] || t.paymentMethod;
        if (m in totals) (totals as any)[m] += t.total;
    }

    const staffMap = new Map<string, StaffSummary>();
    for (const s of sales) {
        const sid = s.staff_id || 'unknown';
        if (!staffMap.has(sid)) {
            staffMap.set(sid, {
                staffId: sid,
                name: s.profiles?.outlet || s.profiles?.username || s.profiles?.email || sid.slice(0, 8),
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

    const totalAll = Object.values(totals).reduce((a, b) => a + b, 0);
    const todayFromLocal = localTx.reduce((sum, t) => sum + t.total, 0);
    const totalCash = totals.tunai;
    const totalOnline = totals.gojek + totals.grab + totals.shoppe + totals.qris;
    const totalTransaksi = sales.length + localTx.length;

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

    const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

    const paymentColumns = [
        { key: 'tunai', label: 'Tunai', color: 'text-green-600' },
        { key: 'gojek', label: 'Gojek', color: 'text-green-500' },
        { key: 'grab', label: 'Grab', color: 'text-red-500' },
        { key: 'shoppe', label: 'Shopee', color: 'text-orange-500' },
        { key: 'qris', label: 'QRIS', color: 'text-purple-600' },
    ];

    return (
        <>
        <div className="p-4 sm:p-6">
            <div className="max-w-full mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analisis Penjualan</h1>
                    <p className="text-sm text-gray-600">Data penjualan dari sistem POS Staff — real-time</p>
                    {localTx.length > 0 && (
                        <p className="text-xs text-green-600 font-medium mt-1">
                            ● {localTx.length} transaksi dari localStorage (real-time)
                        </p>
                    )}
                </div>

                {/* Date Filter */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter Tanggal</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500">
                            Omset Hari Ini
                            {localTx.length > 0 && <span className="ml-1 inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                        </p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-900">{formatRupiah(totalAll)}</p>
                        {todayFromLocal > 0 && (
                            <p className="text-[10px] text-green-600 font-medium">Rp {(totalAll - todayFromLocal).toLocaleString('id-ID')} (DB) + Rp {todayFromLocal.toLocaleString('id-ID')} (lokal)</p>
                        )}
                    </div>
                    <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500">Omset Cash</p>
                        <p className="text-lg sm:text-2xl font-bold text-green-600">{formatRupiah(totalCash)}</p>
                        <p className="text-[10px] text-gray-400">Hanya Tunai</p>
                    </div>
                    <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500">Omset Online</p>
                        <p className="text-lg sm:text-2xl font-bold text-blue-600">{formatRupiah(totalOnline)}</p>
                        <p className="text-[10px] text-gray-400">QRIS + GoFood + Grab + Shopee</p>
                    </div>
                    <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500">Transaksi Hari Ini</p>
                        <p className="text-lg sm:text-2xl font-bold text-gray-900">{totalTransaksi}</p>
                    </div>
                </div>

                {/* Payment Method Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                    {paymentColumns.map((pm) => (
                        <div key={pm.key} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500">{pm.label}</p>
                            <p className={`${pm.color} text-sm font-bold`}>{formatRupiah((totals as any)[pm.key] || 0)}</p>
                        </div>
                    ))}
                </div>

                {isLoading ? (
                    <div className="p-12 flex justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
                    </div>
                ) : sales.length === 0 && localTx.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                        Belum ada data penjualan untuk tanggal ini.
                    </div>
                ) : (
                    <>
                        {/* Laporan dari Staff */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                                <FaFileAlt className="text-primary-600" />
                                <h2 className="font-bold text-gray-900 text-lg">Laporan dari Staff</h2>
                            </div>

                            {isReportsLoading ? (
                                <div className="p-12 flex justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
                                </div>
                            ) : reports.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    <FaFileAlt className="mx-auto text-4xl mb-4 opacity-20" />
                                    Belum ada laporan dari staff untuk tanggal ini.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50/50 border-b border-gray-100">
                                            <tr>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Produk</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stok Bawaan</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Sisa</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Terjual</th>
                                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Outlet</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {reports.map((report) => (
                                                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{report.product_name}</td>
                                                    <td className="px-6 py-4 text-gray-700">{report.stock_bawaan}</td>
                                                    <td className="px-6 py-4 text-gray-700">{report.sisa_dimsum}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-semibold text-primary-600">{report.terjual}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {report.profiles?.outlet || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Per-Staff Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="font-bold text-gray-900 text-sm sm:text-base">Penjualan Per Staff</h3>
                            </div>
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Staff</th>
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
                                        {/* Total Row */}
                                        <tr className="bg-gray-50/80 font-bold">
                                            <td className="px-4 py-3 text-gray-900 text-sm">Total Semua Staff</td>
                                            {paymentColumns.map((pm) => (
                                                <td key={pm.key} className="px-4 py-3 text-right text-gray-900 text-sm">{formatRupiah((totals as any)[pm.key] || 0)}</td>
                                            ))}
                                            <td className="px-4 py-3 text-right text-green-700 text-sm">{formatRupiah(totalCash)}</td>
                                            <td className="px-4 py-3 text-right text-blue-700 text-sm">{formatRupiah(totalOnline)}</td>
                                            <td className="px-4 py-3 text-right text-gray-900 text-sm">{formatRupiah(totalAll)}</td>
                                            <td className="px-4 py-3 text-right text-gray-900 text-sm">{totalTransaksi}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile */}
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

                        {/* Product Sales per Staff */}
                        {perStaffProducts.size === 0 ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center text-gray-500 italic text-sm">Belum ada data produk.</div>
                        ) : (
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
                    </>
                )}
            </div>
        </div>

        {/* Floating Refresh Button */}
        <button
            onClick={async () => {
                setIsRefreshing(true);
                fetchLocalSales(selectedDate);
                try {
                    const { data } = await supabase
                        .from('sales')
                        .select('*')
                        .eq('transaction_date', selectedDate)
                        .order('created_at', { ascending: false });
                    const enriched = await Promise.all((data || []).map(async (r) => {
                        let profile: { username?: string; email?: string; outlet?: string } | null = null;
                        if (r.staff_id) {
                            const { data: p } = await supabase.from('profiles').select('username, email, outlet').eq('id', r.staff_id).maybeSingle();
                            profile = p;
                        }
                        return { ...r, profiles: profile };
                    }));
                    setSales(enriched as any);
                } catch {}
                await fetchReports();
                setIsRefreshing(false);
            }}
            disabled={isRefreshing}
            className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-primary-600 text-white px-5 py-3.5 rounded-full shadow-lg hover:bg-primary-700 transition-all disabled:opacity-70"
            title="Refresh data"
        >
            <FaSyncAlt className={isRefreshing ? 'animate-spin' : ''} />
            <span className="text-sm font-semibold">Refresh</span>
        </button>
        </>
    );
};
