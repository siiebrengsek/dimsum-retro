import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FaUsers, FaArrowLeft, FaTrash, FaShieldAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';

type Profile = {
    id: string;
    role: string;
    username?: string;
    email?: string;
    updated_at: string;
};

export const StaffManagement = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchProfiles();
        const interval = setInterval(fetchProfiles, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchProfiles = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('role');

            if (error) throw error;
            if (data) setProfiles(data);
        } catch (error) {
            console.error('Error fetching profiles:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <Link to="/admin/dashboard" className="text-primary-600 hover:text-primary-700 flex items-center gap-2 mb-2 font-medium text-sm sm:text-base">
                            <FaArrowLeft /> Kembali ke Dashboard
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manajemen Staff</h1>
                        <p className="text-sm sm:text-base text-gray-600">Atur akses dan role pengguna di sistem</p>
                    </div>
                    <div className="bg-primary-50 px-3 py-2 sm:px-4 sm:py-2 rounded-lg border border-primary-100 flex items-center gap-2 text-primary-700 text-xs sm:text-sm shrink-0">
                        <FaShieldAlt /> RBAC Active
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 flex justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
                        </div>
                    ) : profiles.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <FaUsers className="mx-auto text-4xl mb-4 opacity-20" />
                            Belum ada profil tersedia.
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50/50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Username</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Email</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Role</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Terakhir Diupdate</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                            {profiles.map((profile) => (
                                                <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-medium text-gray-900">{profile.username || '-'}</span>
                                                        <code className="ml-2 text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{profile.id.slice(0, 8)}</code>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">{profile.email || '-'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profile.role === 'admin_warehouse'
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-green-100 text-green-800'
                                                        }`}>
                                                        {profile.role === 'admin_warehouse' ? 'Admin' : 'Staf'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {new Date(profile.updated_at).toLocaleDateString('id-ID')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="sm:hidden divide-y divide-gray-50">
                                {profiles.map((profile) => (
                                    <div key={profile.id} className="p-4 hover:bg-gray-50">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-900">{profile.username || '-'}</span>
                                            <button className="p-2 text-gray-400 hover:text-red-600 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
                                                <FaTrash />
                                            </button>
                                        </div>
                                        <div className="text-xs text-gray-500 mb-2">{profile.email || '-'}</div>
                                        <div className="flex items-center justify-between">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${profile.role === 'admin_warehouse'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-green-100 text-green-800'
                                                }`}>
                                                {profile.role === 'admin_warehouse' ? 'Admin' : 'Staf'}
                                            </span>
                                            <span className="text-xs text-gray-500">{new Date(profile.updated_at).toLocaleDateString('id-ID')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
