import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { getTodayDate } from '../../utils/dateUtils';
import { FaMoneyBillWave, FaPlus, FaTrash, FaSave, FaSyncAlt, FaBoxes, FaInfoCircle, FaSearch } from 'react-icons/fa';

const COLUMNS = [
  { key: 'teh_dll', label: 'Teh dll' },
  { key: 'lapak', label: 'Lapak' },
  { key: 'chili', label: 'Chili' },
  { key: 'tabungan', label: 'Tabungan' },
  { key: 'cicilan', label: 'Cicilan' },
] as const;

type ColumnData = { saldo_kemarin: number; perubahan: number; saldo: number };

type PendingStockItem = {
  name: string;
  stok_kemarin: number;
  perubahan: number;
  sisa_hari_ini: number;
};

type SetoranItem = {
  id: string;
  name: string;
  totalTerjual: string;
  setoranOnline: string;
};

type FinancialReport = {
  id: string;
  report_date: string;
  outlet: string;
  total_terjual_dimsum: number;
  setoran_online: number;
  setoran_cash: number;
  setoran_items: SetoranItem[];
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
  pending_stock_items: PendingStockItem[];
};

let idCounter = 0;
const newId = () => `s${++idCounter}_${Date.now()}`;

const emptyColumn = (): ColumnData => ({ saldo_kemarin: 0, perubahan: 0, saldo: 0 });
const emptySetoran = (): SetoranItem => ({ id: newId(), name: 'Setoran Cash', totalTerjual: '0', setoranOnline: '0' });

