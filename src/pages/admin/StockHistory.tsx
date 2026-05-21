import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FaBoxes, FaPlus, FaTrash, FaEdit, FaArrowLeft, FaTimes, FaSearch, FaStore } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { getTodayDate } from '../../utils/dateUtils';

type Report = {
    id: number;
    staff_id: string;
    item_id: number;
    outlet: string;
    report_date: string;
    stock_hari_ini: number;
    sisa: number;
    terpakai: number;
    created_at: string;
    packaging_items: { name: string; unit: string };
    profiles?: { username: string; nama: string };
};

type PackagingItem = {
    id: number;
    name: string;
    unit: string;
};

export const StockHistory = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [packagingItems, setPackagingItems] = useState<PackagingItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOutlet, setSelectedOutlet] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
    const [searchQuery, setSearchQuery] = useState('');

    const dedupeReports = (items: Report[]): Report[] => {
        const seen = new Map<string, Report>();
        for (const r of items) {
            const key = `${r.item_id}|${r.outlet}|${r.report_date}`;
            const existing = seen.get(key);
            if (!existing || new Date(r.created_at) > new Date(existing.created_at)) {
                seen.set(key, r);
            }
        }
        return Array.from(seen.values()).sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    };

    const [itemModalOpen, setItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PackagingItem | null>(null);
    const [itemForm, setItemForm] = useState({ name: '', unit: 'Pcs' });
    const [isItemSubmitting, setIsItemSubmitting] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('packaging_reports')
                .select('*, packaging_items!inner(name, unit)')
                .order('created_at', { ascending: false });

            if (selectedOutlet) {
                query = query.eq('outlet', selectedOutlet);
            }
            if (selectedDate) {
                query = query.eq('report_date', selectedDate);
            }

            const { data, error } = await query;
            if (error) throw error;

            const deduped = dedupeReports(data || []);
            setReports(deduped);
        } catch (err: any) {
            console.error('Error fetching reports:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPackagingItems = async () => {
        try {
            const { data, error } = await supabase
                .from('packaging_items')
                .select('*')
                .order('name');
            if (!error) setPackagingItems(data || []);
        } catch { }
    };

    useEffect(() => {
        fetchData();
        fetchPackagingItems();
        const interval = setInterval(() => { fetchData(); fetchPackagingItems(); }, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchData();
    }, [selectedOutlet, selectedDate]);

    const outlets = [...new Set(reports.map((r) => r.outlet).filter(Boolean))] as string[];
    const filteredReports = reports.filter((r) => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                r.packaging_items?.name.toLowerCase().includes(q) ||
                r.outlet?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const groupedByOutlet: Record<string, Report[]> = {};
    filteredReports.forEach((r) => {
        const outlet = r.outlet || 'Unknown';
        if (!groupedByOutlet[outlet]) groupedByOutlet[outlet] = [];
        groupedByOutlet[outlet].push(r);
    });

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsItemSubmitting(true);
        try {
            if (editingItem) {
                const { error } = await supabase
                    .from('packaging_items')
                    .update({ name: itemForm.name, unit: itemForm.unit })
                    .eq('id', editingItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('packaging_items')
                    .insert([{ name: itemForm.name, unit: itemForm.unit }]);
                if (error) throw error;
            }
            setItemModalOpen(false);
            setEditingItem(null);
            setItemForm({ name: '', unit: 'Pcs' });
            fetchPackagingItems();
        } catch (err: any) {
            console.error('Error saving item:', err);
            alert('Gagal menyimpan item: ' + err.message);
        } finally {
            setIsItemSubmitting(false);
        }
    };

    const handleEditItem = (item: PackagingItem) => {
        setEditingItem(item);
        setItemForm({ name: item.name, unit: item.unit });
        setItemModalOpen(true);
    };

    const handleDeleteItem = async (id: number) => {
        if (!confirm('Yakin ingin menghapus item ini?')) return;
        try {
            const { error } = await supabase.from('packaging_items').delete().eq('id', id);
            if (error) throw error;
            setPackagingItems((prev) => prev.filter((i) => i.id !== id));
        } catch (err: any) {
            console.error('Error deleting item:', err);
        }
    };

    const handleCloseItemModal = () => {
        setItemModalOpen(false);
        setEditingItem(null);
        setItemForm({ name: '', unit: 'Pcs' });
    };

    const totalTerpakai = filteredReports.reduce((sum, r) => sum + r.terpakai, 0);

    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                    <div>
                        <Link to="/admin/dashboard" className="text-primary-600 hover:text-primary-700 flex items-center gap-2 mb-2 font-medium text-sm sm:text-base">
                            <FaArrowLeft /> Kembali ke Dashboard
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Stock History Packaging</h1>
                        <p className="text-sm sm:text-base text-gray-600">Riwayat laporan stock packaging per outlet</p>
                    </div>
                    <button
                        onClick={() => setItemModalOpen(true)}
                        className="btn-primary flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
                    >
                        <FaPlus /> Kelola Item
                    </button>
                </div>

                {/* Filters */}
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari item atau outlet..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-primary-500 focus:border-primary-500 text-sm"
                        />
                    </div>
                    <select
                        value={selectedOutlet || ''}
                        onChange={(e) => setSelectedOutlet(e.target.value || null)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                    >
                        <option value="">Semua Outlet</option>
                        {outlets.map((o) => (
                            <option key={o} value={o}>{o}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>

                {/* Summary Cards */}
                {!isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Laporan</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{reports.length}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Outlet</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{outlets.length}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Terpakai</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{totalTerpakai}</p>
                        </div>
                    </div>
                )}

                {/* Reports by Outlet */}
                {isLoading ? (
                    <div className="p-12 flex justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
                    </div>
                ) : Object.keys(groupedByOutlet).length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
                        <FaBoxes className="mx-auto text-4xl mb-4 opacity-20" />
                        Belum ada data laporan dari staff.
                    </div>
                ) : (
                    Object.entries(groupedByOutlet).map(([outlet, outletReports]) => {
                        const outletTotal = outletReports.reduce((s, r) => s + r.terpakai, 0);
                        return (
                            <div key={outlet} className="mb-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <FaStore className="text-primary-600 text-lg" />
                                    <h2 className="text-lg font-bold text-gray-900">{outlet}</h2>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {outletReports.length} laporan
                                    </span>
                                    <span className="text-xs font-bold text-primary-600 ml-auto">
                                        Total terpakai: {outletTotal}
                                    </span>
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="hidden sm:block overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Stock Hari Ini</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Sisa</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Terpakai</th>
                                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Satuan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {outletReports.map((r) => (
                                                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 text-sm text-gray-500">
                                                            {new Date(r.report_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                                            {r.packaging_items?.name || 'Unknown'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-700 text-right">{r.stock_hari_ini}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-700 text-right">{r.sisa}</td>
                                                        <td className="px-4 py-3 text-sm text-primary-600 font-bold text-right">{r.terpakai}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 text-right">{r.packaging_items?.unit || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="sm:hidden divide-y divide-gray-50">
                                        {outletReports.map((r) => (
                                            <div key={r.id} className="p-4">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="font-semibold text-gray-900 text-sm">{r.packaging_items?.name}</p>
                                                    <span className="text-primary-600 font-bold text-sm">{r.terpakai} terpakai</span>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(r.report_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    {' | '}Stock: {r.stock_hari_ini} → Sisa: {r.sisa}
                                                    {' | '}{r.packaging_items?.unit}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Packaging Items Management */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center gap-2">
                            <FaBoxes className="text-primary-600" />
                            Daftar Item Packaging ({packagingItems.length})
                        </h3>
                        <button
                            onClick={() => { setEditingItem(null); setItemForm({ name: '', unit: 'Pcs' }); setItemModalOpen(true); }}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                        >
                            <FaPlus className="text-xs" /> Tambah
                        </button>
                    </div>
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Nama Item</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Satuan</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {packagingItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{item.unit}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEditItem(item)} className="p-2 text-gray-400 hover:text-primary-600 transition-colors">
                                                    <FaEdit />
                                                </button>
                                                <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="sm:hidden divide-y divide-gray-50">
                        {packagingItems.map((item) => (
                            <div key={item.id} className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.unit}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditItem(item)} className="p-2 text-gray-400 hover:text-primary-600"><FaEdit /></button>
                                    <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-gray-400 hover:text-red-600"><FaTrash /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Item Modal */}
            {itemModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">{editingItem ? 'Edit Item' : 'Tambah Item Baru'}</h3>
                            <button onClick={handleCloseItemModal} className="text-gray-400 hover:text-gray-600 p-2">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSaveItem} className="p-4 sm:p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Item</label>
                                <input
                                    required
                                    type="text"
                                    value={itemForm.name}
                                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Contoh: Cup Teh"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                                <select
                                    value={itemForm.unit}
                                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="Pcs">Pcs</option>
                                    <option value="Pack">Pack</option>
                                    <option value="Box">Box</option>
                                    <option value="Kg">Kg</option>
                                    <option value="Liter">Liter</option>
                                    <option value="Roll">Roll</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={handleCloseItemModal} className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 text-sm">
                                    Batal
                                </button>
                                <button type="submit" disabled={isItemSubmitting} className="flex-1 btn-primary disabled:opacity-50 text-sm">
                                    {isItemSubmitting ? 'Menyimpan...' : (editingItem ? 'Update Item' : 'Simpan Item')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
