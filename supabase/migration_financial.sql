-- 1. Create financial_reports table
CREATE TABLE IF NOT EXISTS financial_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL,
  outlet TEXT NOT NULL DEFAULT '',
  total_terjual_dimsum INTEGER NOT NULL DEFAULT 0,
  setoran_online NUMERIC NOT NULL DEFAULT 0,
  setoran_cash NUMERIC NOT NULL DEFAULT 0,
  -- 5 kolom keuangan (teh dll, lapak, chili, tabungan, cicilan)
  teh_dll_saldo_kemarin NUMERIC NOT NULL DEFAULT 0,
  teh_dll_perubahan NUMERIC NOT NULL DEFAULT 0,
  teh_dll_saldo NUMERIC NOT NULL DEFAULT 0,
  lapak_saldo_kemarin NUMERIC NOT NULL DEFAULT 0,
  lapak_perubahan NUMERIC NOT NULL DEFAULT 0,
  lapak_saldo NUMERIC NOT NULL DEFAULT 0,
  chili_saldo_kemarin NUMERIC NOT NULL DEFAULT 0,
  chili_perubahan NUMERIC NOT NULL DEFAULT 0,
  chili_saldo NUMERIC NOT NULL DEFAULT 0,
  tabungan_saldo_kemarin NUMERIC NOT NULL DEFAULT 0,
  tabungan_perubahan NUMERIC NOT NULL DEFAULT 0,
  tabungan_saldo NUMERIC NOT NULL DEFAULT 0,
  cicilan_saldo_kemarin NUMERIC NOT NULL DEFAULT 0,
  cicilan_perubahan NUMERIC NOT NULL DEFAULT 0,
  cicilan_saldo NUMERIC NOT NULL DEFAULT 0,
  -- pending stock items (manual input)
  pending_stock_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_date, outlet)
);

-- 2. Enable RLS
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_reports' AND policyname = 'Admin can select financial_reports'
  ) THEN
    CREATE POLICY "Admin can select financial_reports" ON financial_reports
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_warehouse')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_reports' AND policyname = 'Admin can insert financial_reports'
  ) THEN
    CREATE POLICY "Admin can insert financial_reports" ON financial_reports
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_warehouse')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_reports' AND policyname = 'Admin can update financial_reports'
  ) THEN
    CREATE POLICY "Admin can update financial_reports" ON financial_reports
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_warehouse')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_reports' AND policyname = 'Admin can delete financial_reports'
  ) THEN
    CREATE POLICY "Admin can delete financial_reports" ON financial_reports
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_warehouse')
      );
  END IF;
END $$;
