import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth.store';
import { FaSignOutAlt, FaWarehouse, FaBox, FaClipboardList, FaUsers, FaHistory } from 'react-icons/fa';
import { getTransactions } from '../../utils/transactions';
import { getTodayDate } from '../../utils/dateUtils';

export const Dashboard = () => {
    const [counts, setCounts] = useState({
        barang: 0,
        dimsum: 0,
        staff: 0,
        todaySales: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getTodayDate());

    const profile = useAuthStore((s) => s.profile);
    const signOut = useAuthStore((s) => s.signOut);

    const fetchLocal = (date: string) => {
        const all = getTransactions();
        return all.filter((t) => t.createdAt.startsWith(date)).reduce((sum, t) => sum + t.total, 0);
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [
                    { count: barangCount },
                    { count: dimsumCount },
                    { count: staffCount },
                    { data: todaySalesData }
                ] = await Promise.all([
                    supabase.from('inventory').select('*', { count: 'exact', head: true }),
                    supabase.from('products').select('*', { count: 'exact', head: true }),
                    supabase.from('profiles').select('*', { count: 'exact', head: true }),
                    supabase.from('sales').select('amount').eq('transaction_date', selectedDate)
                ]);

                const todayDb = todaySalesData?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
                const todayLocal = fetchLocal(selectedDate);
                const todayTotal = todayDb + todayLocal;

                setCounts({
                    barang: barangCount ?? 0,
                    dimsum: dimsumCount ?? 0,
                    staff: staffCount ?? 0,
                    todaySales: todayTotal,
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [selectedDate]);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(price);
    };

    const stats = [
        { name: 'Stock Inventory', value: counts.barang.toString(), icon: FaBox, color: 'bg-blue-500', link: '/admin/inventory' },
        { name: 'Stock Dimsum', value: counts.dimsum.toString(), icon: FaWarehouse, color: 'bg-blue-600', link: '/admin/stock' },
        { name: `Omset ${selectedDate === getTodayDate() ? 'Hari Ini' : selectedDate}`, value: formatPrice(counts.todaySales), icon: FaClipboardList, color: 'bg-green-500', link: '/admin/sales' },
        { name: 'Active Staff', value: counts.staff.toString(), icon: FaUsers, color: 'bg-purple-500', link: '/admin/staff' },
        { name: 'Pemakaian Barang', value: 'Packaging', icon: FaHistory, color: 'bg-orange-500', link: '/admin/stock-history' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile-friendly nav */}
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-14 sm:h-16 items-center">
                        <div className="flex items-center gap-2 min-w-0">
                            <FaWarehouse className="text-primary-600 text-lg sm:text-2xl shrink-0" />
                            <span className="font-bold text-base sm:text-xl text-gray-900 truncate">Admin Panel</span>
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

            <main className="max-w-7xl mx-auto py-6 sm:py-8 px-3 sm:px-6 lg:px-8">
                <div className="mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Warehouse Overview</h1>
                            <p className="text-sm sm:text-base text-gray-600">Welcome back to the management dashboard.</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <label className="text-xs text-gray-500 font-medium">Tanggal:</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm py-1.5"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                    {stats.map((stat) => (
                        <Link key={stat.name} to={stat.link} className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative">
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/50 animate-pulse rounded-2xl flex items-center justify-center">
                                    <div className="h-4 w-4 bg-gray-200 rounded-full animate-bounce" />
                                </div>
                            )}
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className={`${stat.color} p-2.5 sm:p-3 rounded-xl text-white shrink-0`}>
                                    <stat.icon className="text-sm sm:text-xl" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs sm:text-sm text-gray-500 truncate">{stat.name}</p>
                                    <p className="text-base sm:text-2xl font-bold text-gray-900 truncate">{stat.value}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

            </main>
        </div>
    );
};