const fmt = (val: number) =>
  val % 1 === 0
    ? `Rp ${val.toLocaleString('id-ID')}`
    : `Rp ${val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const numOr0 = (s: string) => Math.max(0, Number(s) || 0);

export const FinancialManagement = () => {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [outlets, setOutlets] = useState<string[]>([]);
  const [reportId, setReportId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<'saved' | 'error' | null>(null);
  const [inventoryRef, setInventoryRef] = useState<string[]>([]);
  const [columnData, setColumnData] = useState<Record<string, ColumnData>>({});
  const [pendingStock, setPendingStock] = useState<PendingStockItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [setoranItems, setSetoranItems] = useState<SetoranItem[]>([emptySetoran()]);
  const [stockSearch, setStockSearch] = useState('');
  const [stockSortKey, setStockSortKey] = useState<'name' | 'stok_kemarin'>('name');
  const [stockSortDir, setStockSortDir] = useState<'asc' | 'desc'>('asc');

  const hasilSetoran = useMemo(() => {
    return setoranItems.map(item => ({
      id: item.id,
      hasil: Math.max(0, numOr0(item.totalTerjual) * 2200 - numOr0(item.setoranOnline)),
    }));
  }, [setoranItems]);

  const totalTerjualSetoran = useMemo(() => {
    return setoranItems.reduce((sum, item) => sum + numOr0(item.totalTerjual), 0);
  }, [setoranItems]);

  const totalOnlineSetoran = useMemo(() => {
    return setoranItems.reduce((sum, item) => sum + numOr0(item.setoranOnline), 0);
  }, [setoranItems]);

  const totalSetoran = useMemo(() => {
    return hasilSetoran.reduce((sum, h) => sum + h.hasil, 0);
  }, [hasilSetoran]);

  useEffect(() => {
    supabase.from('profiles').select('outlet').then(({ data }) => {
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

  const getInventoryNames = useCallback(async () => {
    const { data } = await supabase.from('inventory').select('item_name').order('item_name');
    return (data || []).map((i: { item_name: string }) => i.item_name);
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
        const cols: Record<string, ColumnData> = {};
        for (const c of COLUMNS) {
          cols[c.key] = {
            saldo_kemarin: Number((r as any)[`${c.key}_saldo_kemarin`] || 0),
            perubahan: Number((r as any)[`${c.key}_perubahan`] || 0),
            saldo: Number((r as any)[`${c.key}_saldo`] || 0),
          };
        }
        setColumnData(cols);

        if (Array.isArray(r.setoran_items) && r.setoran_items.length > 0) {
          setSetoranItems(r.setoran_items.map((s: any) => ({
            id: s.id || newId(),
            name: s.name || 'Setoran Cash',
            totalTerjual: String(s.totalTerjual ?? '0'),
            setoranOnline: String(s.setoranOnline ?? '0'),
          })));
        } else {
          setSetoranItems([{
            id: newId(),
            name: 'Setoran Cash',
            totalTerjual: String(r.total_terjual_dimsum || 0),
            setoranOnline: String(Number(r.setoran_online) || 0),
          }]);
        }

        if (Array.isArray(r.pending_stock_items) && r.pending_stock_items.length > 0) {
          setPendingStock(r.pending_stock_items);
        } else {
          const invNames = await getInventoryNames();
          setInventoryRef(invNames);
          setPendingStock(invNames.map(name => ({ name, stok_kemarin: 0, perubahan: 0, sisa_hari_ini: 0 })));
        }
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
        const cols: Record<string, ColumnData> = {};
        for (const c of COLUMNS) {
          const prevVal = prev ? Number((prev as any)[`${c.key}_saldo`] || 0) : 0;
          cols[c.key] = { saldo_kemarin: prevVal, perubahan: 0, saldo: prevVal };
        }
        setColumnData(cols);

        setSetoranItems([emptySetoran()]);

        const prevStock = prev
          ? (prev as unknown as FinancialReport).pending_stock_items || []
          : [];
        const prevMap = new Map<string, number>();
        for (const p of prevStock) prevMap.set(p.name, p.sisa_hari_ini || 0);

        const invNames = await getInventoryNames();
        setInventoryRef(invNames);
        setPendingStock(
          invNames.map(name => {
            const stokKemarin = prevMap.get(name) || 0;
            return { name, stok_kemarin: stokKemarin, perubahan: 0, sisa_hari_ini: stokKemarin };
          })
        );
      }
    } catch (e) {
      console.error('Error loading report', e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedOutlet, getInventoryNames]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const handleColumnChange = (key: string, value: number) => {
    setColumnData(prev => {
      const col = { ...prev[key] };
      col.perubahan = value;
      col.saldo = col.saldo_kemarin + col.perubahan;
      return { ...prev, [key]: col };
    });
  };

  const handleStockChange = (index: number, value: number) => {
    setPendingStock(prev => {
      const next = [...prev];
      next[index] = { ...next[index], perubahan: value, sisa_hari_ini: next[index].stok_kemarin + value };
      return next;
    });
  };

  const addPendingItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    setPendingStock(prev => [...prev, { name, stok_kemarin: 0, perubahan: 0, sisa_hari_ini: 0 }]);
    setNewItemName('');
  };

  const removePendingItem = (index: number) => {
    setPendingStock(prev => prev.filter((_, i) => i !== index));
  };

  const updateSetoranItem = (id: string, field: 'name' | 'totalTerjual' | 'setoranOnline', value: string) => {
    setSetoranItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addSetoranRow = () => {
    setSetoranItems(prev => [...prev, { id: newId(), name: '', totalTerjual: '0', setoranOnline: '0' }]);
  };

  const removeSetoranRow = (id: string) => {
    setSetoranItems(prev => prev.filter(item => item.id !== id));
  };

  const toggleStockSort = (key: 'name' | 'stok_kemarin') => {
    setStockSortKey(prev => {
      if (prev === key) {
        setStockSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setStockSortDir('asc');
      return key;
    });
  };

  const filteredStock = useMemo(() => {
    let list = pendingStock;
    if (stockSearch.trim()) {
      const q = stockSearch.toLowerCase();
      list = list.filter(item => item.name.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      if (stockSortKey === 'name') {
        return stockSortDir === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return stockSortDir === 'asc'
        ? a.stok_kemarin - b.stok_kemarin
        : b.stok_kemarin - a.stok_kemarin;
    });
    return list;
  }, [pendingStock, stockSearch, stockSortKey, stockSortDir]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const payload: Record<string, any> = {
        report_date: selectedDate,
        outlet: selectedOutlet,
        setoran_items: setoranItems,
        pending_stock_items: pendingStock,
      };

      payload.total_terjual_dimsum = numOr0(setoranItems[0]?.totalTerjual || '0');
      payload.setoran_online = numOr0(setoranItems[0]?.setoranOnline || '0');
      payload.setoran_cash = totalSetoran;

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
    } catch (e) {
      console.error('Save error', e);
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

  const renderNumInput = (val: string, onChange: (v: string) => void, cls = '') => (
    <input
      type="text"
      inputMode="numeric"
      value={val}
      onChange={e => {
        const raw = e.target.value;
        if (raw === '' || raw === '-' || /^-?\d*$/.test(raw)) onChange(raw);
      }}
      onBlur={() => { if (val === '' || val === '-') onChange('0'); }}
      className={`rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm ${cls || 'w-24 sm:w-28 text-right'}`}
    />
  );

  const SortIcon = ({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) => (
    <span className="inline-block ml-1 text-xs">{active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}</span>
  );

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
              {/* Section 1: Setoran Cash — Dynamic */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="font-bold text-gray-900 text-sm sm:text-base">
                    <FaMoneyBillWave className="inline mr-1.5 text-green-500" />
                    Setoran Cash
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-xs font-bold text-gray-500 uppercase">Nama</th>
                        <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase text-right">Total Terjual</th>
                        <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase text-right">Setoran Online</th>
                        <th className="px-3 py-3 text-xs font-bold text-gray-900 uppercase text-right">Hasil</th>
                        <th className="px-3 py-3 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {setoranItems.map((item) => {
                        const hasil = Math.max(0, numOr0(item.totalTerjual) * 2200 - numOr0(item.setoranOnline));
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 sm:px-6 py-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={e => updateSetoranItem(item.id, 'name', e.target.value)}
                                className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500 text-sm"
                                placeholder="Nama setoran..."
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex items-center gap-1">
                                {renderNumInput(item.totalTerjual, v => updateSetoranItem(item.id, 'totalTerjual', v))}
                                <span className="text-xs text-gray-400">pcs</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">
                              {renderNumInput(item.setoranOnline, v => updateSetoranItem(item.id, 'setoranOnline', v))}
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-bold text-primary-600">{fmt(hasil)}</td>
                            <td className="px-3 py-2 text-right">
                              {setoranItems.length > 1 && (
                                <button onClick={() => removeSetoranRow(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                  <FaTrash size={12} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50/80 border-t border-gray-100">
                      <tr>
                        <td className="px-4 sm:px-6 py-3 text-sm font-extrabold text-gray-900">Total Keseluruhan</td>
                        <td className="px-3 py-3 text-right text-sm font-bold text-gray-800">{totalTerjualSetoran}</td>
                        <td className="px-3 py-3 text-right text-sm font-bold text-gray-800">{fmt(totalOnlineSetoran)}</td>
                        <td className="px-3 py-3 text-right text-sm font-extrabold text-green-700">{fmt(totalSetoran)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="px-4 sm:px-6 py-3 border-t border-gray-100">
                  <button onClick={addSetoranRow} className="btn-secondary flex items-center gap-1.5 text-sm">
                    <FaPlus /> Tambah Baris
                  </button>
                </div>
              </div>

              {/* Section 2: 5 Kolom Keuangan */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="font-bold text-gray-900 text-sm sm:text-base">5 Kolom Keuangan</h2>
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
                            <td className="px-3 py-3 text-right text-sm text-gray-600">{fmt(col.saldo_kemarin)}</td>
                            <td className="px-3 py-3 text-right">
                              {renderNumInput(String(col.perubahan), v => handleColumnChange(c.key, Number(v) || 0))}
                            </td>
                            <td className="px-3 py-3 text-right text-sm font-bold text-primary-600">{fmt(col.saldo)}</td>
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
                  <p className="text-xs text-gray-500">Stok kemarin + perubahan = sisa hari ini</p>
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
                    <button onClick={addPendingItem} className="btn-primary flex items-center gap-1.5 text-sm whitespace-nowrap">
                      <FaPlus /> Tambah
                    </button>
                  </div>

                  <div className="relative mb-4">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="text"
                      value={stockSearch}
                      onChange={e => setStockSearch(e.target.value)}
                      className="w-full rounded-lg border-gray-300 pl-8 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      placeholder="Cari item..."
                    />
                  </div>

                  {filteredStock.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      {pendingStock.length === 0 ? 'Belum ada item pending.' : 'Tidak ada item yang cocok.'}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                          <tr>
                            <th
                              className="px-4 py-3 text-xs font-bold text-gray-500 uppercase cursor-pointer select-none hover:text-primary-600"
                              onClick={() => toggleStockSort('name')}
                            >
                              Nama Item <SortIcon active={stockSortKey === 'name'} dir={stockSortDir} />
                            </th>
                            <th
                              className="px-3 py-3 text-xs font-bold text-gray-500 uppercase text-right cursor-pointer select-none hover:text-primary-600"
                              onClick={() => toggleStockSort('stok_kemarin')}
                            >
                              Stok Kemarin <SortIcon active={stockSortKey === 'stok_kemarin'} dir={stockSortDir} />
                            </th>
                            <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase text-right">Perubahan (+/-)</th>
                            <th className="px-3 py-3 text-xs font-bold text-gray-900 uppercase text-right">Sisa Hari Ini</th>
                            <th className="px-3 py-3 w-10" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredStock.map((item) => {
                            const realIndex = pendingStock.findIndex(p => p.name === item.name);
                            return (
                              <tr key={item.name} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{item.name}</td>
                                <td className="px-3 py-3 text-right text-sm text-gray-600">{item.stok_kemarin}</td>
                                <td className="px-3 py-3 text-right">
                                  {renderNumInput(String(item.perubahan), v => handleStockChange(realIndex, Number(v) || 0))}
                                </td>
                                <td className="px-3 py-3 text-right text-sm font-bold text-primary-600">{item.sisa_hari_ini}</td>
                                <td className="px-3 py-3 text-right">
                                  <button onClick={() => removePendingItem(realIndex)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                    <FaTrash size={12} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-between">
                <div>
                  {saveMessage === 'saved' && (
                    <span className="text-sm text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">Laporan tersimpan!</span>
                  )}
                  {saveMessage === 'error' && (
                    <span className="text-sm text-red-600 font-semibold bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">Gagal menyimpan. Coba lagi.</span>
                  )}
                </div>
                <button onClick={handleSave} disabled={isSaving} className="btn-primary flex items-center gap-2 text-sm px-6 py-2.5">
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
