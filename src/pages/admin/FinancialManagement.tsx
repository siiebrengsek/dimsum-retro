import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { getTodayDate } from '../../utils/dateUtils';
import { FaMoneyBillWave, FaPlus, FaTrash, FaSave, FaSyncAlt, FaBoxes, FaInfoCircle } from 'react-icons/fa';

const COLUMNS = [
  { key: 'teh_dll', label: 'Teh dll' },
  { key: 'lapak', label: 'Lapak' },
  { key: 'chili', label: 'Chili' },
  { key: 'tabungan', label: 'Tabungan' },
  { key: 'cicilan', label: 'Cicilan' },
] as const;

type ColumnData = {
  saldo_kemarin: number;
  perubahan: number;
  saldo: number;
};

type FinancialReport = {
  id: string;
  report_date: string;
  outlet: string;
  total_terjual_dimsum: number;
  setoran_online: number;
  setoran_cash: number;
  teh_dll_saldo_kemarin: number;
  teh_dll_perubahan: number;
  teh_dll_saldo: number;
  lapak_saldo_kemarin: number;
  lapak_perubahan: number;
  lapak_saldo: number;
  chili_saldo_kemarin: number;
  chili_perubahan: number;
  chili_saldo: number;
  tabungan_saldo_kemarin: number;
  tabungan_perubahan: number;
  tabungan_saldo: number;
  cicilan_saldo_kemarin: number;
  cicilan_perubahan: number;
  cicilan_saldo: number;
  pending_stock_items: string[];
};

const emptyColumn = (): ColumnData => ({ saldo_kemarin: 0, perubahan: 0, saldo: 0 });

const formatRupiah = (val: number) => `Rp ${Math.round(val).toLocaleString('id-ID')}`;

