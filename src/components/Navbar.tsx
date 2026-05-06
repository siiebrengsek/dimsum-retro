import { useState } from 'react';
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

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
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
              className="text-gray-700 hover:text-primary-600 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className={`block px-3 py-2 transition-colors ${isActive('/') ? 'text-primary-600 font-semibold' : 'text-gray-700 hover:text-primary-600'
                }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Beranda
            </Link>
            <Link
              to="/products"
              className={`block px-3 py-2 transition-colors ${isActive('/products') ? 'text-primary-600 font-semibold' : 'text-gray-700 hover:text-primary-600'
                }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Produk
            </Link>
            <Link
              to="/reseller"
              className={`block px-3 py-2 transition-colors ${isActive('/reseller') ? 'text-primary-600 font-semibold' : 'text-gray-700 hover:text-primary-600'
                }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Reseller
            </Link>
            <Link
              to="/testimonials"
              className={`block px-3 py-2 transition-colors ${isActive('/testimonials') ? 'text-primary-600 font-semibold' : 'text-gray-700 hover:text-primary-600'
                }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Testimoni
            </Link>
            <Link
              to="/contact"
              className={`block px-3 py-2 transition-colors ${isActive('/contact') ? 'text-primary-600 font-semibold' : 'text-gray-700 hover:text-primary-600'
                }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Kontak
            </Link>
            <Link
              to="/cart"
              className={`block px-3 py-2 transition-colors flex items-center gap-2 ${isActive('/cart') ? 'text-primary-600 font-semibold' : 'text-gray-700 hover:text-primary-600'
                }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaShoppingCart />
              Keranjang
              {totalItems > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                  {totalItems}
                </span>
              )}
            </Link>
            <a
              href="https://wa.me/6282141066708"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full btn-primary text-center mt-4"
              onClick={() => setMobileMenuOpen(false)}
            >
              Hubungi Kami
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;