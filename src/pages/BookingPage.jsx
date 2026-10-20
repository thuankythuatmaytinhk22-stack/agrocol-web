import { useState } from 'react';
import { createOrder, cancelOrder } from '../services/orderService';
import { CheckCircle, MapPin, AlertCircle, Phone, X } from 'lucide-react';
import LocationPicker from '../components/map/LocationPicker';

const PRICE_PER_BOX = 400000; 
const WEIGHT_PER_BOX = 350;   

const HUB_ADDRESS = 'Kho lạnh AgroCold - 123 Lê Duẩn, TP. Buôn Ma Thuột, Đắk Lắk';
const HUB_COORDS = { lat: 12.6662, lng: 108.0382 };

const EMPTY_FORM = {
  customer_name: '',
  customer_phone: '',
  product_type: '',
  weight: '',
  send_date: '',
  pickup_time: '',
  delivery_address: '',
  hub_address: HUB_ADDRESS,
};

const customCalcBoxes = (weight) => {
  const w = parseFloat(weight) || 0;
  if (w <= 0) return 0;
  return Math.ceil(w / WEIGHT_PER_BOX);
};

const customCalcCost = (boxes) => {
  return boxes * PRICE_PER_BOX;
};

const getProductInfo = (type) => {
  const products = {
    'Sầu riêng': { minTemp: 13, maxTemp: 15, name: 'Sầu riêng', shelfHours: 48, note: 'Bảo quản lạnh sâu, tránh sốc nhiệt.' },
    'Dâu tây': { minTemp: -0.5, maxTemp: 1, name: 'Dâu tây', shelfHours: 24, note: 'Cần độ ẩm cao, tránh dập nát.' },
    'Bơ': { minTemp: 4, maxTemp: 13, name: 'Bơ', shelfHours: 72, note: 'Bảo quản mát, tránh ánh sáng trực tiếp.' },
    'Xoài': { minTemp: 10, maxTemp: 13, name: 'Xoài', shelfHours: 60, note: 'Nhiệt độ phù hợp để xoài chín đều.' },
  };
  return products[type] || { minTemp: '--', maxTemp: '--', name: 'Chưa xác định', shelfHours: 0, note: 'Chọn loại nông sản để xem cấu hình.' };
};

