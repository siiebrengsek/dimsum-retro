import { useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { useCart } from '../../context/CartContext';
import { saveTransaction } from '../../utils/transactions';
import { supabase } from '../../lib/supabase';
import { addToQueue } from '../../utils/offlineQueue';
import { AlertModal } from '../../components/AlertModal';
import { getTodayDate } from '../../utils/dateUtils';

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
  tehPoci: '/products/teh-poci.jpg',
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

const products: Product[] = [
  { name: 'Dimsum  1pcs', category: 'Original', description: 'Dimsum kukus isi 5pcs dengan toping mix', badgeRight: '', price: 'Rp. 3.000', image: dimsumImages.dimsumSingle },
  { name: 'Dimsum  3pcs', category: 'Original', description: 'Dimsum kukus isi 5pcs dengan toping mix', badgeRight: '', price: 'Rp. 9.000', image: dimsumImages.dimsumSingle },
  { name: 'Dimsum  5pcs', category: 'Original', description: 'Dimsum kukus isi 5pcs dengan toping mix', badgeRight: '', price: 'Rp. 15.000', image: dimsumImages.dimsumSingle },
  { name: 'Dimsum Couple 12pcs', category: 'Original', description: 'Dimsum kukus isi 12pcs dengan toping mix', badgeRight: 'Best Seller', price: 'Rp. 36.000', image: dimsumImages.dimsumCouple },
  { name: 'Dimsum Family', category: 'Original', description: 'Dimsum kukus isi 20pcs dengan toping mix', badgeRight: 'Best Seller', price: 'Rp. 36.000', image: dimsumImages.dimsumFamily },
  { name: 'Dimsum Brotherhood', category: 'Original', description: 'Dimsum kukus isi 24pcs dengan toping mix', badgeRight: 'Best Seller', price: 'Rp. 72.000', image: dimsumImages.dimsumBrotherhood },
  { name: 'Dimsum Mentai 4pcs', category: 'Dimsum Mentai', description: 'Dimsum Kukus dengan saus mentai', badgeRight: 'Best Seller', badgeLeft: 'Free Chili Oil', price: 'Rp. 20.000', image: dimsumImages.dimsumMentai4pcs },
  { name: 'Dimsum Mentai 6pcs', category: 'Dimsum Mentai', description: 'Dimsum Kukus dengan saus mentai', badgeRight: 'Best Seller', badgeLeft: 'Free Chili Oil', price: 'Rp. 30.000', image: dimsumImages.dimsumMentai6pcs },
  { name: 'Dimsum Mentai 16pcs', category: 'Dimsum Mentai', description: 'Dimsum Kukus dengan saus mentai', badgeRight: 'Best Seller', badgeLeft: 'Free Chili Oil', price: 'Rp. 80.000', image: dimsumImages.dimsumMentai16pcs },
  { name: 'Dimsum Bakar 4pcs', category: 'New Arival', description: 'Dimsum kukus yang di bakar dengan saus BBQ', badgeRight: 'New', badgeLeft: 'Free Chili Oil', price: 'Rp. 20.000', image: dimsumImages.dimsumBakar4pcs },
  { name: 'Dimsum Mentai Keju Lumer 4pcs', category: 'New Arival', description: 'Dimsum mentai dengan keju Lumer diatasnya', badgeRight: 'Best Seller', price: 'Rp. 25.000', image: dimsumImages.dimsumMentaiKejuLumer },
  { name: 'Dimsum Mentai Keju Lumer 6pcs', category: 'New Arival', description: 'Dimsum mentai dengan keju Lumer diatasnya', badgeRight: 'Best Seller', price: 'Rp. 38.000', image: dimsumImages.dimsumMentaiKejuLumer },
  { name: 'Dimsum Mentai Mozarella 4pcs', category: 'New Arival', description: 'Dimsum mentai dengan mozarella diatasnya', badgeRight: 'New Arival', price: 'Rp. 25.000', image: dimsumImages.dimsumMentaiMozarella },
  { name: 'Dimsum Mentai Mozarella 6pcs', category: 'New Arival', description: 'Dimsum mentai dengan mozarella diatasnya', badgeRight: 'New Arival', price: 'Rp. 38.000', image: dimsumImages.dimsumMentaiMozarella },
  { name: 'Dimsum Mozarella 4pcs', category: 'New Arival', description: 'Dimsum kukus dengan mozarella', badgeRight: 'Best Seller', price: 'Rp. 15.000', image: dimsumImages.dimsumMozarella },
  { name: 'Dimsum Mozarella 5pcs', category: 'New Arival', description: 'Dimsum kukus dengan mozarella', badgeRight: 'Best Seller', price: 'Rp. 18.000', image: dimsumImages.dimsumMozarella },
  { name: 'Dimsum Mozarella 8pcs', category: 'New Arival', description: 'Dimsum kukus dengan mozarella', badgeRight: 'Best Seller', price: 'Rp. 30.000', image: dimsumImages.dimsumMozarella },
  { name: 'Chili Oil', category: 'Toping', description: 'Sambal pedas khas dimsum', badgeRight: 'Best Seller', price: 'Rp. 3.000', image: dimsumImages.chiliOil },
  { name: 'Saus Belibis 1KG', category: 'Toping', description: 'Saus Sambal untuk cemilan', badgeRight: 'New', price: 'Rp. 21.000', image: dimsumImages.sausBelibis },
  { name: 'Dimsum Mentai Ucapan', category: 'New Arival', description: 'Dimsum dengan saus mentai untuk acara', badgeRight: 'New', price: 'Rp. 110.000', image: dimsumImages.dimsumUcapan },
  { name: 'Teh Poci', category: 'Es', description: 'Es teh original tanpa bahan pengawet', badgeRight: 'Fresh', price: 'Rp. 4.000', image: dimsumImages.tehPoci },
  { name: 'Teh Poci Promo', category: 'Es', description: 'Es teh original tanpa bahan pengawet', badgeRight: 'Fresh', price: 'Rp. 10.000', image: dimsumImages.tehPoci },
];

const categories = ['Semua', 'Original', 'Dimsum Mentai', 'New Arival', 'Toping', 'Es'];

type PaymentMethod = 'tunai' | 'gofood' | 'grab' | 'shoppe' | 'qris';

const paymentIcons: Record<PaymentMethod, string> = {
  tunai: '💵',
  gofood: '🛵',
  grab: '🚗',
  shoppe: '🛍️',
  qris: '📱',
};

const getNumericPrice = (price: string) => parseInt(price.replace(/[^\d]/g, ''));

export const Dashboard = () => {
  const user = useAuthStore((s) => s.user);
  const { items, addToCart, removeFromCart, updateQuantity, clearCart, getTotalItems, getTotalPrice } = useCart();

  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [cashAmount, setCashAmount] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [toast, setToast] = useState('');
  const [alert, setAlert] = useState<{ type: 'info' | 'error' | 'success'; title: string; message: string } | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1500);
  };

  const filteredProducts = selectedCategory === 'Semua'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const totalPriceNumeric = items.reduce((sum, item) => {
    return sum + getNumericPrice(item.price) * item.quantity;
  }, 0);

  const cashNumeric = parseInt(cashAmount.replace(/[^\d]/g, '')) || 0;
  const changeNumeric = cashNumeric - totalPriceNumeric;
  const isValidCash = cashNumeric >= totalPriceNumeric;

  const handleBayar = async () => {
    if (items.length === 0) {
      setAlert({ type: 'info', title: 'Keranjang Kosong', message: 'Belum ada item di keranjang.' });
      return;
    }
    if (paymentMethod === 'tunai' && !isValidCash) {
      setAlert({ type: 'info', title: 'Tunai Kurang', message: 'Jumlah tunai tidak mencukupi!' });
      return;
    }

    const transactionItems = items.map((item) => ({
      productName: item.name,
      price: getNumericPrice(item.price),
      quantity: item.quantity,
    }));

    saveTransaction({
      items: transactionItems,
      total: totalPriceNumeric,
      paymentMethod,
    });

    const salePayload = {
      payment_method: paymentMethod,
      staff_id: user?.id,
      items_json: transactionItems,
      amount: totalPriceNumeric,
      transaction_date: getTodayDate(),
      product_name: transactionItems.map(i => i.productName).join(', '),
    };
    try {
      const { error } = await supabase.from('sales').insert(salePayload);
      if (error) throw error;
    } catch {
      addToQueue('sales', 'insert', salePayload);
    }

    setShowCart(false);
    setShowReceipt(true);
  };

  const handleSelesai = () => {
    setShowReceipt(false);
    clearCart();
    setCashAmount('');
  };

  const formatPrice = (val: number) => `Rp. ${val.toLocaleString('id-ID')}`;

  if (showReceipt) {
    return (
      <><div className="p-4 sm:p-6 pb-24 max-w-2xl mx-auto h-full flex items-start sm:items-center justify-center pt-8 sm:pt-0">
        <div className="bg-[#1A1A2E] rounded-2xl p-5 sm:p-6 w-full">
          <div className="text-center mb-5 sm:mb-6">
            <div className="text-4xl sm:text-5xl mb-3">🧾</div>
            <h2 className="text-white text-lg sm:text-xl font-black">Struk Pembayaran</h2>
            <p className="text-[#888] text-xs sm:text-sm">Dimsum Retro</p>
          </div>

          <div className="border-t border-b border-[#303050] py-3 sm:py-4 mb-4 space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-xs sm:text-sm">
                <span className="text-white">
                  {item.name} <span className="text-[#888]">x{item.quantity}</span>
                </span>
                <span className="text-[#F5A623] font-semibold">
                  {formatPrice(getNumericPrice(item.price) * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-sm sm:text-base mb-2">
            <span className="text-[#888]">Total</span>
            <span className="text-white font-bold">{getTotalPrice()}</span>
          </div>

          <div className="flex justify-between text-xs sm:text-sm mb-2">
            <span className="text-[#888]">Pembayaran</span>
            <span className="text-white">{paymentIcons[paymentMethod]} {paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</span>
          </div>

          {paymentMethod === 'tunai' && (
            <div className="flex justify-between text-xs sm:text-sm mb-4">
              <span className="text-[#888]">Kembali</span>
              <span className="text-green-400 font-semibold">{formatPrice(changeNumeric)}</span>
            </div>
          )}

          <button
            onClick={handleSelesai}
            className="w-full bg-[#F5A623] text-white font-bold py-3 sm:py-3.5 rounded-xl mt-4 hover:bg-orange-600 transition text-sm sm:text-base"
          >
            Selesai & Cetak Baru
          </button>
        </div>
      </div>
      <AlertModal
        open={!!alert}
        type={alert?.type}
        title={alert?.title || ''}
        message={alert?.message || ''}
        onClose={() => setAlert(null)}
      /></>
    );
  }

  return (
    <>
      <div className="flex flex-col lg:flex-row h-full relative">
        {/* Toast notification */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#F5A623] text-white font-bold text-sm px-5 py-3 rounded-xl shadow-xl animate-bounce">
            ✅ {toast}
          </div>
        )}
        {/* Left: Products */}
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto pb-24 lg:pb-6">
        <div className="sticky top-0 z-10 bg-[#0D0D0D] pt-2 pb-3 mb-3 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition min-h-[40px] ${
                selectedCategory === cat
                  ? 'bg-[#F5A623] text-white'
                  : 'bg-[#1A1A2E] text-[#888] hover:bg-[#252540]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map((product) => (
            <div key={product.name} className="bg-[#1A1A2E] rounded-xl overflow-hidden">
              <div className="aspect-square bg-[#252540] relative">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🍜</div>
                )}
                {product.badgeRight && (
                  <span className="absolute top-2 right-2 bg-[#F5A623] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{product.badgeRight}</span>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-white font-bold text-sm mb-0.5 truncate">{product.name}</h3>
                <p className="text-[#F5A623] font-bold text-sm mb-2">{product.price}</p>
                <button
                  onClick={() => {
                    addToCart({ name: product.name, price: product.price, image: product.image, description: product.description });
                    showToast(`${product.name} +1`);
                  }}
                  className="w-full bg-[#F5A623] text-white text-xs font-bold py-2.5 rounded-lg hover:bg-orange-600 transition min-h-[36px]"
                >
                  + Keranjang
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Right Cart Panel */}
      <div className="hidden lg:flex w-96 bg-[#111118] border-l border-[#1A1A2E] flex-col">
        <CartPanel
          items={items}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          cashAmount={cashAmount}
          setCashAmount={setCashAmount}
          cashNumeric={cashNumeric}
          totalPriceNumeric={totalPriceNumeric}
          isValidCash={isValidCash}
          changeNumeric={changeNumeric}
          getTotalPrice={getTotalPrice}
          updateQuantity={updateQuantity}
          removeFromCart={removeFromCart}
          clearCart={clearCart}
          handleBayar={handleBayar}
          formatPrice={formatPrice}
        />
      </div>

      {/* Mobile: Cart FAB + Bottom Drawer */}
      <div className="lg:hidden">
        {/* Floating cart button */}
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-5 right-5 z-30 bg-[#F5A623] text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-2xl"
        >
          🛒
          {getTotalItems() > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#FF6B6B] text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {getTotalItems()}
            </span>
          )}
        </button>

        {/* Bottom drawer overlay */}
        {showCart && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowCart(false)} />
        )}

        {/* Bottom drawer */}
        <div className={`fixed bottom-0 left-0 right-0 z-50 bg-[#111118] rounded-t-2xl transition-transform duration-300 max-h-[85vh] flex flex-col ${showCart ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center justify-between p-4 border-b border-[#1A1A2E]">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
              🛒 Keranjang <span className="text-[#888] text-sm font-normal">({getTotalItems()} item)</span>
            </h2>
            <button onClick={() => setShowCart(false)} className="text-[#888] text-xl p-1">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <CartPanel
              items={items}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              cashAmount={cashAmount}
              setCashAmount={setCashAmount}
              cashNumeric={cashNumeric}
              totalPriceNumeric={totalPriceNumeric}
              isValidCash={isValidCash}
              changeNumeric={changeNumeric}
              getTotalPrice={getTotalPrice}
              updateQuantity={updateQuantity}
              removeFromCart={removeFromCart}
              clearCart={clearCart}
              handleBayar={handleBayar}
              formatPrice={formatPrice}
            />
          </div>
        </div>
      </div>
    </div>

    <AlertModal
      open={!!alert}
      type={alert?.type}
      title={alert?.title || ''}
      message={alert?.message || ''}
      onClose={() => setAlert(null)}
    /></>
  );
};

const CartPanel = ({
  items, paymentMethod, setPaymentMethod, cashAmount, setCashAmount,
  cashNumeric, totalPriceNumeric, isValidCash, changeNumeric,
  getTotalPrice, updateQuantity, removeFromCart, clearCart, handleBayar, formatPrice
}: {
  items: any[]; paymentMethod: PaymentMethod; setPaymentMethod: (m: PaymentMethod) => void;
  cashAmount: string; setCashAmount: (v: string) => void;
  cashNumeric: number; totalPriceNumeric: number; isValidCash: boolean; changeNumeric: number;
  getTotalPrice: () => string;
  updateQuantity: (id: string, q: number) => void; removeFromCart: (id: string) => void;
  clearCart: () => void; handleBayar: () => void; formatPrice: (v: number) => string;
}) => (
  <>
    {items.length === 0 ? (
      <p className="text-[#888] text-sm text-center py-8">Belum ada item. Pilih produk di samping.</p>
    ) : (
      items.map((item) => (
        <div key={item.id} className="bg-[#1A1A2E] rounded-xl p-3 flex items-center gap-3">
          <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{item.name}</p>
            <p className="text-[#F5A623] text-xs font-bold">{item.price}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 rounded-full bg-[#252540] text-white text-sm hover:bg-[#303050] min-w-[32px] min-h-[32px] flex items-center justify-center">-</button>
            <span className="text-white text-sm font-bold w-5 text-center">{item.quantity}</span>
            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 rounded-full bg-[#252540] text-white text-sm hover:bg-[#303050] min-w-[32px] min-h-[32px] flex items-center justify-center">+</button>
          </div>
          <button onClick={() => removeFromCart(item.id)} className="text-[#FF6B6B] text-lg min-w-[28px] min-h-[28px] flex items-center justify-center">✕</button>
        </div>
      ))
    )}

    <div className="pt-3 space-y-3">
      <div>
        <p className="text-[#888] text-xs mb-2">Metode Pembayaran</p>
        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(paymentIcons) as PaymentMethod[]).map((method) => (
            <button
              key={method}
              onClick={() => setPaymentMethod(method)}
              className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] sm:text-xs font-semibold transition min-h-[48px] ${
                paymentMethod === method
                  ? 'bg-[#F5A623] text-white'
                  : 'bg-[#1A1A2E] text-[#888] hover:bg-[#252540]'
              }`}
            >
              <span className="text-base sm:text-lg">{paymentIcons[method]}</span>
              <span className="capitalize leading-tight">{method === 'shoppe' ? 'Shopee' : method === 'gofood' ? 'GoFood' : method}</span>
            </button>
          ))}
        </div>
      </div>

      {paymentMethod === 'tunai' && (
        <div>
          <p className="text-[#888] text-xs mb-1">Jumlah Tunai</p>
          <input
            type="text"
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            placeholder="Rp. 0"
            className="w-full bg-[#1A1A2E] border border-[#303050] text-white text-right text-lg font-bold rounded-xl p-3 outline-none focus:border-[#F5A623]"
          />
          {cashNumeric > 0 && (
            <p className={`text-right text-sm mt-1 font-semibold ${isValidCash ? 'text-green-400' : 'text-[#FF6B6B]'}`}>
              {isValidCash ? `Kembali: ${formatPrice(changeNumeric)}` : `Kurang: ${formatPrice(totalPriceNumeric - cashNumeric)}`}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-[#888] text-sm">Total</span>
        <span className="text-white font-black text-xl">{getTotalPrice()}</span>
      </div>

      <div className="flex gap-3">
        <button onClick={clearCart} className="flex-1 bg-[#1A1A2E] text-[#FF6B6B] font-bold py-3 rounded-xl hover:bg-[#252540] transition text-sm min-h-[44px]">
          Batal
        </button>
        <button onClick={handleBayar} disabled={items.length === 0} className="flex-1 bg-[#F5A623] text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition disabled:opacity-50 text-sm min-h-[44px]">
          Bayar
        </button>
      </div>
    </div>
  </>
);
