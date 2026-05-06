import { FaUsers } from 'react-icons/fa';
import { getStoreStatus } from '../utils/storeStatus';

const Reseller = () => {
  const status = getStoreStatus();
  const programs = [
    {
      icon: <FaUsers className="text-4xl" />,
      title: "Program Reseller",
      description: "Gabung program bersama Dimsum Retro. Kamu akan dibimbing cara berjualan hingga mendapatkan keuntungan yang maksimal.",
      benefits: [
        "Harga Reseller Spesial",
        "Free Saos Belibis",
        "DLL"
      ],
      bgColor: "from-secondary-50 to-secondary-100"
    }
  ];

  return (
    <div className="py-8 md:py-16 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Gabung Bersama Reseller dan Mitra Dimsum Retro
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Peluang Usaha Menguntungkan dengan Produk Dimsum Berkualitas.
          </p>
        </div>

        {/* Programs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {programs.map((program, index) => (
            <div key={index} className={`bg-gradient-to-br ${program.bgColor} p-8 rounded-lg shadow-lg`}>
              <div className="text-primary-600 mb-4 flex justify-center">
                {program.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">{program.title}</h3>
              <p className="text-gray-700 mb-6 text-center">{program.description}</p>

              <div className="space-y-2 mb-6">
                {program.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>

              {!status.isOpen && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium text-center">
                  ⚠️ {status.message}
                </div>
              )}
              <a
                href={`https://wa.me/6282141066708?text=${encodeURIComponent("saya ingin join Reseller")}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-3 rounded-lg font-semibold transition-colors text-center block ${program.title === "Program Reseller"
                  ? "btn-secondary"
                  : "btn-primary"
                  }`}>
                Daftar {program.title}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reseller;