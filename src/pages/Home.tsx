import { Link } from 'react-router-dom';
import { FaCheckCircle, FaUtensils, FaIndustry } from 'react-icons/fa';

const Home = () => {
  const features = [
    { icon: <FaUtensils className="text-4xl" />, title: '90% Komposisi Daging', description: 'Kualitas Premium dengan Kandungan Daging Asli Maksimal' },
    { icon: <FaCheckCircle className="text-4xl" />, title: '100% Tanpa Bahan Pengawet', description: 'Alami dan Sehat Serta Aman Tanpa Tambahan Pengawet' },
    { icon: <FaIndustry className="text-4xl" />, title: 'Standar Kualitas Resto', description: 'Produk Pabrikan dengan Standar Kualitas Resto, Bukan Homemade' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Outlet Dimsum Terbaik & Termurah di Serang
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100">
              Harga mulai Rp. 3.000/pcs - Fresh From The Oven
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/products" className="btn-secondary bg-white text-primary-600 hover:bg-gray-100 inline-block text-center">
                Lihat Produk
              </Link>
              <Link to="/reseller" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary-600 px-6 py-3 rounded-lg font-semibold transition-colors inline-block text-center">
                Jadi Reseller
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Mengapa Memilih Dimsum Retro?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="text-primary-600 mb-4 flex justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Siap Memulai Bisnis Dimsum Anda?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Bergabunglah dengan ribuan reseller yang telah sukses bersama kami
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/reseller" className="btn-primary">
                Daftar Sekarang
              </Link>
              <Link to="/contact" className="btn-secondary">
                Konsultasi Gratis
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;