import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FaUsers, FaArrowLeft, FaEdit, FaTimes, FaShieldAlt, FaSyncAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';

type Profile = {
    id: string;
    role: string;
    username?: string;
    nama?: string;
    email?: string;
    outlet?: string;
    updated_at: string;
};

export const StaffManagement = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    const [editForm, setEditForm] = useState({ username: '', nama: '', outlet: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchProfiles();
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

    const handleEditClick = (profile: Profile) => {
        setEditingProfile(profile);
        setEditForm({
            username: profile.username || '',
            nama: profile.nama || '',
            outlet: profile.outlet || '',
        });
        setEditModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditModalOpen(false);
        setEditingProfile(null);
        setEditForm({ username: '', nama: '', outlet: '' });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProfile) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    username: editForm.username || null,
                    nama: editForm.nama || null,
                    outlet: editForm.outlet || null,
                })
                .eq('id', editingProfile.id);

            if (error) throw error;
            handleCloseModal();
            fetchProfiles();
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert('Gagal menyimpan: ' + (error.message || 'Error tidak diketahui'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
        <div className="min-h-screen bg-gray-50 p-3 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                    <div>
                        <Link to="/admin/dashboard" className="text-primary-600 hover:text-primary-700 flex items-center gap-2 mb-2 font-medium text-sm sm:text-base">
                            <FaArrowLeft /> Kembali ke Dashboard
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manajemen Staff</h1>
                        <p className="text-sm sm:text-base text-gray-600">Atur profil staff — nama, username, dan outlet</p>
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
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Nama</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Email</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Outlet</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Role</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Diupdate</th>
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
                                                <td className="px-6 py-4 text-sm text-gray-700">{profile.nama || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{profile.email || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-700">{profile.outlet || '-'}</td>
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
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleEditClick(profile)}
                                                        className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                                                    >
                                                        <FaEdit />
                                                    </button>
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
                                            <div>
                                                <span className="text-sm font-medium text-gray-900">{profile.username || '-'}</span>
                                                <code className="ml-2 text-[10px] text-gray-400 bg-gray-50 px-1 py-0.5 rounded">{profile.id.slice(0, 8)}</code>
                                            </div>
                                            <button
                                                onClick={() => handleEditClick(profile)}
                                                className="p-2 text-gray-400 hover:text-primary-600 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                                            >
                                                <FaEdit />
                                            </button>
                                        </div>
                                        <div className="text-xs text-gray-500 space-y-0.5">
                                            <div>{profile.email || '-'}</div>
                                            <div>Nama: {profile.nama || '-'}</div>
                                            <div>Outlet: {profile.outlet || '-'}</div>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
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

            {/* Edit Profile Modal */}
            {editModalOpen && editingProfile && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">Edit Staff</h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-2">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    value={editForm.username}
                                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Username login"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                                <input
                                    type="text"
                                    value={editForm.nama}
                                    onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Nama staff"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Outlet</label>
                                <input
                                    type="text"
                                    value={editForm.outlet}
                                    onChange={(e) => setEditForm({ ...editForm, outlet: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Contoh: Cabang Utama, Cabang BSD"
                                />
                            </div>
                            {editingProfile.email && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-xs text-gray-500">Email</p>
                                    <p className="text-sm font-medium text-gray-700">{editingProfile.email}</p>
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 text-sm">
                                    Batal
                                </button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary disabled:opacity-50 text-sm">
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>

        {/* Floating Refresh Button */}
        <button
            onClick={async () => {
                setIsRefreshing(true);
                try {
                    const { data } = await supabase.from('profiles').select('*').order('role');
                    if (data) setProfiles(data);
                } catch {}
                setIsRefreshing(false);
            }}
            disabled={isRefreshing}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary-600 text-white px-5 py-3.5 rounded-full shadow-lg hover:bg-primary-700 transition-all disabled:opacity-70"
            title="Refresh data"
        >
            <FaSyncAlt className={isRefreshing ? 'animate-spin' : ''} />
            <span className="text-sm font-semibold">Refresh</span>
        </button>
        </>
    );
};
