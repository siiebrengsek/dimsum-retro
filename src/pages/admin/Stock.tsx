import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FaBox, FaPlus, FaTrash, FaEdit, FaArrowLeft, FaTimes, FaFileAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';

type Product = {
    id: string;
    name: string;
    category: string;
    price: string;
    description: string;
    image: string;
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
    profiles?: { username?: string } | null;
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
    });

    const [reports, setReports] = useState<StockReport[]>([]);
    const [isReportsLoading, setIsReportsLoading] = useState(true);

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
                .order('report_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;

            const enriched = await Promise.all((data || []).map(async (r) => {
                let username: string | null = null;
                if (r.reported_by) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('username')
                        .eq('id', r.reported_by)
                        .maybeSingle();
                    username = profile?.username || null;
                }
                return { ...r, profiles: username ? { username } : null };
            }));

            setReports(enriched as any);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setIsReportsLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchReports();
        const interval = setInterval(() => { fetchProducts(); fetchReports(); }, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingId) {
                const { error } = await supabase
                    .from('products')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([formData]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            setEditingId(null);
            setFormData({ name: '', category: 'Original', price: '', description: '', image: '' });
            fetchProducts();
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
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ name: '', category: 'Original', price: '', description: '', image: '' });
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
        <div className="min-h-screen bg-gray-50 p-3 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                    <div>
                        <Link to="/admin/dashboard" className="text-primary-600 hover:text-primary-700 flex items-center gap-2 mb-2 font-medium text-sm sm:text-base">
                            <FaArrowLeft /> Kembali ke Dashboard
                        </Link>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Stock Dimsum</h1>
                        <p className="text-sm sm:text-base text-gray-600">Manajemen varian produk dimsum siap jual</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-primary flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
                    >
                        <FaPlus /> Tambah Dimsum
                    </button>
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
                                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Harga</th>
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
                                                <td className="px-6 py-4 font-semibold text-gray-900">{product.price}</td>
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
                                                <span className="font-semibold text-gray-900 text-sm">{product.price}</span>
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
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                        <FaFileAlt className="text-primary-600" />
                        <h2 className="font-bold text-gray-900 text-lg">Laporan dari Staff</h2>
                    </div>

                    {isReportsLoading ? (
                        <div className="p-12 flex justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <FaFileAlt className="mx-auto text-4xl mb-4 opacity-20" />
                            Belum ada laporan dari staff.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {Object.entries(groupedReports).map(([date, dateReports]) => (
                                <div key={date}>
                                    <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100">
                                        <span className="text-sm font-semibold text-gray-700">Tanggal: {date}</span>
                                        <span className="text-xs text-gray-500 ml-2">({dateReports.length} laporan)</span>
                                    </div>
                                    <div className="hidden sm:block overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50/30">
                                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Produk</th>
                                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Stok Bawaan</th>
                                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Sisa</th>
                                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Terjual</th>
                                                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Staff</th>
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
                                                            {report.profiles?.username || report.reported_by?.slice(0, 8) || '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="sm:hidden divide-y divide-gray-50">
                                        {dateReports.map((report) => (
                                            <div key={report.id} className="p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-bold text-gray-900 text-sm">{report.product_name}</span>
                                                    <span className="text-xs text-gray-500">{report.profiles?.username || report.reported_by?.slice(0, 8) || '-'}</span>
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
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

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
    );
};
