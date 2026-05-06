import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaTrash, FaMinus, FaPlus, FaWhatsapp } from 'react-icons/fa';
import { useCart } from '../context/CartContext';
import { getStoreStatus } from '../utils/storeStatus';

const Cart = () => {
  const { items, removeFromCart, updateQuantity, getTotalItems, getTotalPrice, clearCart } = useCart();
  const [customerName, setCustomerName] = useState('');
  const status = getStoreStatus();

  const handleCheckout = () => {
    if (!customerName.trim()) {
      alert('Nama wajib diisi!');
      return;
    }

    const phoneNumber = '6282141066708'; // Nomor WhatsApp Dimsum Retro
    const message = formatOrderMessage();
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const formatOrderMessage = () => {
    if (items.length === 0) return '';

    let message = '*PESANAN DIMSUM RETRO*\n\n';
    message += '*Detail Pesanan:*\n';

    items.forEach((item, index) => {
      message += `${index + 1}. *${item.name}*\n`;
      message += `   Harga: ${item.price} x ${item.quantity} = ${item.price.replace('Rp.', 'Rp.').replace(/\./g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}\n`;
      // message += `   📝 ${item.description}\n\n`;
    });

    message += `Total: ${getTotalPrice()}\n\n`;
    message += '*Data Pemesan:*\n';
    message += `*Nama: ${customerName}\n*`;
    // message += 'No. HP: \n';
    // message += 'Alamat: \n\n';
    // message += '🚚 *Info Pengiriman:*\n';
    message = message.trim();

    return message;
  };

  if (items.length === 0) {
    return (
      <div className="py-16 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <FaShoppingCart className="text-6xl text-gray-300 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Keranjang Belanja Kosong</h1>
            <p className="text-gray-600 mb-8">Anda belum menambahkan produk apa pun ke keranjang</p>
            <Link
              to="/products"
              className="btn-primary inline-flex items-center gap-2"
            >
              <FaShoppingCart />
              Belanja Sekarang
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Keranjang Belanja</h1>
          <p className="text-gray-600">Anda memiliki {getTotalItems()} item di keranjang</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Detail Pesanan</h2>
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Hapus Semua
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                        <p className="text-sm text-gray-500 mb-2">{item.description}</p>
                        <p className="font-semibold text-primary-600 mb-2">{item.price}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                            >
                              <FaMinus className="text-xs" />
                            </button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                            >
                              <FaPlus className="text-xs" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ringkasan Pesanan</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Masukkan nama lengkap Anda"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({getTotalItems()} item)</span>
                    <span>{getTotalPrice()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Ongkos Kirim</span>
                    <span>Gratis 1 KM Pertama</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-primary-600">{getTotalPrice()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {!status.isOpen && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                    ⚠️ {status.message}
                  </div>
                )}
                <button
                  onClick={handleCheckout}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FaWhatsapp />
                  Checkout via WhatsApp
                </button>
                <Link
                  to="/products"
                  className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-center block"
                >
                  Lanjut Belanja
                </Link>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Catatan:</strong> Pesanan Anda akan dikonfirmasi melalui WhatsApp setelah checkout.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
