import { Link } from 'react-router-dom';
import { FaInstagram, FaWhatsapp, FaPhone, FaMapMarkerAlt, FaTiktok } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer id="contact" className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4 text-primary-400">Dimsum Retro</h3>
            <p className="text-gray-400">
              Outlet Dimsum Terbaik & Termurah berdiri sejak 2020 di Kota Serang
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Informasi</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/reseller" className="text-gray-400 hover:text-white transition-colors">
                  Program Reseller
                </Link>
              </li>
              <li>
                <Link to="/reseller" className="text-gray-400 hover:text-white transition-colors">
                  Daftar Jadi Reseller
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Produk</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-gray-400 hover:text-white transition-colors">
                  Dimsum Kukus
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-400 hover:text-white transition-colors">
                  Dimsum Mentai
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-400 hover:text-white transition-colors">
                  Chili Oil
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Kontak</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <FaPhone className="text-primary-400" />
                <span className="text-gray-400">+62 821-4106-6708</span>
              </div>
              <div className="flex items-center space-x-2">
                <FaWhatsapp className="text-primary-400" />
                <span className="text-gray-400">+62 821-4106-6708</span>
              </div>
              <div className="flex items-center space-x-2">
                <FaMapMarkerAlt className="text-primary-400" />
                <span className="text-gray-400">Kota Serang, Banten</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="https://www.tiktok.com/@dimsumretroserang" className="text-gray-400 hover:text-white transition-colors">
                <FaTiktok className="text-xl" />
              </a>
              <a href="https://www.instagram.com/dimsumretro.official/" className="text-gray-400 hover:text-white transition-colors">
                <FaInstagram className="text-xl" />
              </a>
              <a href="https://wa.me/6282141066708" className="text-gray-400 hover:text-white transition-colors">
                <FaWhatsapp className="text-xl" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;