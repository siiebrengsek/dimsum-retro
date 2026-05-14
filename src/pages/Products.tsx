import { useState } from 'react';
import { FaUtensils, FaShoppingCart } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getStoreStatus } from '../utils/storeStatus';

// Product images from local assets folder
const dimsumImages = {
  dimsumSingle: '/products/dimsum-single.jpg',
  dimsumCouple: '/products/dimsum-couple.jpg',
  dimsumFamily: '/products/dimsum-family.jpg',
  dimsumBrotherhood: '/products/dimsum-brotherhood.jpg',
  dimsumMentai4pcs: '/products/dimsum-mentai-4pcs.jpg',
  dimsumMentai6pcs: '/products/dimsum-mentai-6pcs.jpg',
  dimsumMentai16pcs: '/products/dimsum-mentai-16pcs.jpg',
  dimsumBakar4pcs: '/products/dimsum-bakar-4pcs.jpg',
  dimsumMentaiKejuLumer: '/products/dimsum-mentai-keju-lumer.jpg',
  dimsumMentaiMozarella: '/products/dimsum-mentai-mozarella.jpg',
  dimsumMozarella: '/products/dimsum-mozarella.jpg',
  chiliOil: '/products/chili-oil.jpg',
  sausBelibis: '/products/saus-belibis.jpg',
  dimsumUcapan: '/products/dimsum-ucapan.jpg',
};

type Product = {
  name: string
  category: string
  description: string
  badgeRight?: string
  badgeLeft?: string
  price: string
  image: string
}

