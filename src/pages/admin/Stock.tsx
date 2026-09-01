import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth.store';
import { FaBox, FaPlus, FaTrash, FaEdit, FaTimes, FaFileAlt, FaHistory, FaTruck, FaMinusCircle, FaSyncAlt } from 'react-icons/fa';
import { getTodayDate } from '../../utils/dateUtils';

type Product = {
    id: string;
    name: string;
    category: string;
    price: string;
    description: string;
    image: string;
    stock: number;
};

type StockMutation = {
    id: number;
    product_id: number;
    type: 'barang_masuk' | 'terjual';
    quantity: number;
    stock_before: number;
    stock_after: number;
    note: string | null;
    created_by: string | null;
    created_at: string;
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

export const Stock = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'Original',
        price: '',
        description: '',
        image: '',
        stock: 0,
    });

    const [reports, setReports] = useState<StockReport[]>([]);
    const [isReportsLoading, setIsReportsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(getTodayDate());

    const [mutations, setMutations] = useState<StockMutation[]>([]);
    const [isMutationsLoading, setIsMutationsLoading] = useState(true);
    const [isBarangMasukOpen, setIsBarangMasukOpen] = useState(false);
    const [barangMasukForm, setBarangMasukForm] = useState({ product_id: '', quantity: 0, note: '' });
    const [isBarangMasukSubmitting, setIsBarangMasukSubmitting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const [prodRes, mutRes, reportRes] = await Promise.all([
                supabase.from('products').select('*').order('name'),
                supabase.from('stock_mutations').select('*').order('created_at', { ascending: false }),
                supabase.from('stock_reports').select('*').eq('report_date', selectedDate).order('report_date', { ascending: false }).order('created_at', { ascending: false }),
            ]);
            if (prodRes.data) setProducts(prodRes.data);
            if (mutRes.data) setMutations(mutRes.data);
            if (reportRes.data) {
                const enriched = await Promise.all((reportRes.data || []).map(async (r) => {
                    let outlet: string | null = null;
                    if (r.reported_by) {
                        const { data: profile } = await supabase.from('profiles').select('outlet').eq('id', r.reported_by).maybeSingle();
                        outlet = profile?.outlet || null;
                    }
                    return { ...r, profiles: outlet ? { outlet } : null };
                }));
                setReports(dedupeReports(enriched as StockReport[]));
            }
        } catch {}
        setIsRefreshing(false);
    };

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (error) throw error;
            if (data) setProducts(data);
        } catch (error) {
            console.error('Error fetching stock dimsum:', error);
        } finally {
            setIsLoading(false);
        }
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

    const fetchMutations = async () => {
        setIsMutationsLoading(true);
        try {
            const { data, error } = await supabase
                .from('stock_mutations')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            setMutations(data || []);
        } catch (error) {
            console.error('Error fetching mutations:', error);
        } finally {
            setIsMutationsLoading(false);
        }
    };

    const handleBarangMasuk = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsBarangMasukSubmitting(true);
        try {
            const product = products.find(p => String(p.id) === barangMasukForm.product_id);
            if (!product) throw new Error('Product not found');
            const qty = Number(barangMasukForm.quantity);
            const stockBefore = Number(product.stock) || 0;
            const stockAfter = stockBefore + qty;

            const { error: updateError } = await supabase
                .from('products')
                .update({ stock: stockAfter })
                .eq('id', barangMasukForm.product_id);
            if (updateError) throw updateError;

            const { error: mutationError } = await supabase
                .from('stock_mutations')
                .insert([{
                    product_id: Number(barangMasukForm.product_id),
                    type: 'barang_masuk',
                    quantity: qty,
                    stock_before: stockBefore,
                    stock_after: stockAfter,
                    note: barangMasukForm.note || null,
                    created_by: user?.id,
                }]);
            if (mutationError) throw mutationError;

            setIsBarangMasukOpen(false);
            setBarangMasukForm({ product_id: '', quantity: 0, note: '' });
            fetchProducts();
            fetchMutations();
        } catch (error: any) {
            console.error('Error adding barang masuk:', error);
            alert(`Gagal menambah stok: ${error.message || 'Error tidak diketahui'}`);
        } finally {
            setIsBarangMasukSubmitting(false);
        }
    };

    const user = useAuthStore((s) => s.user);

    useEffect(() => {
        fetchProducts();
        fetchMutations();
    }, []);

    useEffect(() => {
        fetchReports();
    }, [selectedDate]);

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingId) {
                const product = products.find(p => p.id === editingId);
                const oldStock = product ? Number(product.stock) || 0 : 0;
                const newStock = Number(formData.stock) || 0;

                const { error } = await supabase
                    .from('products')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;

                if (oldStock !== newStock) {
                    const diff = newStock - oldStock;
                    await supabase.from('stock_mutations').insert([{
                        product_id: Number(editingId),
                        type: diff > 0 ? 'barang_masuk' : 'terjual',
                        quantity: Math.abs(diff),
                        stock_before: oldStock,
                        stock_after: newStock,
                        note: 'Edit manual oleh admin',
                        created_by: user?.id,
                    }]);
                }
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([formData]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ name: '', category: 'Original', price: '', description: '', image: '', stock: 0 });
            fetchProducts();
            fetchMutations();
        } catch (error: any) {
            console.error('Error saving product:', error);
            alert(`Gagal menyimpan dimsum: ${error.message || 'Error tidak diketahui'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (product: Product) => {
        setEditingId(product.id);
        setFormData({
            name: product.name,
            category: product.category,
            price: product.price,
            description: product.description,
            image: product.image,
            stock: product.stock || 0,
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ name: '', category: 'Original', price: '', description: '', image: '', stock: 0 });
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('Yakin ingin menghapus dimsum ini?')) return;
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting dimsum:', error);
            alert('Gagal menghapus dimsum.');
        }
    };

    const groupedReports = reports.reduce<Record<string, StockReport[]>>((acc, report) => {
        const date = report.report_date || 'Unknown';
        if (!acc[date]) acc[date] = [];
        acc[date].push(report);
        return acc;
    }, {});

    return (
        <>
        <div className="p-4 sm:p-6">
            <div className="max-w-full mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Stock Dimsum</h1>
                        <p className="text-sm sm:text-base text-gray-600">Manajemen varian produk dimsum siap jual</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setIsBarangMasukOpen(true)}
                            className="btn-secondary flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
                        >
                            <FaTruck /> Barang Masuk
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="btn-primary flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
                        >
                            <FaPlus /> Tambah Dimsum
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                    {isLoading ? (
                        <div className="p-12 flex justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
                        </div>
                    ) : products.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <FaBox className="mx-auto text-4xl mb-4 opacity-20" />
                            Belum ada produk dimsum.
                        </div>
                    ) : (
                        <>
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50/50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Produk</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Stok</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {products.map((product) => (
                                            <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <img src={product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0" />
                                                        <div>
                                                            <div className="font-bold text-gray-900">{product.name}</div>
                                                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{product.description}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200">
                                                        {product.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-bold ${(product.stock || 0) <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {product.stock || 0}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleEditClick(product)} className="p-2 text-gray-400 hover:text-primary-600 transition-colors">
                                                            <FaEdit />
                                                        </button>
                                                        <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
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
                                {products.map((product) => (
                                    <div key={product.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start gap-3 mb-2">
                                            <img src={product.image} alt={product.name} className="w-14 h-14 rounded-lg object-cover bg-gray-100 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 text-sm truncate">{product.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{product.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold ${(product.stock || 0) <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    Stok: {product.stock || 0}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200">
                                                    {product.category}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditClick(product)} className="p-2 text-gray-400 hover:text-primary-600 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
                                                    <FaEdit />
                                                </button>
                                                <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center">
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

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FaFileAlt className="text-primary-600" />
                            <h2 className="font-bold text-gray-900 text-lg">Laporan dari Staff</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 font-medium hidden sm:inline">Tanggal:</label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm py-1.5"
                            />
                        </div>
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
                        <div className="divide-y divide-gray-50">
                            {Object.entries(groupedReports).map(([date, dateReports]) => (
                                <div key={date}>
                                    <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100">
                                        <span className="text-sm font-semibold text-gray-700">Tanggal: {date}</span>
                                        <span className="text-xs text-gray-500 ml-2">({dateReports.length} produk — menampilkan laporan terbaru per produk/outlet)</span>
                                    </div>
                                    {(() => {
                                        const totalBawaan = dateReports.reduce((s, r) => s + (Number(r.stock_bawaan) || 0), 0);
                                        const totalSisa = dateReports.reduce((s, r) => s + (Number(r.sisa_dimsum) || 0), 0);
                                        const totalTerjual = dateReports.reduce((s, r) => s + (Number(r.terjual) || 0), 0);
                                        return (
                                            <>
                                                <div className="hidden sm:block overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-gray-50/30">
                                                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Produk</th>
                                                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Stok Bawaan</th>
                                                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Sisa</th>
                                                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Terjual</th>
                                                                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Outlet</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {dateReports.map((report) => (
                                                                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                                                                    <td className="px-6 py-3 font-medium text-gray-900">{report.product_name}</td>
                                                                    <td className="px-6 py-3 text-gray-700">{report.stock_bawaan}</td>
                                                                    <td className="px-6 py-3 text-gray-700">{report.sisa_dimsum}</td>
                                                                    <td className="px-6 py-3">
                                                                        <span className="font-semibold text-primary-600">{report.terjual}</span>
                                                                    </td>
                                                                    <td className="px-6 py-3 text-sm text-gray-500">
                                                                        {report.profiles?.outlet || '-'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr className="bg-primary-50/70 border-t-2 border-primary-100 font-bold">
                                                                <td className="px-6 py-3 text-gray-900">TOTAL</td>
                                                                <td className="px-6 py-3 text-gray-900">{totalBawaan}</td>
                                                                <td className="px-6 py-3 text-gray-900">{totalSisa}</td>
                                                                <td className="px-6 py-3 text-primary-700">{totalTerjual}</td>
                                                                <td className="px-6 py-3 text-sm text-gray-500">—</td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                                <div className="sm:hidden divide-y divide-gray-50">
                                                    {dateReports.map((report) => (
                                                        <div key={report.id} className="p-4">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="font-bold text-gray-900 text-sm">{report.product_name}</span>
                                                                <span className="text-xs text-gray-500">{report.profiles?.outlet || '-'}</span>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Stok Bawaan</div>
                                                                    <div className="font-semibold">{report.stock_bawaan}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Sisa</div>
                                                                    <div className="font-semibold">{report.sisa_dimsum}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs text-gray-500">Terjual</div>
                                                                    <div className="font-semibold text-primary-600">{report.terjual}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <div className="p-4 bg-primary-50/70 border-t-2 border-primary-100 grid grid-cols-3 gap-2 text-center text-sm font-bold">
                                                        <div>
                                                            <div className="text-xs text-gray-500 font-medium">Total Bawaan</div>
                                                            <div className="text-gray-900">{totalBawaan}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-gray-500 font-medium">Total Sisa</div>
                                                            <div className="text-gray-900">{totalSisa}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-gray-500 font-medium">Total Terjual</div>
                                                            <div className="text-primary-700">{totalTerjual}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Stock Mutation History */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                        <FaHistory className="text-primary-600" />
                        <h2 className="font-bold text-gray-900 text-lg">Riwayat Mutasi Stok</h2>
                    </div>

                    {isMutationsLoading ? (
                        <div className="p-12 flex justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
                        </div>
                    ) : mutations.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <FaHistory className="mx-auto text-4xl mb-4 opacity-20" />
                            Belum ada riwayat mutasi stok.
                        </div>
                    ) : (
                        <>
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50/50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tipe</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Produk</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Jumlah</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Stok Awal</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Stok Akhir</th>
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Catatan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {mutations.map((m) => (
                                            <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {m.type === 'barang_masuk' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                            <FaTruck /> Barang Masuk
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                                            <FaMinusCircle /> Terjual
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {products.find(p => String(p.id) === String(m.product_id))?.name || `Product #${m.product_id}`}
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">{m.quantity}</td>
                                                <td className="px-6 py-4 text-right text-sm text-gray-500">{m.stock_before}</td>
                                                <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{m.stock_after}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{m.note || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="sm:hidden divide-y divide-gray-50">
                                {mutations.map((m) => {
                                    const productName = products.find(p => String(p.id) === String(m.product_id))?.name || `Product #${m.product_id}`;
                                    return (
                                        <div key={m.id} className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <span className="font-bold text-gray-900 text-sm">{productName}</span>
                                                    <span className="text-xs text-gray-500 ml-2">
                                                        {new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                </div>
                                                {m.type === 'barang_masuk' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <FaTruck /> +{m.quantity}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        <FaMinusCircle /> -{m.quantity}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-500 flex gap-3">
                                                <span>Stok: {m.stock_before} → {m.stock_after}</span>
                                                {m.note && <span>Note: {m.note}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Barang Masuk Modal */}
            {isBarangMasukOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">Tambah Barang Masuk</h3>
                            <button onClick={() => { setIsBarangMasukOpen(false); setBarangMasukForm({ product_id: '', quantity: 0, note: '' }); }} className="text-gray-400 hover:text-gray-600 p-2">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleBarangMasuk} className="p-4 sm:p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Produk</label>
                                <select
                                    required
                                    value={barangMasukForm.product_id}
                                    onChange={(e) => setBarangMasukForm({ ...barangMasukForm, product_id: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="">Pilih Produk</option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (Stok: {p.stock || 0})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    value={barangMasukForm.quantity}
                                    onChange={(e) => setBarangMasukForm({ ...barangMasukForm, quantity: parseInt(e.target.value) || 0 })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Jumlah stok masuk"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
                                <input
                                    type="text"
                                    value={barangMasukForm.note}
                                    onChange={(e) => setBarangMasukForm({ ...barangMasukForm, note: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Contoh: Dari supplier, Produksi hari ini"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => { setIsBarangMasukOpen(false); setBarangMasukForm({ product_id: '', quantity: 0, note: '' }); }} className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 text-sm">
                                    Batal
                                </button>
                                <button type="submit" disabled={isBarangMasukSubmitting} className="flex-1 btn-primary disabled:opacity-50 text-sm">
                                    {isBarangMasukSubmitting ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0">
                            <h3 className="font-bold text-gray-900 text-sm sm:text-base">{editingId ? 'Edit Dimsum' : 'Tambah Dimsum Baru'}</h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-2">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSaveProduct} className="p-4 sm:p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Dimsum</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Contoh: Dimsum Mentai Keju"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="Original">Original</option>
                                        <option value="Dimsum Mentai">Dimsum Mentai</option>
                                        <option value="New Arival">New Arival</option>
                                        <option value="Toping">Toping</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Harga</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="Rp 25.000"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Stok <span className="text-xs text-gray-500 font-normal">(default 0)</span></label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    rows={3}
                                    placeholder="Deskripsi singkat produk..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar</label>
                                <input
                                    type="url"
                                    value={formData.image}
                                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={handleCloseModal} className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 text-sm">
                                    Batal
                                </button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary disabled:opacity-50 text-sm">
                                    {isSubmitting ? 'Menyimpan...' : (editingId ? 'Update Dimsum' : 'Simpan Dimsum')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>

        {/* Floating Refresh Button */}
        <button
            onClick={handleRefresh}
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