export const FinancialManagement = () => {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [outlets, setOutlets] = useState<string[]>([]);
  const [reportId, setReportId] = useState<string | null>(null);
  const [totalTerjual, setTotalTerjual] = useState(0);
  const [setoranOnline, setSetoranOnline] = useState(0);
  const [columnData, setColumnData] = useState<Record<string, ColumnData>>({});
  const [pendingItems, setPendingItems] = useState<string[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [inventoryRef, setInventoryRef] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<'saved' | 'error' | null>(null);

  const setoranCash = useMemo(() => {
    return Math.max(0, (totalTerjual * 2.2 / 2200) - setoranOnline);
  }, [totalTerjual, setoranOnline]);

  const formatCash = useMemo(() => {
    const val = totalTerjual * 2.2 / 2200;
    return `Rp ${Math.round(val).toLocaleString('id-ID')}`;
  }, [totalTerjual]);

  useEffect(() => {
    supabase.from('profiles').select('outlet').neq('role', 'admin_warehouse').then(({ data }) => {
      const unique = [...new Set((data || []).map(p => p.outlet).filter(Boolean) as string[])];
      setOutlets(unique.sort());
      if (!selectedOutlet && unique.length > 0) setSelectedOutlet(unique[0]);
    });
  }, []);

  useEffect(() => {
    supabase.from('inventory').select('item_name').order('item_name').then(({ data }) => {
      setInventoryRef((data || []).map(i => i.item_name));
    });
  }, []);

  const loadReport = useCallback(async () => {
    if (!selectedDate || !selectedOutlet) return;
    setIsLoading(true);
    try {
      const { data: existing } = await supabase
        .from('financial_reports')
        .select('*')
        .eq('report_date', selectedDate)
        .eq('outlet', selectedOutlet)
        .maybeSingle();

      if (existing) {
        const r = existing as unknown as FinancialReport;
        setReportId(r.id);
        setTotalTerjual(r.total_terjual_dimsum);
        setSetoranOnline(Number(r.setoran_online));
        const cols: Record<string, ColumnData> = {};
        for (const c of COLUMNS) {
          cols[c.key] = {
            saldo_kemarin: Number((r as any)[`${c.key}_saldo_kemarin`] || 0),
            perubahan: Number((r as any)[`${c.key}_perubahan`] || 0),
            saldo: Number((r as any)[`${c.key}_saldo`] || 0),
          };
        }
        setColumnData(cols);
        setPendingItems(Array.isArray(r.pending_stock_items) ? r.pending_stock_items : []);
      } else {
        const yesterday = new Date(selectedDate);
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];

        const { data: prev } = await supabase
          .from('financial_reports')
          .select('*')
          .eq('report_date', yStr)
          .eq('outlet', selectedOutlet)
          .maybeSingle();

        setReportId(null);
        setTotalTerjual(0);
        setSetoranOnline(0);
        const cols: Record<string, ColumnData> = {};
        for (const c of COLUMNS) {
          const prevVal = prev ? Number((prev as any)[`${c.key}_saldo`] || 0) : 0;
          cols[c.key] = { saldo_kemarin: prevVal, perubahan: 0, saldo: prevVal };
        }
        setColumnData(cols);
        setPendingItems([]);
      }
    } catch {
      console.error('Error loading report');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedOutlet]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleColumnChange = (key: string, field: 'perubahan', value: number) => {
    setColumnData(prev => {
      const col = { ...prev[key] };
      col[field] = value;
      col.saldo = col.saldo_kemarin + col.perubahan;
      return { ...prev, [key]: col };
    });
  };

  const addPendingItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    setPendingItems(prev => [...prev, name]);
    setNewItemName('');
  };

  const removePendingItem = (index: number) => {
    setPendingItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const payload: Record<string, any> = {
        report_date: selectedDate,
        outlet: selectedOutlet,
        total_terjual_dimsum: totalTerjual,
        setoran_online: setoranOnline,
        setoran_cash: setoranCash,
        pending_stock_items: pendingItems,
      };

      for (const c of COLUMNS) {
        const col = columnData[c.key] || emptyColumn();
        payload[`${c.key}_saldo_kemarin`] = col.saldo_kemarin;
        payload[`${c.key}_perubahan`] = col.perubahan;
        payload[`${c.key}_saldo`] = col.saldo;
      }

      if (reportId) {
        const { error } = await supabase
          .from('financial_reports')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', reportId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('financial_reports')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) setReportId(data.id);
      }

      setSaveMessage('saved');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage('error');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadReport();
    setIsRefreshing(false);
  };

  return (
    <>
      <div className="p-4 sm:p-6">
        <div className="max-w-full mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                <FaMoneyBillWave className="inline mr-2 text-green-500" />
                Financial Management
              </h1>
              <p className="text-sm text-gray-500">Laporan keuangan harian — setoran cash, 5 kolom, pending stock</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedOutlet}
                onChange={e => setSelectedOutlet(e.target.value)}
                className="rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm py-1.5"
              >
                <option value="">Pilih Outlet</option>
                {outlets.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm py-1.5"
              />
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-gray-500"
                title="Refresh"
              >
                <FaSyncAlt className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
            </div>
          ) : !selectedOutlet ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
              Pilih outlet untuk memulai
            </div>
          ) : (
            <div className="space-y-6">
              {/* Section 1: Setoran Cash */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="font-bold text-gray-900 text-sm sm:text-base">
                    <FaMoneyBillWave className="inline mr-1.5 text-green-500" />
                    Setoran Cash
                  </h2>
                </div>
                <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Total Terjual Dimsum
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        value={totalTerjual}
                        onChange={e => setTotalTerjual(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm pr-12"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">pcs</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Setoran Online (Rp)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={setoranOnline}
                      onChange={e => setSetoranOnline(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div className="bg-green-50 rounded-xl border border-green-100 p-4 flex flex-col justify-center">
                    <p className="text-xs text-green-700 font-semibold uppercase tracking-wider mb-0.5">Setoran Cash</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-700">{formatRupiah(setoranCash)}</p>
                    <p className="text-[10px] text-green-500 mt-0.5">
                      {totalTerjual} × 2.2 / 2200 = {formatCash}
                      {setoranOnline > 0 && ` — ${formatRupiah(setoranOnline)} online`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: 5 Kolom Keuangan */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="font-bold text-gray-900 text-sm sm:text-base">
                    5 Kolom Keuangan
                  </h2>
                  <p className="text-xs text-gray-500">Saldo = Saldo Kemarin + Perubahan</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Kolom</th>
                        <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase text-right">Saldo Kemarin</th>
                        <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase text-right">Perubahan (+/-)</th>
                        <th className="px-3 py-3 text-xs font-bold text-gray-900 uppercase text-right">Saldo Hari Ini</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {COLUMNS.map(c => {
                        const col = columnData[c.key] || emptyColumn();
                        return (
                          <tr key={c.key} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 sm:px-6 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{c.label}</td>
                            <td className="px-3 py-3 text-right text-sm text-gray-600">{formatRupiah(col.saldo_kemarin)}</td>
                            <td className="px-3 py-3 text-right">
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  value={col.perubahan}
                                  onChange={e => handleColumnChange(c.key, 'perubahan', Number(e.target.value) || 0)}
                                  className="w-28 sm:w-36 text-right rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm"
                                />
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-bold text-primary-600">{formatRupiah(col.saldo)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Pending Stock Packaging */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="font-bold text-gray-900 text-sm sm:text-base">
                    <FaBoxes className="inline mr-1.5 text-orange-500" />
                    Pending Stock Packaging
                  </h2>
                  <p className="text-xs text-gray-500">Input manual item yang perlu dicatat sebagai pending stock</p>
                </div>
                <div className="p-4 sm:p-6">
                  {inventoryRef.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                        <FaInfoCircle className="text-blue-400" />
                        <span>Referensi dari Inventory:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {inventoryRef.map(name => (
                          <span key={name} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{name}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addPendingItem(); }}
                      className="flex-1 rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      placeholder="Nama item..."
                    />
                    <button
                      onClick={addPendingItem}
                      className="btn-primary flex items-center gap-1.5 text-sm whitespace-nowrap"
                    >
                      <FaPlus /> Tambah
                    </button>
                  </div>

                  {pendingItems.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Belum ada item pending.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {pendingItems.map((item, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                          <span className="text-sm text-gray-800">{item}</span>
                          <button
                            onClick={() => removePendingItem(i)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-between">
                <div>
                  {saveMessage === 'saved' && (
                    <span className="text-sm text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                      Laporan tersimpan!
                    </span>
                  )}
                  {saveMessage === 'error' && (
                    <span className="text-sm text-red-600 font-semibold bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                      Gagal menyimpan. Coba lagi.
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn-primary flex items-center gap-2 text-sm px-6 py-2.5"
                >
                  <FaSave className={isSaving ? 'animate-spin' : ''} />
                  {isSaving ? 'Menyimpan...' : 'Simpan Laporan'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button onClick={handleRefresh} disabled={isRefreshing}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary-600 text-white px-5 py-3.5 rounded-full shadow-lg hover:bg-primary-700 transition-all disabled:opacity-70"
        title="Refresh data"
      >
        <FaSyncAlt className={isRefreshing ? 'animate-spin' : ''} />
        <span className="text-sm font-semibold">Refresh</span>
      </button>
    </>
  );
};
