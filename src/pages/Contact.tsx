import { Link } from 'react-router-dom';
import { FaPhone, FaWhatsapp, FaMapMarkerAlt, FaTiktok } from 'react-icons/fa';

const Contact = () => {
  const contactInfo = [
    {
      icon: <FaPhone className="text-2xl" />,
      title: "Telepon",
      value: "+62 821-4106-6708",
      description: "Senin - Minggu, 10:00 - 20:00"
    },
    {
      icon: <FaWhatsapp className="text-2xl" />,
      title: "WhatsApp",
      value: "+62 821-4106-6708",
      description: "Senin - Minggu, 10:00 - 20:00"
    },
    {
      icon: <FaTiktok className="text-2xl" />,
      title: "TikTok",
      value: "@dimsumretroserang",
      description: "Follow untuk update promo"
    },
    {
      icon: <FaMapMarkerAlt className="text-2xl" />,
      title: "Alamat",
      value: "Serang Kota",
      description: "Pusat distribusi di Kota Serang"
    }
  ];


  const faqs = [
    {
      question: "Bagaimana cara menjadi reseller?",
      answer: "Anda bisa mendaftar melalui halaman Reseller atau menghubungi kami langsung. Proses pendaftaran cepat dan mudah."
    },
    {
      question: "Apakah ada minimum order pengiriman?",
      answer: "Minimum order untuk customer dengamn value order 50rb. Ongkir gratis jika jarak hanya 1 KM."
    },
    {
      question: "Bagaimana sistem pengiriman?",
      answer: "Kami melayani pengiriman ke seluruh Serang."
    },
    {
      question: "Bagaimana cara pembayaran?",
      answer: "Kami menerima transfer bank BCA dan QRIS. Pembayaran bisa dilakukan sebelum pengiriman."
    }
  ];

  return (
    <div className="py-8 md:py-16 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Hubungi Kami
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Kami siap membantu Anda! Jangan ragu untuk menghubungi kami untuk pertanyaan,
            pemesanan, atau informasi lebih lanjut tentang produk kami.
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {contactInfo.map((info, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-lg text-center hover:shadow-xl transition-shadow">
              <div className="text-primary-600 mb-4 flex justify-center">
                {info.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{info.title}</h3>
              <p className="text-gray-900 font-medium mb-1">{info.value}</p>
              <p className="text-gray-600 text-sm">{info.description}</p>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Pertanyaan yang Sering Diajukan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-200 pb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Siap Memulai Bisnis Dimsum Anda?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Hubungi kami sekarang juga dan dapatkan penawaran spesial untuk reseller baru!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/6282141066708"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center justify-center"
            >
              <FaWhatsapp className="inline mr-2" />
              WhatsApp Sekarang
            </a>
            <Link to="/reseller" className="btn-secondary flex items-center justify-center">
              Daftar Reseller
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;