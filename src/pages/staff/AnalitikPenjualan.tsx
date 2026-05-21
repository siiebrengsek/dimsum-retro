import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth.store';

type SaleRow = {
    id: string;
    payment_method: string;
    amount: number;
    items_json: any[];
    staff_id: string;
    transaction_date: string;
    created_at: string;
};

type ProductSummary = {
    name: string;
    totalQty: number;
    totalRevenue: number;
};

export const AnalitikPenjualan = () => {
    const user = useAuthStore((s) => s.user);
    const [sales, setSales] = useState<SaleRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchSales = async () => {
            const today = new Date().toISOString().split('T')[0];
            try {
                const { data, error } = await supabase
                    .from('sales')
                    .select('*')
                    .eq('staff_id', user.id)
                    .eq('transaction_date', today)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setSales(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSales();
    }, [user]);

    const totalOmset = sales.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    const totalTransaksi = sales.length;

    const paymentTotals: Record<string, number> = {};
    for (const s of sales) {
        const method = s.payment_method === 'gofood' ? 'gojek' : s.payment_method;
        paymentTotals[method] = (paymentTotals[method] || 0) + Number(s.amount || 0);
    }

    const omsetCash = paymentTotals['tunai'] || 0;
    const omsetOnline = (paymentTotals['qris'] || 0) + (paymentTotals['gojek'] || 0) + (paymentTotals['grab'] || 0) + (paymentTotals['shoppe'] || 0);

    const paymentMethods = [
        { key: 'tunai', label: 'Tunai', color: 'text-green-400' },
        { key: 'gojek', label: 'Gojek', color: 'text-green-500' },
        { key: 'grab', label: 'Grab', color: 'text-red-400' },
        { key: 'shoppe', label: 'Shopee', color: 'text-orange-400' },
        { key: 'qris', label: 'QRIS', color: 'text-purple-400' },
    ];

    const productMap = new Map<string, ProductSummary>();
    for (const s of sales) {
        const items = s.items_json || [];
        for (const item of items) {
            const existing = productMap.get(item.productName);
            if (existing) {
                existing.totalQty += item.quantity;
                existing.totalRevenue += item.price * item.quantity;
            } else {
                productMap.set(item.productName, {
                    name: item.productName,
                    totalQty: item.quantity,
                    totalRevenue: item.price * item.quantity,
                });
            }
        }
    }
    const products = Array.from(productMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-white">Analitik Penjualan</h1>
                <p className="text-sm text-gray-400">
                    Ringkasan penjualan hari ini, {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>

            {isLoading ? (
                <div className="py-12 flex justify-center">
                    <div className="w-8 h-8 border-4 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : sales.length === 0 ? (
                <div className="bg-[#1A1A2E] rounded-2xl p-8 text-center">
                    <p className="text-gray-400 text-sm">Belum ada penjualan hari ini.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#1A1A2E] rounded-2xl p-5 border border-[#252540]">
                            <p className="text-gray-400 text-xs mb-1">Total Omset</p>
                            <p className="text-[#F5A623] text-2xl font-black">{formatRupiah(totalOmset)}</p>
                        </div>
                        <div className="bg-[#111118] rounded-2xl p-5 border border-[#252540]">
                            <p className="text-gray-400 text-xs mb-1">Transaksi</p>
                            <p className="text-white text-2xl font-black">{totalTransaksi}</p>
                        </div>
                        <div className="bg-green-900/20 rounded-2xl p-5 border border-green-800/30">
                            <p className="text-gray-400 text-xs mb-1">Omset Cash</p>
                            <p className="text-green-400 text-xl font-black">{formatRupiah(omsetCash)}</p>
                            <p className="text-gray-500 text-[10px] mt-0.5">Hanya Tunai</p>
                        </div>
                        <div className="bg-blue-900/20 rounded-2xl p-5 border border-blue-800/30">
                            <p className="text-gray-400 text-xs mb-1">Omset Online</p>
                            <p className="text-blue-400 text-xl font-black">{formatRupiah(omsetOnline)}</p>
                            <p className="text-gray-500 text-[10px] mt-0.5">QRIS + GoFood + Grab + Shopee</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {paymentMethods.map((pm) => (
                            <div key={pm.key} className="bg-[#1A1A2E] rounded-xl p-4 border border-[#252540]">
                                <p className="text-gray-400 text-xs mb-1">{pm.label}</p>
                                <p className={`${pm.color} text-sm font-bold`}>{formatRupiah(paymentTotals[pm.key] || 0)}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-[#111118] rounded-2xl border border-[#1A1A2E] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#1A1A2E]">
                            <h2 className="text-white font-bold text-sm">Produk Terjual</h2>
                        </div>
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#1A1A2E]">
                                    <tr>
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase">Produk</th>
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase text-right">Terjual</th>
                                        <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase text-right">Pendapatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1A1A2E]">
                                    {products.map((p) => (
                                        <tr key={p.name} className="hover:bg-[#1A1A2E]/50 transition">
                                            <td className="px-5 py-4 text-sm text-white font-medium">{p.name}</td>
                                            <td className="px-5 py-4 text-sm text-gray-300 text-right">{p.totalQty}</td>
                                            <td className="px-5 py-4 text-sm text-[#F5A623] font-bold text-right">{formatRupiah(p.totalRevenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sm:hidden divide-y divide-[#1A1A2E]">
                            {products.map((p) => (
                                <div key={p.name} className="px-4 py-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-white text-sm font-medium">{p.name}</p>
                                        <p className="text-gray-400 text-xs">{p.totalQty} terjual</p>
                                    </div>
                                    <p className="text-[#F5A623] font-bold text-sm">{formatRupiah(p.totalRevenue)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