const Products = () => {
  const { addToCart } = useCart();
  const status = getStoreStatus();
  const products: Product[] = [
    { name: 'Dimsum Single', category: 'Original', description: 'Dimsum kukus isi 5pcs dengan toping mix', badgeRight: '', price: 'Rp. 15.000', image: dimsumImages.dimsumSingle },
    { name: 'Dimsum Couple', category: 'Original', description: 'Dimsum kukus isi 12pcs dengan toping mix', badgeRight: 'Best Seller', price: 'Rp. 36.000', image: dimsumImages.dimsumCouple },
    { name: 'Dimsum Family', category: 'Original', description: 'Dimsum kukus isi 20pcs dengan toping mix', badgeRight: 'Best Seller', price: 'Rp. 36.000', image: dimsumImages.dimsumFamily },
    { name: 'Dimsum Brotherhood', category: 'Original', description: 'Dimsum kukus isi 24pcs dengan toping mix', badgeRight: 'Best Seller', price: 'Rp. 72.000', image: dimsumImages.dimsumBrotherhood },
    { name: 'Dimsum Mentai 4pcs', category: 'Dimsum Mentai', description: 'Dimsum Kukus dengan saus mentai', badgeRight: 'Best Seller', badgeLeft: 'Free Chili Oil', price: 'Rp. 20.0000', image: dimsumImages.dimsumMentai4pcs },
    { name: 'Dimsum Mentai 6pcs', category: 'Dimsum Mentai', description: 'Dimsum Kukus dengan saus mentai', badgeRight: 'Best Seller', badgeLeft: 'Free Chili Oil', price: 'Rp. 30.000', image: dimsumImages.dimsumMentai6pcs },
    { name: 'Dimsum Mentai 16pcs', category: 'Dimsum Mentai', description: 'Dimsum Kukus dengan saus mentai', badgeRight: 'Best Seller', badgeLeft: 'Free Chili Oil', price: 'Rp. 80.000', image: dimsumImages.dimsumMentai16pcs },
    { name: 'Dimsum Bakar 4pcs', category: 'New Arival', description: 'Dimsum kukus yang di bakar dengan saus BBQ', badgeRight: 'New', badgeLeft: 'Free Chili Oil', price: 'Rp. 20.000', image: dimsumImages.dimsumBakar4pcs },
    { name: 'Dimsum Mentai Keju Lumer', category: 'New Arival', description: 'Dimsum mentai dengan keju Lumer diatasnya', badgeRight: 'Best Seller', price: 'Rp. 25.000', image: dimsumImages.dimsumMentaiKejuLumer },
    { name: 'Dimsum Mentai Mozarella', category: 'New Arival', description: 'Dimsum mentai dengan mozarella diatasnya', badgeRight: 'New Arival', price: 'Rp. 25.000', image: dimsumImages.dimsumMentaiMozarella },
    { name: 'Dimsum Mozarella', category: 'New Arival', description: 'Dimsum kukus dengan mozarella', badgeRight: 'Best Seller', price: 'Rp. 15.000', image: dimsumImages.dimsumMozarella },
    { name: 'Chili Oil', category: 'Toping', description: 'Sambal pedas khas dimsum', badgeRight: 'Best Seller', price: 'Rp. 3.000', image: dimsumImages.chiliOil },
    { name: 'Saus Belibis 1KG', category: 'Toping', description: 'Saus Sambal untuk cemilan', badgeRight: 'New', price: 'Rp. 21.000', image: dimsumImages.sausBelibis },
    { name: 'Dimsum Mentai Ucapan', category: 'New Arival', description: 'Dimsum dengan saus mentai untuk acara', badgeRight: 'New', price: 'Rp. 110.000', image: dimsumImages.dimsumUcapan },
  ];

  const categories = ['Semua', 'Original', 'Dimsum Mentai', 'New Arival', 'Toping'];
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'Semua');

  const filteredProducts = selectedCategory === 'Semua'
    ? products
    : products.filter(product => product.category === selectedCategory);

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    addToCart({
      name: product.name,
      price: product.price,
      image: product.image,
      description: product.description
    });

    const btn = e.currentTarget as HTMLElement;
    const cartIcon = document.getElementById('cart-icon');
    if (!cartIcon) return;

    const btnRect = btn.getBoundingClientRect();
    const cartRect = cartIcon.getBoundingClientRect();

    const flyItem = document.createElement('div');
    flyItem.className = 'fly-item';
    flyItem.style.backgroundImage = `url(${product.image})`;
    flyItem.style.left = `${btnRect.left + btnRect.width / 2}px`;
    flyItem.style.top = `${btnRect.top + btnRect.height / 2}px`;

    const diffX = cartRect.left - btnRect.left;
    const diffY = cartRect.top - btnRect.top;

    flyItem.style.setProperty('--target-x', `${diffX}px`);
    flyItem.style.setProperty('--target-y', `${diffY}px`);

    document.body.appendChild(flyItem);

    setTimeout(() => {
      flyItem.remove();
      cartIcon.classList.add('cart-pulse');
      setTimeout(() => cartIcon.classList.remove('cart-pulse'), 400);
    }, 1000);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="py-8 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
              Pilihan Dimsum Premium Terlaris Kami
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              100% Terbuat dari Bahan Terbaik!
              Nikmati berbagai pilihan dimsum lezat dengan kualitas terjamin.
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="sticky top-[88px] z-10 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full font-semibold transition-colors ${selectedCategory === category
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-primary-100 border border-gray-300'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.name} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="relative">
                <div className="aspect-square bg-white flex items-center justify-center overflow-hidden group">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="eager"
                    />
                  ) : (
                    <FaUtensils className="text-6xl text-primary-600" />
                  )}
                </div>
                {product.badgeRight && (
                  <span className="absolute top-4 right-4 bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {product.badgeRight}
                  </span>
                )}
                {product.badgeLeft && (
                  <span className="absolute top-4 left-4 bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {product.badgeLeft}
                  </span>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{product.description}</p>
                <p className="text-2xl font-bold text-primary-600 mb-4">{product.price}</p>
                <div className="space-y-2">
                  <button
                    onClick={(e) => handleAddToCart(e, product)}
                    className="w-full btn-primary text-sm flex items-center justify-center gap-2"
                  >
                    <FaShoppingCart className="text-xs" />
                    Tambah ke Keranjang
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!status.isOpen && (
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center font-medium shadow-sm">
            ⚠️ {status.message}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ingin Pesan dalam Jumlah Besar?
            </h2>
            <p className="text-gray-600 mb-6">
              Kami melayani pesanan partai besar untuk restoran, hotel, dan acara khusus.
              Dapatkan harga spesial untuk pembelian dalam jumlah banyak!
            </p>
            <a
              href="https://wa.me/6282141066708"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-block"
            >
              Hubungi Admin
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;