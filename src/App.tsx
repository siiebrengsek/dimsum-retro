import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Products from './pages/Products';
import Cart from './pages/Cart';
import Reseller from './pages/Reseller';
import Testimonials from './pages/Testimonials';
import Contact from './pages/Contact';
import { Login } from './pages/Login';
import { Dashboard } from './pages/admin/Dashboard';
import { Inventory } from './pages/admin/Inventory';
import { SalesAnalysis } from './pages/admin/SalesAnalysis';
import { StaffManagement } from './pages/admin/StaffManagement';
import { Stock } from './pages/admin/Stock';
import { StockHistory } from './pages/admin/StockHistory';

import { StaffLayout } from './components/StaffLayout';
import { Dashboard as StaffDashboard } from './pages/staff/Dashboard';
import { ReportDimsum as StaffReportDimsum } from './pages/staff/ReportDimsum';
import { ReportInventory as StaffReportInventory } from './pages/staff/ReportInventory';
import { ReportStockInventory as StaffReportStockInventory } from './pages/staff/ReportStockInventory';
import { TransaksiHistory as StaffTransaksiHistory } from './pages/staff/TransaksiHistory';
import { AnalitikPenjualan as StaffAnalitikPenjualan } from './pages/staff/AnalitikPenjualan';
import Footer from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CartProvider } from './context/CartContext';
import { useAuthStore } from './stores/auth.store';
import './index.css';

function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <CartProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Routes>
            {/* Admin Routes - No Navbar/Footer */}
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin_warehouse']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/inventory"
              element={
                <ProtectedRoute allowedRoles={['admin_warehouse']}>
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sales"
              element={
                <ProtectedRoute allowedRoles={['admin_warehouse']}>
                  <SalesAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/staff"
              element={
                <ProtectedRoute allowedRoles={['admin_warehouse']}>
                  <StaffManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/stock"
              element={
                <ProtectedRoute allowedRoles={['admin_warehouse']}>
                  <Stock />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/stock-history"
              element={
                <ProtectedRoute allowedRoles={['admin_warehouse']}>
                  <StockHistory />
                </ProtectedRoute>
              }
            />

            {/* Staff Routes - Kasir App UI */}
            <Route
              path="/staff"
              element={
                <ProtectedRoute allowedRoles={['staf']}>
                  <StaffLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<StaffDashboard />} />
              <Route path="report-dimsum" element={<StaffReportDimsum />} />
              <Route path="report-inventory" element={<StaffReportInventory />} />
              <Route path="report-stock" element={<StaffReportStockInventory />} />
              <Route path="transaksi-history" element={<StaffTransaksiHistory />} />
              <Route path="analitik-penjualan" element={<StaffAnalitikPenjualan />} />
            </Route>

            {/* Public Routes - With Navbar/Footer */}
            <Route
              path="*"
              element={
                <>
                  <Navbar />
                  <main className="flex-grow">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/reseller" element={<Reseller />} />
                      <Route path="/testimonials" element={<Testimonials />} />
                      <Route path="/contact" element={<Contact />} />
                    </Routes>
                  </main>
                  <Footer />
                </>
              }
            />
          </Routes>
        </div>
      </Router>
    </CartProvider>
  );
}

export default App;
