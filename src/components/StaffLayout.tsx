import { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { SyncIndicator } from './SyncIndicator';

export const StaffLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const signOut = useAuthStore((s) => s.signOut);
    const profile = useAuthStore((s) => s.profile);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const navItems = [
        { path: '/staff/dashboard', icon: '🛒', label: 'Kasir / POS' },
        { path: '/staff/report-dimsum', icon: '📝', label: 'Laporan Dimsum' },
        { path: '/staff/report-inventory', icon: '📋', label: 'Pemakaian Bahan' },
        { path: '/staff/transaksi-history', icon: '📜', label: 'Transaksi History' },
        { path: '/staff/analitik-penjualan', icon: '📊', label: 'Analitik Penjualan' },
    ];

    return (
        <div className="flex h-screen bg-[#0D0D0D] text-white">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — lg: always visible, mobile: slide from left */}
            <div className={`
                fixed lg:relative left-0 z-40 h-full bg-[#111118] border-r border-[#1A1A2E]
                flex flex-col pt-6 transition-transform duration-300 ease-in-out w-72
                lg:translate-x-0
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Close button (mobile only) */}
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="absolute top-4 right-4 lg:hidden text-[#888] hover:text-white text-xl p-1"
                >
                    ✕
                </button>

                {/* Profile Section */}
                <div className="px-5 pb-5 border-b border-[#1A1A2E] mt-8 lg:mt-0">
                    <div className="flex justify-between items-center mb-3">
                        <div className="w-12 h-12 rounded-full bg-[#252540] flex items-center justify-center text-2xl">
                            👤
                        </div>
                        <button className="w-8 h-8 rounded-lg bg-[#1A1A2E] flex items-center justify-center">
                            ⚙
                        </button>
                    </div>
                    <h2 className="text-lg font-extrabold text-white mb-1">
                        {profile?.nama || profile?.username || 'Staf Outlet'}
                    </h2>
                    <p className="text-sm text-gray-400 mb-4">{profile?.outlet || 'Dimsum Retro'}</p>

                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-between w-full bg-[#1A1A2E] rounded-xl py-3 px-4 hover:bg-[#252540] transition"
                    >
                        <span className="text-sm font-semibold text-[#FF6B6B]">Keluar</span>
                        <span className="text-lg font-bold text-[#FF6B6B]">›</span>
                    </button>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 overflow-y-auto py-4">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center py-3.5 px-5 mx-3 my-1 rounded-xl transition ${isActive
                                        ? 'bg-[#F5A623] bg-opacity-[0.15]'
                                        : 'hover:bg-[#1A1A2E]'
                                    }`}
                            >
                                <span className={`text-lg w-7 mr-3 text-center ${isActive ? 'opacity-100' : 'opacity-50'}`}>
                                    {item.icon}
                                </span>
                                <span className={`text-sm flex-1 ${isActive ? 'text-[#F5A623] font-bold' : 'text-gray-400 font-semibold'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="px-5 py-4 border-t border-[#1A1A2E] flex justify-center">
                    <button className="text-sm font-bold text-[#F5A623] hover:text-white transition">
                        Shift & Catat Kas
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto relative">
                {/* Toggle sidebar button — visible on mobile, fixed on scroll */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden fixed top-1/2 -translate-y-1/2 left-3 z-50 w-8 h-8 rounded-lg bg-[#1A1A2E] flex items-center justify-center hover:bg-[#252540] transition text-white text-sm"
                >
                    {sidebarOpen ? '❮' : '❯'}
                </button>
                <Outlet />
                <SyncIndicator />
            </div>
        </div>
    );
};
