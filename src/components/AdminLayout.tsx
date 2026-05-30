import { useState, useRef, useCallback } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import {
    FaWarehouse, FaBox, FaCube, FaChartLine, FaHistory, FaUsers, FaSignOutAlt, FaMoneyBillWave
} from 'react-icons/fa';

export const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const signOut = useAuthStore((s) => s.signOut);
    const profile = useAuthStore((s) => s.profile);
    const touchStartX = useRef(0);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(delta) > 60) {
            if (delta > 0) setSidebarOpen(true);
            else setSidebarOpen(false);
        }
    }, []);

    const navItems = [
        { path: '/admin/dashboard', icon: FaWarehouse, label: 'Dashboard' },
        { path: '/admin/inventory', icon: FaBox, label: 'Inventory' },
        { path: '/admin/stock', icon: FaCube, label: 'Stock Dimsum' },
        { path: '/admin/sales', icon: FaChartLine, label: 'Sales Analysis' },
        { path: '/admin/stock-history', icon: FaHistory, label: 'Stock History' },
        { path: '/admin/staff', icon: FaUsers, label: 'Staff Management' },
        { path: '/admin/financial', icon: FaMoneyBillWave, label: 'Financial' },
    ];

    return (
        <div
            className="flex h-screen bg-gray-50"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed lg:relative left-0 z-40 h-full bg-white border-r border-gray-200
                flex flex-col pt-6 transition-transform duration-300 ease-in-out w-64
                lg:translate-x-0 shadow-sm
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Close button (mobile only) */}
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="absolute top-4 right-4 lg:hidden text-gray-400 hover:text-gray-600 text-xl p-1"
                >
                    ✕
                </button>

                {/* Brand */}
                <div className="px-5 pb-5 border-b border-gray-100 mt-8 lg:mt-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                            <FaWarehouse className="text-primary-600 text-lg" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 leading-tight">Dimsum Retro</h2>
                            <p className="text-xs text-gray-500">Admin Warehouse</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 rounded-xl py-2.5 px-3.5">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-primary-200 flex items-center justify-center text-xs font-bold text-primary-700 shrink-0">
                                {profile?.username?.charAt(0).toUpperCase() || 'A'}
                            </div>
                            <span className="text-sm font-semibold text-gray-700 truncate">
                                {profile?.username || 'Admin'}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Sign Out"
                        >
                            <FaSignOutAlt size={14} />
                        </button>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 overflow-y-auto py-4">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 py-2.5 px-5 mx-3 my-0.5 rounded-lg transition-colors ${isActive
                                        ? 'bg-primary-50 text-primary-700 font-semibold'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <Icon className={`text-sm ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                                <span className="text-sm">{item.label}</span>
                                {isActive && (
                                    <span className="ml-auto w-1.5 h-5 rounded-full bg-primary-500" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 text-center">
                        Dimsum Retro &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto">
                {/* Hamburger button (mobile only) */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden fixed top-3 left-3 z-20 w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition text-gray-600 shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <Outlet />
            </div>
        </div>
    );
};
