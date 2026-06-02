import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { FaBoxes, FaPlus, FaTrash, FaEdit, FaTimes, FaSearch, FaSyncAlt, FaHistory, FaMinusCircle, FaTruck } from 'react-icons/fa';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

type StockItem = {
    id: string;
    item_name: string;
    quantity: number;
    unit: string;
    status: string;
    updated_at: string;
};

export const Inventory = () => {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [inventoryMutations, setInventoryMutations] = useState<any[]>([]);
    const [isMutationsLoading, setIsMutationsLoading] = useState(false);
    const [mutationDateStart, setMutationDateStart] = useState('');
    const [mutationDateEnd, setMutationDateEnd] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<'name' | 'quantity'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        item_name: '',
        quantity: 0,
        unit: 'Box',
        status: 'In Stock',
    });

    const fetchStock = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .order('item_name');

            if (error) throw error;
            if (data) setStock(data);
        } catch (error: any) {
            console.error('Error fetching stock:', error);
            alert(`Gagal memuat inventori.\nDetail: ${error.message || JSON.stringify(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMutations = async () => {
        setIsMutationsLoading(true);
        try {
            const { data, error } = await supabase
                .from('inventory_mutations')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            setInventoryMutations(data || []);
        } catch {
        } finally {
            setIsMutationsLoading(false);
        }
    };

    useEffect(() => {
        fetchStock();
        fetchMutations();
    }, []);

    const handleSaveStock = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = { ...formData, status: formData.quantity <= 0 ? 'Out of Stock' : 'In Stock' };
            if (editingId) {
                const { error } = await supabase
                    .from('inventory')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('inventory')
                    .insert([payload]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ item_name: '', quantity: 0, unit: 'Box', status: 'In Stock' });
            fetchStock();
        } catch (error: any) {
            console.error('Error saving stock:', error);
            alert(`Gagal menyimpan data barang.\nDetail: ${error.message || JSON.stringify(error)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (item: StockItem) => {
        setEditingId(item.id);
        setFormData({
            item_name: item.item_name,
            quantity: item.quantity,
            unit: item.unit,
            status: item.status,
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ item_name: '', quantity: 0, unit: 'Box', status: 'In Stock' });
    };

    const handleDeleteStock = async (id: string) => {
        if (!confirm('Yakin ingin menghapus item stok ini?')) return;
        try {
            const { error } = await supabase
                .from('inventory')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setStock(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting stock:', error);
        }
    };

    const filteredStock = useMemo(() => {
        let result = stock;
        if (selectedLetter) {
            result = result.filter(s => s.item_name.toUpperCase().startsWith(selectedLetter));
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(s => s.item_name.toLowerCase().includes(q));
        }
        if (statusFilter) {
            result = result.filter(s => s.status === statusFilter);
        }
        result.sort((a, b) => {
            let cmp = 0;
            if (sortKey === 'name') cmp = a.item_name.localeCompare(b.item_name);
            else cmp = a.quantity - b.quantity;
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return result;
    }, [stock, searchQuery, selectedLetter, sortKey, sortDir, statusFilter]);

    const filteredMutations = useMemo(() => {
        let result = inventoryMutations;
        if (mutationDateStart) {
            result = result.filter((m) => m.report_date && m.report_date >= mutationDateStart);
        }
        if (mutationDateEnd) {
            result = result.filter((m) => m.report_date && m.report_date <= mutationDateEnd);
        }
        return result;
    }, [inventoryMutations, mutationDateStart, mutationDateEnd]);

    const toggleSort = (key: 'name' | 'quantity') => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const cycleStatusFilter = () => {
        if (!statusFilter) setStatusFilter('In Stock');
        else if (statusFilter === 'In Stock') setStatusFilter('Out of Stock');
        else setStatusFilter(null);
    };

    const sortIcon = (key: 'name' | 'quantity') => {
        if (sortKey !== key) return ' ↕';
        return sortDir === 'asc' ? ' ↑' : ' ↓';
    };

    return (
        <>
        <div className="p-4 sm:p-6">
            <div className="max-w-full mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Stock Inventory</h1>
                        <p className="text-sm sm:text-base text-gray-600">Manajemen bahan baku dan perlengkapan warehouse</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn-primary flex items-center gap-2 text-sm sm:text-base justify-center"
                        >
                            <FaPlus /> Tambah Barang
                        </button>
                    </div>
                </div>

                {/* Search + Alphabet Filter */}
                <div className="mb-4 space-y-3">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari item..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-primary-500 focus:border-primary-500 text-sm"
                        />
                    </div>
                    <div className="flex flex-wrap gap-1">
                        <button
                            onClick={() => setSelectedLetter(null)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${!selectedLetter ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            All
                        </button>
                        {ALPHABET.map((letter) => (
                            <button
                                key={letter}
                                onClick={() => setSelectedLetter(letter)}
                                className={`w-8 h-7 rounded-lg text-xs font-semibold transition ${selectedLetter === letter ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                {letter}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 flex justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
                        </div>
                    ) : stock.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <FaBoxes className="mx-auto text-4xl mb-4 opacity-20" />
                            Belum ada data barang tersedia.
                        </div>
                    ) : filteredStock.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            {statusFilter
                                ? `Tidak ada item dengan status "${statusFilter === 'In Stock' ? 'In Stock' : 'Out of Stock'}".`
                                : 'Tidak ada item yang cocok dengan pencarian.'}
                            {statusFilter && (
                                <button onClick={() => setStatusFilter(null)} className="ml-2 text-primary-600 hover:text-primary-700 underline text-sm font-medium">
                                    Tampilkan semua
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="px-6 py-2 text-xs text-gray-500 border-b border-gray-50">
                                Menampilkan {filteredStock.length} dari {stock.length} item
                            </div>
                            {/* Desktop Table */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50/50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-primary-600 transition-colors" onClick={() => toggleSort('name')}>
                                                Item<span className="text-primary-500">{sortIcon('name')}</span>
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-primary-600 transition-colors" onClick={() => toggleSort('quantity')}>
                                                Jumlah<span className="text-primary-500">{sortIcon('quantity')}</span>
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-primary-600 transition-colors" onClick={cycleStatusFilter}>
                                                Status
                                                {statusFilter ? (
                                                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-primary-100 text-primary-700">{statusFilter === 'In Stock' ? 'In Stock' : 'Out'}</span>
                                                ) : (
                                                    <span className="ml-1 text-gray-300 font-normal">semua</span>
                                                )}
                                            </th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredStock.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900">{item.item_name}</div>
                                                    <div className="text-xs text-gray-500">Updated: {new Date(item.updated_at).toLocaleDateString('id-ID')}</div>
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-gray-900">
                                                    {item.quantity} {item.unit}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.status === 'In Stock'
                                                        ? 'bg-green-100 text-green-800 border-green-200'
                                                        : 'bg-red-100 text-red-800 border-red-200'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleEditClick(item)} className="p-2 text-gray-400 hover:text-primary-600 transition-colors">
                                                            <FaEdit />
                                                        </button>
                                                        <button onClick={() => handleDeleteStock(item.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                                            <FaTrash />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="sm:hidden divide-y divide-gray-50">
                                {filteredStock.map((item) => (
                                    <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1 min-w-0 mr-3">
                                                <p className="font-bold text-gray-900 text-sm truncate">{item.item_name}</p>
                                                <p className="text-xs text-gray-500">Updated: {new Date(item.updated_at).toLocaleDateString('id-ID')}</p>
                                            </div>
                                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${item.status === 'In Stock'
                                                ? 'bg-green-100 text-green-800 border-green-200'
                                                : 'bg-red-100 text-red-800 border-red-200'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-gray-900 text-sm">{item.quantity} {item.unit}</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditClick(item)} className="p-2 text-gray-400 hover:text-primary-600 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
                                                    <FaEdit />
                                                </button>
                                                <button onClick={() => handleDeleteStock(item.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Inventory Mutation History */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                        <FaHistory className="text-primary-600" />
                        <h2 className="font-bold text-gray-900 text-lg">Riwayat Pemakaian Bahan</h2>
                    </div>

                    <div className="px-6 py-3 border-b border-gray-50 flex flex-col sm:flex-row gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 font-medium">Dari</label>
                            <input
                                type="date"
                                value={mutationDateStart}
                                onChange={(e) => setMutationDateStart(e.target.value)}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 font-medium">Sampai</label>
                            <input
                                type="date"
                                value={mutationDateEnd}
                                onChange={(e) => setMutationDateEnd(e.target.value)}
                                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        {(mutationDateStart || mutationDateEnd) && (
                            <button
                                onClick={() => { setMutationDateStart(''); setMutationDateEnd(''); }}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Reset filter
                            </button>
                        )}
                    </div>

                    {isMutationsLoading ? (
                        <div className="p-12 flex justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
                        </div>
                    ) : filteredMutations.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <FaHistory className="mx-auto text-4xl mb-4 opacity-20" />
                            {(mutationDateStart || mutationDateEnd)
                                ? 'Tidak ada riwayat untuk rentang tanggal yang dipilih.'
                                : 'Belum ada riwayat pemakaian bahan.'}
                        </div>
                    ) : (
                        <>
                            <div className="px-6 py-2 text-xs text-gray-500 border-b border-gray-50">
                                Menampilkan {filteredMutations.length} dari {inventoryMutations.length} riwayat
                            </div>
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50/50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tipe</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Barang</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Jumlah</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Stok Awal</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Stok Akhir</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Outlet</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal Laporan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredMutations.map((m) => (
                                            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                                        <FaMinusCircle /> Pemakaian
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{m.item_name}</td>
                                                <td className="px-6 py-4 text-right text-sm font-bold text-red-600">-{m.quantity}</td>
                                                <td className="px-6 py-4 text-right text-sm text-gray-500">{m.stock_before}</td>
                                                <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{m.stock_after}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{m.outlet || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {m.report_date ? new Date(m.report_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="sm:hidden divide-y divide-gray-50">
                                {filteredMutations.map((m) => (
                                    <div key={m.id} className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="font-bold text-gray-900 text-sm">{m.item_name}</span>
                                                <span className="text-xs text-gray-500 ml-2">
                                                    {new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                </span>
                                            </div>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                <FaMinusCircle /> -{m.quantity}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                                            <span>Stok: {m.stock_before} → {m.stock_after}</span>
                                            {m.outlet && <span>Outlet: {m.outlet}</span>}
                                            {m.report_date && <span>Tgl: {new Date(m.report_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">{editingId ? 'Edit Barang' : 'Tambah Barang Baru'}</h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-2">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSaveStock} className="p-4 sm:p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Barang</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.item_name}
                                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Contoh: Saus Mentai 1L"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                                    <input
                                        required
                                        type="number"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                        className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
                                    <select
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="Box">Box</option>
                                        <option value="Kg">Kg</option>
                                        <option value="Liter">Liter</option>
                                        <option value="Pcs">Pcs</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="In Stock">In Stock</option>
                                    <option value="Low Stock">Low Stock</option>
                                    <option value="Out of Stock">Out of Stock</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 text-sm">
                                    Batal
                                </button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary disabled:opacity-50 text-sm">
                                    {isSubmitting ? 'Menyimpan...' : (editingId ? 'Update Barang' : 'Simpan Barang')}
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
                    const [stockRes, mutRes] = await Promise.all([
                        supabase.from('inventory').select('*').order('item_name'),
                        supabase.from('inventory_mutations').select('*').order('created_at', { ascending: false }).limit(100),
                    ]);
                    if (stockRes.data) setStock(stockRes.data);
                    if (mutRes.data) setInventoryMutations(mutRes.data);
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