export default function BookingPage() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [boxes, setBoxes] = useState(0);
  const [cost, setCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState({ lat: null, lng: null });

  // State cho thanh toán cọc
  const [showQR, setShowQR] = useState(false);
  const [currentOrderData, setCurrentOrderData] = useState(null);
  const [currentDepositAmount, setCurrentDepositAmount] = useState(0); // Thêm state lưu tiền cọc

  const product = getProductInfo(formData.product_type);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg('');

    if (name === 'weight') {
      const calculatedBoxes = customCalcBoxes(value);
      setBoxes(calculatedBoxes);
      setCost(customCalcCost(calculatedBoxes));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.send_date && formData.pickup_time) {
      const selectedDateTime = new Date(`${formData.send_date}T${formData.pickup_time}`);
      if (selectedDateTime < new Date()) {
        setErrorMsg('Thời gian gửi hàng không hợp lệ. Vui lòng chọn thời gian trong tương lai!');
        return;
      }
    }

    if (!deliveryCoords.lat) {
      alert('Bạn cần chọn vị trí giao hàng trên bản đồ!');
      return;
    }

    setLoading(true);
    try {
      const deposit = cost * 0.5; // Tính tiền cọc trước khi reset

      const order = await createOrder({
        ...formData,
        pickup_lat: HUB_COORDS.lat,
        pickup_lng: HUB_COORDS.lng,
        delivery_lat: deliveryCoords.lat,
        delivery_lng: deliveryCoords.lng,
        boxes: boxes,
      }, cost, deposit);

      // Lưu data đơn hàng hiện tại và số tiền cọc để hiển thị lên Popup
      setCurrentOrderData(order);
      setCurrentDepositAmount(deposit);
      setShowQR(true);
      
      // Reset form
      setFormData(EMPTY_FORM);
      setDeliveryCoords({ lat: null, lng: null });
      setBoxes(0);
      setCost(0);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý khi khách bấm "Đã hoàn thành cọc"
  const handleConfirmDeposit = () => {
    setShowQR(false);
    alert('Cảm ơn bạn! Vui lòng chờ Admin xác nhận. Đơn hàng của bạn đang được xử lý.');
  };

  // Xử lý khi khách bấm "Hủy đặt thùng"
  const handleCancelOrder = async () => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này? Thao tác không thể hoàn tác.')) return;
    try {
      await cancelOrder(currentOrderData.id);
      alert('Đã hủy đơn hàng thành công.');
      setShowQR(false);
      setCurrentOrderData(null);
    } catch (err) {
      alert('Lỗi hủy đơn: ' + err.message);
    }
  };

  return (
    <div className="bg-agro-bg min-h-screen py-12 font-sans relative">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-agro-dark mb-2">BẮT ĐẦU CHUYẾN ĐI</h1>
        <h2 className="text-4xl font-extrabold text-agro-dark mb-8">Đặt thùng lạnh</h2>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Thông tin khách hàng */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-agro-dark">Tên người đặt</label>
                  <input name="customer_name" value={formData.customer_name} onChange={handleChange} required className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium" placeholder="VD: Nguyễn Văn A" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-agro-dark">Số điện thoại</label>
                  <input name="customer_phone" value={formData.customer_phone} onChange={handleChange} required className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium" placeholder="VD: 0905xxxxxx" />
                </div>
              </div>

              {/* Thông tin hàng hóa */}
              <div className="grid md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-agro-dark">Loại nông sản</label>
                  <select name="product_type" value={formData.product_type} onChange={handleChange} required className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium bg-white">
                    <option value="">-- Chọn loại nông sản --</option>
                    <option value="Sầu riêng">🍈 Sầu riêng</option>
                    <option value="Dâu tây">🍓 Dâu tây</option>
                    <option value="Bơ">🥑 Bơ</option>
                    <option value="Xoài">🥭 Xoài</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-agro-dark">Ngày gửi</label>
                  <input type="date" name="send_date" value={formData.send_date} onChange={handleChange} required className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-agro-dark">Giờ đặt</label>
                  <input type="time" name="pickup_time" value={formData.pickup_time} onChange={handleChange} required className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-agro-dark">Khối lượng (kg)</label>
                  <input type="number" name="weight" value={formData.weight} onChange={handleChange} required className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium" placeholder="VD: 700" />
                </div>
              </div>

              {/* Hub Cố Định */}
              <div className="border-t border-gray-100 pt-6">
                <label className="block text-sm font-semibold mb-2 text-agro-dark flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" /> Điểm lấy hàng (Kho Hub)
                </label>
                <div className="bg-blue-50 text-blue-800 text-sm font-medium p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">{HUB_ADDRESS}</p>
                    <p className="text-xs opacity-80">Mọi nông sản sẽ được vận chuyển về kho này để đóng thùng và xử lý đông lạnh (PCM).</p>
                  </div>
                </div>
              </div>

              {/* Điểm giao hàng */}
              <div className="border-t border-gray-100 pt-6">
                <LocationPicker label="🎯 Điểm giao hàng" value={deliveryCoords} onChange={(coords) => {
                    setDeliveryCoords(coords);
                    if (coords.address) setFormData((prev) => ({ ...prev, delivery_address: coords.address }));
                  }} />
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-5 h-5" /> {errorMsg}
                </div>
              )}

              <div className="border-t border-gray-100 pt-6">
                <button type="submit" disabled={loading} className="w-full bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold text-lg py-4 rounded-xl transition-colors disabled:opacity-50">
                  {loading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN ĐẶT THÙNG'}
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar tóm tắt */}
          <div className="space-y-6">
            <div className="bg-agro-dark text-white rounded-2xl p-6 shadow-md">
              <p className="text-sm opacity-80 mb-1 font-medium">Chi phí dự kiến</p>
              <h3 className="text-4xl font-extrabold text-agro-yellow">{cost.toLocaleString('vi-VN')}đ</h3>
              <hr className="my-4 border-white/20" />
              <p className="text-sm opacity-80 font-medium">Số thùng ước tính</p>
              <p className="text-2xl font-bold text-white">{boxes > 0 ? `${boxes} thùng` : 'Chưa xác định'}</p>
              <p className="text-xs opacity-60 mt-2 italic">* Quy cách: {WEIGHT_PER_BOX}kg / thùng. Làm tròn lên.</p>
            </div>

            {/* Thẻ nhiệt độ hiện tại */}
            <div className={`rounded-2xl p-6 border transition-all ${formData.product_type ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-green-50/50 border-green-100'}`}>
              <div className="flex items-center gap-2 text-agro-dark font-bold mb-2">
                <span className="text-xl">🌡️</span>
                <span>Nhiệt độ mục tiêu: <span className="text-agro-dark text-lg">{product.minTemp}–{product.maxTemp}°C</span></span>
              </div>
              {formData.product_type ? (
                <>
                  <p className="text-xs text-agro-dark font-bold mb-1">{product.name} · Bảo quản {product.shelfHours}h</p>
                  <p className="text-sm text-gray-600 font-medium">{product.note}</p>
                </>
              ) : (
                <p className="text-sm text-gray-500 font-medium">Chọn loại nông sản để xem cấu hình làm lạnh phù hợp</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL THANH TOÁN CỌC (HIỂN THỊ SAU KHI ĐẶT HÀNG) */}
      {showQR && currentOrderData && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden relative">
            
            {/* Header */}
            <div className="bg-agro-dark text-white p-5 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-agro-yellow" /> Đặt thùng thành công!
              </h3>
            </div>

            <div className="p-6 space-y-5">
              {/* Thông báo Hotline */}
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold flex items-start gap-3 border border-red-100">
                <Phone className="w-5 h-5 flex-shrink-0 mt-0.5 animate-pulse" />
                <p>Vui lòng gọi HOTLINE <span className="text-lg">1900 1234</span> để xác nhận đơn hàng trước khi tiến hành chuyển khoản cọc!</p>
              </div>

              {/* Thông tin tiền cọc */}
              <div className="text-center bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-sm text-gray-500 font-semibold mb-1">Số tiền cần cọc (50%)</p>
                {/* ĐÃ SỬA: Dùng currentDepositAmount thay vì tính lại từ cost */}
                <p className="text-4xl font-extrabold text-agro-yellow">{currentDepositAmount.toLocaleString('vi-VN')}đ</p>
                <p className="text-xs text-gray-400 mt-1">Tổng đơn: {currentOrderData.total_price?.toLocaleString('vi-VN')}đ</p>
              </div>

              {/* Mã QR */}
              <div className="flex flex-col items-center">
                <p className="text-sm font-bold text-gray-700 mb-2">Quét mã QR để chuyển khoản</p>
                <div className="w-48 h-48 bg-white border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden">
                  {/* Thay src bằng tên file ảnh bạn đã up lên public, VD: /qr-code.png */}
                  <img 
                    src="/qr-code.jpg" 
                    alt="Mã QR Ngân hàng" 
                    className="w-full h-full object-contain p-2" 
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/200x200?text=Anh+QR+Code'; }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Nội dung chuyển khoản: <strong className="text-agro-dark">{currentOrderData.order_code}</strong></p>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button onClick={handleCancelOrder} className="flex-1 border border-gray-300 hover:bg-white text-gray-700 font-bold py-3 rounded-xl">
                Hủy đặt thùng
              </button>
              <button onClick={handleConfirmDeposit} className="flex-1 bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 rounded-xl">
                Đã hoàn thành cọc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}