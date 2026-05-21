# Dimsum Retro — Web Inventory & POS

Web app manajemen inventori dimsum dengan panel Admin Warehouse dan panel Kasir Staf. Dibangun dengan React + TypeScript + Supabase.

## Tech Stack

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | React 19, TypeScript, Vite (Rolldown) |
| Styling | Tailwind CSS 3 |
| State | Zustand (auth), React Context (cart) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Icons | react-icons |
| Routing | react-router-dom v6 |
| Deployment | Vercel (SPA rewrites) |

## Struktur Project

```
src/
├── main.tsx                     # Entry point
├── App.tsx                      # Routing (public, admin, staff)
├── index.css                    # Tailwind directives + custom CSS
├── lib/
│   └── supabase.ts              # Supabase client
├── stores/
│   └── auth.store.ts            # Zustand auth store (signIn, signUp, role check)
├── context/
│   └── CartContext.tsx           # Shopping cart (public & POS)
├── components/
│   ├── Navbar.tsx                # Navbar publik
│   ├── Footer.tsx                # Footer publik
│   ├── StaffLayout.tsx           # Sidebar layout untuk staf
│   └── ProtectedRoute.tsx        # Route guard (auth + role)
├── utils/
│   ├── storeStatus.ts            # Status buka/tutup toko
│   └── transactions.ts           # CRUD transaksi (localStorage)
└── pages/
    ├── Home.tsx                  # Landing page
    ├── Products.tsx              # Katalog produk publik
    ├── Cart.tsx                  # Keranjang + checkout via WhatsApp
    ├── Login.tsx                 # Login / Sign Up (username/email)
    ├── Reseller.tsx
    ├── Testimonials.tsx
    ├── Contact.tsx
    ├── admin/
    │   ├── Dashboard.tsx         # Overview warehouse
    │   ├── Inventory.tsx         # CRUD bahan baku
    │   ├── Stock.tsx             # CRUD produk + laporan staff
    │   ├── SalesAnalysis.tsx     # Analisis penjualan
    │   └── StaffManagement.tsx   # Daftar staff (read-only)
    └── staff/
        ├── Dashboard.tsx         # POS / Kasir
        ├── ReportDimsum.tsx      # Laporan sisa dimsum
        ├── ReportInventory.tsx   # Laporan pemakaian bahan
        ├── TransaksiHistory.tsx  # Riwayat transaksi
        └── AnalitikPenjualan.tsx # Analitik harian
```

## Role & Hak Akses

### Admin Warehouse (`admin_warehouse`)

| Route | Halaman | Fungsi |
|-------|---------|--------|
| `/admin/dashboard` | Dashboard | Overview stok, staff, penjualan |
| `/admin/inventory` | Stock Inventory | CRUD bahan baku (nama, jumlah, satuan, status) |
| `/admin/stock` | Stock Dimsum | CRUD produk dimsum + lihat laporan dari staff |
| `/admin/sales` | Analisis Penjualan | Laporan harian staff + performa per outlet |
| `/admin/staff` | Staff Management | Lihat daftar staff (read-only, badge role) |

### Staf (`staf`)

| Route | Halaman | Fungsi |
|-------|---------|--------|
| `/staff/dashboard` | POS / Kasir | Pilih produk, atur qty, pilih pembayaran, cetak struk |
| `/staff/report-dimsum` | Laporan Dimsum | Stok bawaan → sisa → terjual, kirim ke admin |
| `/staff/report-inventory` | Pemakaian Bahan | Laporkan pemakaian bahan baku, potong stok warehouse |
| `/staff/transaksi-history` | Riwayat Transaksi | Lihat seluruh transaksi POS |
| `/staff/analitik-penjualan` | Analitik Penjualan | Omset + breakdown per metode pembayaran hari ini |

### Publik (tanpa login)

| Route | Halaman |
|-------|---------|
| `/` | Landing page |
| `/products` | Katalog produk |
| `/cart` | Keranjang + checkout WhatsApp |
| `/reseller` | Info program reseller |
| `/testimonials` | Testimoni pelanggan |
| `/contact` | Kontak & FAQ |

## Fitur Utama

### Publik
- Katalog produk dengan kategori (Original, Dimsum Mentai, New Arival, Toping)
- Keranjang belanja dengan checkout via WhatsApp
- Status toko (open/closed, jam 10:00–21:00)
- PWA support (manifest + service worker)

### Admin Warehouse
- Dashboard ringkasan: jumlah inventory, produk, total penjualan, jumlah staff
- CRUD bahan baku dengan satuan (Box, Kg, Liter, Pcs) dan status (In Stock, Low Stock, Out of Stock)
- CRUD produk dimsum (nama, kategori, harga, deskripsi, gambar)
- Lihat laporan sisa dimsum dari staff (per tanggal, grouped by date)
- Analisis penjualan: rekap harian (tunai, QRIS, online) + performa per outlet

