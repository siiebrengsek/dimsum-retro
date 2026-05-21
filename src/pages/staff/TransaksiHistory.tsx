import { useState, useEffect } from 'react';
import { getTransactions, type Transaction } from '../../utils/transactions';

const paymentLabels: Record<string, string> = {
    tunai: 'Tunai',
    gofood: 'GoFood',
    grab: 'Grab',
    shoppe: 'Shopee',
    qris: 'QRIS',
};

export const TransaksiHistory = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        setTransactions(getTransactions());
    }, []);

    const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-white">Riwayat Transaksi</h1>
                <p className="text-sm text-gray-400">Daftar seluruh transaksi penjualan</p>
            </div>

            {transactions.length === 0 ? (
                <div className="bg-[#1A1A2E] rounded-2xl p-8 text-center">
                    <p className="text-gray-400 text-sm">Belum ada transaksi.</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden sm:block bg-[#111118] rounded-2xl border border-[#1A1A2E] overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-[#1A1A2E]">
                                <tr>
                                    <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase">Tanggal</th>
                                    <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase">Produk</th>
                                    <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase">Pembayaran</th>
                                    <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1A1A2E]">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-[#1A1A2E]/50 transition">
                                        <td className="px-5 py-4 text-sm text-gray-300">
                                            {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </td>
                                        <td className="px-5 py-4 text-sm text-white">
                                            {tx.items.map((item, i) => (
                                                <span key={i}>
                                                    {i > 0 && ', '}
                                                    {item.productName} x{item.quantity}
                                                </span>
                                            ))}
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-400">
                                            {paymentLabels[tx.paymentMethod] || tx.paymentMethod}
                                        </td>
                                        <td className="px-5 py-4 text-sm text-[#F5A623] font-bold text-right">
                                            {formatRupiah(tx.total)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="sm:hidden space-y-3">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="bg-[#1A1A2E] rounded-xl p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-white text-sm font-semibold">
                                            {tx.items.map((item, i) => (
                                                <span key={i}>
                                                    {i > 0 && ', '}
                                                    {item.productName} x{item.quantity}
                                                </span>
                                            ))}
                                        </p>
                                        <p className="text-gray-400 text-xs">
                                            {new Date(tx.createdAt).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                    <p className="text-[#F5A623] font-bold text-sm">{formatRupiah(tx.total)}</p>
                                </div>
                                <p className="text-gray-500 text-xs">{paymentLabels[tx.paymentMethod] || tx.paymentMethod}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
