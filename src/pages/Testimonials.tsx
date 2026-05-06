import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaQuoteLeft } from 'react-icons/fa';

const Testimonials = () => {
  const testimonials = [
    {
      name: 'Risa MS',
      date: '2024-11-5',
      rating: 5,
      text: 'enakk dimsumnya next repeat order lagi!',
      location: 'Serang',
      type: 'Customer'
    },
    {
      name: 'Srii',
      date: '2024-10-17',
      rating: 5,
      text: 'enak banget, saosnya juga enak terimakasih banyak yaa',
      location: 'Serang',
      type: 'Customer'
    },
    {
      name: 'M***** M***** R*****',
      date: '2024-08-14',
      rating: 5,
      text: 'gapernah gagal apalagi chili oilnya. selalu repeat order karna chili oilnya best bgtttt!!! jangan sampe berubah rasa ya chili oilnya',
      location: 'Serang',
      type: 'Customer'
    },
    {
      name: 'Bayu Wirajaya',
      date: '2024-11-01',
      rating: 5,
      text: 'Mantapp! Sudah 6 bulan jadi reseller, omset semakin hari semakin meningkat. Support dari tim sangat membantu.',
      location: 'Yogyakarta',
      type: 'Reseller'
    },
    {
      name: 'F*****',
      date: '2024-06-26',
      rating: 5,
      text: 'bener bener enak poll!! apa lagi chili oilnya best!',
      location: 'Serang',
      type: 'Customer'
    },
    {
      name: 'Rudi Hermawan',
      date: '2024-10-15',
      rating: 5,
      text: 'Meskipun lebih mahal dari yg lain harganya, tapi emang kualitas produknya standar resto, full dagingnya',
      location: 'Serang',
      type: 'Reseller'
    },
    {
      name: 'Eva',
      date: '2024-10-05',
      rating: 5,
      text: 'Mantap chili oil nya',
      location: 'Serang',
      type: 'Customer'
    },
    {
      name: 'Firda Hidayatika',
      date: '2024-04-04',
      rating: 5,
      text: 'enak banget, ukurannya juga pas woyy. real testi no fake fake endorse endorse',
      location: 'Serang',
      type: 'Customer'
    }
  ];

  const types = ['Semua', 'Customer', 'Reseller'];
  const [selectedType, setSelectedType] = useState('Semua');

  const filteredTestimonials = selectedType === 'Semua'
    ? testimonials
    : testimonials.filter(testimonial => testimonial.type === selectedType);

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <FaStar key={i} className={`text-lg ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`} />
    ));
  };

  return (
    <div className="py-8 md:py-16 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Apa Kata Mereka?
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Ribuan pelanggan puas telah merasakan kualitas terbaik dari Dimsum Retro.
          </p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {types.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-6 py-2 rounded-full font-semibold transition-colors ${selectedType === type
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-primary-100 border border-gray-300'
                }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {filteredTestimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex">
                  {renderStars(testimonial.rating)}
                </div>
                <span className="text-xs bg-primary-100 text-primary-600 px-2 py-1 rounded-full font-semibold">
                  {testimonial.type}
                </span>
              </div>

              <div className="relative mb-4">
                <FaQuoteLeft className="text-primary-200 text-2xl absolute -top-2 -left-2" />
                <p className="text-gray-700 italic pl-6">"{testimonial.text}"</p>
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold text-gray-900">{testimonial.name}</p>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{testimonial.location}</span>
                  <span>{testimonial.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Kami Bangga Dengan Angka Ini
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">5,000+</div>
              <p className="text-gray-600">Pelanggan Puas</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">10+</div>
              <p className="text-gray-600">Reseller Aktif</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">4.9/5</div>
              <p className="text-gray-600">Rating Rata-rata</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Siap Bergabung dengan Mereka?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Jadilah bagian dari kesuksesan kami dan dapatkan pengalaman terbaik bersama Dimsum Retro
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/reseller" className="btn-primary">
              Daftar Jadi Reseller
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;