import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { FaUser, FaEnvelope, FaLock, FaWarehouse, FaStore, FaUserPlus, FaSignInAlt } from 'react-icons/fa';

export const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAuthStore((s) => s.user);
    const profile = useAuthStore((s) => s.profile);
    const isLoading = useAuthStore((s) => s.isLoading);
    const error = useAuthStore((s) => s.error);
    const signIn = useAuthStore((s) => s.signIn);
    const signUp = useAuthStore((s) => s.signUp);

    const [isSignUp, setIsSignUp] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loginRole, setLoginRole] = useState<'admin' | 'staff'>('admin');

    useEffect(() => {
        if (user && profile) {
            let targetPath = (location.state as any)?.from?.pathname;

            // Check if the intended route is unauthorized for the role
            if (targetPath?.startsWith('/admin') && profile.role !== 'admin_warehouse') {
                targetPath = '/staff/dashboard';
            } else if (targetPath?.startsWith('/staff') && profile.role !== 'staf') {
                targetPath = '/admin/dashboard';
            } else if (!targetPath || targetPath === '/' || targetPath === '/login') {
                targetPath = profile.role === 'admin_warehouse' ? '/admin/dashboard' : '/staff/dashboard';
            }

            navigate(targetPath, { replace: true });
        }
    }, [user, profile, navigate, location.state]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSignUp) {
            if (password !== confirmPassword) {
                useAuthStore.setState({ error: 'Password tidak cocok.' });
                return;
            }
            await signUp({ username, email, password, role: 'staf' });
        } else {
            const expectedRole = loginRole === 'admin' ? 'admin_warehouse' : 'staf';
            await signIn(username, password, expectedRole);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className={`p-4 rounded-xl shadow-lg ${!isSignUp && loginRole === 'admin' ? 'bg-primary-600' : 'bg-orange-500'}`}>
                        {!isSignUp && loginRole === 'admin' ? (
                            <FaWarehouse className="text-white text-3xl" />
                        ) : (
                            <FaStore className="text-white text-3xl" />
                        )}
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
                    {isSignUp ? 'Buat Akun Baru' : loginRole === 'admin' ? 'Admin Warehouse' : 'Staf Outlet'}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    {isSignUp ? 'Daftar sebagai Staf Outlet' : 'Sign in to your account'}
                </p>

                {/* Role Tabs — only for sign-in */}
                {!isSignUp && (
                    <div className="mt-6 flex bg-gray-200 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setLoginRole('admin')}
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${loginRole === 'admin'
                                ? 'bg-white shadow text-gray-900'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Admin
                        </button>
                        <button
                            type="button"
                            onClick={() => setLoginRole('staff')}
                            className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${loginRole === 'staff'
                                ? 'bg-white shadow text-gray-900'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Staf
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                                Username / Email
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaUser className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-10 sm:text-sm border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Username atau Email"
                                />
                            </div>
                        </div>

                        {isSignUp && (
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                    Email Address
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaEnvelope className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required={isSignUp}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-10 sm:text-sm border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="admin@example.com"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaLock className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 sm:text-sm border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {isSignUp && (
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                    Confirm Password
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaLock className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full pl-10 sm:text-sm border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium animate-shake">
                                {error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        {isSignUp ? 'Creating Account...' : 'Authenticating...'}
                                    </div>
                                ) : (
                                    isSignUp ? 'Sign Up' : 'Sign In'
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(!isSignUp);
                                useAuthStore.setState({ error: null });
                            }}
                            className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
                        >
                            {isSignUp ? (
                                <><FaSignInAlt className="h-4 w-4" /> Already have an account? Sign In</>
                            ) : (
                                <><FaUserPlus className="h-4 w-4" /> Don't have an account? Sign Up</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
