import { useState, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaShoppingCart, FaClock } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { getStoreStatus } from '../utils/storeStatus';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { getTotalItems } = useCart();
  const totalItems = getTotalItems();
  const status = getStoreStatus();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const delta = touchEndX.current - touchStartX.current;
    if (Math.abs(delta) > 60) {
      if (delta > 0 && !mobileMenuOpen) {
        setMobileMenuOpen(true);
      } else if (delta < 0 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    }
  }, [mobileMenuOpen]);

  return (
    <nav
      className="bg-white shadow-lg sticky top-0 z-50"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar status */}
      <div className={`${status.color} text-white py-1 transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center items-center gap-2 text-xs font-bold tracking-wider">
          <FaClock className="text-sm" />
          OUTLET IS {status.text} (10:00 - 21:00)
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <img src="/logo.png" alt="Dimsum Retro" className="h-10 w-auto" />
              <span className="ml-2 text-xl font-bold text-primary-600 hidden sm:block">DIMSUM RETRO</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`transition-colors ${isActive('/') ? 'text-primary-600 font-semibold' : 'text-gray-700 hover:text-primary-600'
                }`}
            >
              Beranda
            </Link>
            <Link
              to="/products"
              className={`transition-colors ${isActive('/products') ? 'text-primary-600 font-semibold' : 'text-gray-700 hover:text-primary-600'
                }`}
            >
              Produk
            </Link>
            <Link
              to="/reseller"
              className={`transition-colors ${isActive('/reseller') ? 'text-primary-600 font-semibold' : 'text-gray-700 hover:text-primary-600'
                }`}
            >
              Reseller
            </Link>
            <Link
              to="/testimonials"
              className={`transition-colors ${isActive('/testimonials') ? 'text-primary-600 font-semibold' : 'text-gray-700 hover:text-primary-600'
                }`}
            >
              Testimoni
            </Link>
            <Link
              to="/contact"
              className={`transition-colors ${isActive('/contact') ? 'text-primary-600 font-semibold' : 'text-gray-700 hover:text-primary-600'
                }`}
            >
              Kontak
            </Link>
            <Link id="cart-icon" to="/cart" className="relative p-2 text-gray-700 hover:text-primary-600 transition-colors">
              <FaShoppingCart className="text-xl" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
            <Link
              to="/login"
              className="text-gray-700 hover:text-primary-600 font-semibold transition-colors text-sm"
            >
              Login Staf
            </Link>
            <a
              href="https://wa.me/6282141066708"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Hubungi Kami
            </a>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-primary-600 focus:outline-none p-2"
              aria-label="Menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-lg font-bold text-primary-600">DIMSUM RETRO</span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="text-gray-500 hover:text-gray-700 p-1"
            aria-label="Tutup menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-4 pt-4 pb-8 space-y-1 overflow-y-auto h-[calc(100%-64px)]">
          <Link
            to="/"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/') ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Beranda
          </Link>
          <Link
            to="/products"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/products') ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Produk
          </Link>
          <Link
            to="/reseller"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/reseller') ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Reseller
          </Link>
          <Link
            to="/testimonials"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/testimonials') ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Testimoni
          </Link>
          <Link
            to="/contact"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/contact') ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Kontak
          </Link>
          <hr className="my-3 border-gray-200" />
          <Link
            to="/cart"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/cart') ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <FaShoppingCart className="text-lg" />
            Keranjang
            {totalItems > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-auto">
                {totalItems}
              </span>
            )}
          </Link>
          <Link
            to="/login"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              isActive('/login') ? 'bg-primary-50 text-primary-600 font-semibold' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Login Staf
          </Link>
          <div className="pt-4">
            <a
              href="https://wa.me/6282141066708"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full btn-primary text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Hubungi Kami
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;