### Staff / Kasir
- POS dengan 14 produk dimsum (hardcoded, static)
- Filter kategori produk
- Metode pembayaran: Tunai, GoFood, Grab, Shopee, QRIS
- Hitung otomatis kembalian untuk pembayaran tunai
- Cetak struk (tampilan di layar)
- Laporan sisa dimsum: isi stok bawaan + sisa, auto-hitung terjual, kirim ke `stock_reports`
- Laporan pemakaian bahan: potong stok warehouse langsung dari Supabase
- Riwayat transaksi dan analitik penjualan harian (disimpan di localStorage)

## Database (Supabase)

### Tabel

| Tabel | Kegunaan |
|-------|----------|
| `profiles` | Profil user (id, role, username, email) |
| `products` | Produk dimsum (id BIGINT, name, category, price, description, image) |
| `inventory` | Inventori bahan baku (id, item_name, quantity, unit, status) |
| `stock_reports` | Laporan sisa dimsum dari staff (product_id, stock_bawaan, sisa_dimsum, terjual, reported_by) |
| `daily_reports` | Laporan penjualan harian staff (total_sold_cash, qris, online, status) |
| `sales` | Penjualan legacy (product_name, amount, outlet_id) |
| `outlets` | Cabang outlet (name, location) |

### RPC Functions

| Fungsi | Kegunaan |
|--------|----------|
| `lookup_email_by_username(text)` | Cari email dari username (SECURITY DEFINER) |
| `insert_profile(uuid, text, text, text)` | Insert profile bypass RLS |

### RLS Policies

- `profiles`: read-all, insert-by-owner
- `stock_reports`: staff insert/view own, admin view all
- `inventory`, `products`, `daily_reports`, `sales`: sesuai role

## Auth Flow

1. **Sign In** — input username (atau email). Sistem panggil `lookup_email_by_username` untuk resolve username ke email, lalu login via `supabase.auth.signInWithPassword`.
2. **Sign Up** — input username + email + password. Buat user auth → insert profile via `insert_profile` RPC (fallback metadata).
3. **Role check** — setelah login, `ProtectedRoute` verifikasi role cocok dengan route.
4. **Session restore** — `auth.store.ts` listen `onAuthStateChange` + restore dari session.

## Setup Local

```bash
# 1. Clone & install
git clone <repo-url>
cd projectwebdimsumretro
npm install

# 2. Environment
cp .env.example .env
# Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY

# 3. Migration SQL
# Buka SQL Editor di Supabase dashboard
# Jalankan supabase/migration_username.sql

# 4. Jalankan dev
npm run dev
```

## Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Login (Local Dev)

**URL:** `http://localhost:5173/staff/`

**Admin:**
- Username: `admin2`
- Password: `your-admin-password`

**Staff:**
- Email: `staff@example.com`
- Password: `your-staff-password`

## Scripts

```bash
npm run dev       # Start dev server
npm run build     # TypeScript check + build
npm run lint      # ESLint
npm run preview   # Preview build
```

## Alur Data Penting

### POS (Kasir)
1. Staff pilih produk → masuk CartContext (React Context, in-memory)
2. Pilih metode pembayaran + input tunai (jika tunai)
3. Klik Bayar → simpan ke localStorage via `saveTransaction()`
4. Tampilkan struk di layar

### Report Dimsum
1. Staff isi stok bawaan + sisa dimsum untuk setiap produk
2. Sistem auto-hitung terjual = stok_bawaan - sisa
3. Data otomatis tersimpan ke localStorage (recovery jika halaman reload)
4. Klik "Kirim Laporan ke Admin" → insert ke `stock_reports` table
5. Admin lihat laporan di halaman Stock, dikelompokkan per tanggal

### Report Inventory
1. Staff lihat daftar bahan baku dari `inventory` table
2. Isi jumlah pemakaian
3. Klik "Potong Stok Warehouse" → update quantity di tabel `inventory`
4. Riwayat disimpan ke localStorage

## Deployment

Sudah siap deploy ke Vercel:
- `vercel.json` dengan SPA rewrites (semua route → index.html)
- Build: `npm run build`

## Catatan

- Role `admin_warehouse` hanya bisa dibuat via Supabase dashboard (tidak lewat sign-up)
- Transaksi POS disimpan di **localStorage** masing-masing perangkat (tidak di Supabase)
- Produk di halaman publik dan POS bersifat **hardcoded** (file Products.tsx / Dashboard.tsx), bukan dari database
- Produk di halaman admin Stock diambil dari **database** (tabel `products`) — berbeda dengan yang hardcoded
- Store open: 10:00–21:00
- Checkout publik via WhatsApp ke `+6282141066708`
