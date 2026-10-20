import { useState } from 'react';
import { createOrder } from '../services/orderService';
import { CheckCircle, MapPin, AlertCircle } from 'lucide-react';
import LocationPicker from '../components/map/LocationPicker';
// import { calcBoxes, calcCost, matchProduct } from '../lib/coldChain'; // Bỏ qua hàm tính toán cũ để tự viết lại

const PRICE_PER_BOX = 400000; // Giá mới: 400.000đ / thùng
const WEIGHT_PER_BOX = 350;   // Quy cách mới: 350kg / thùng

// Địa chỉ Hub cố định
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
  hub_address: HUB_ADDRESS, // Thêm trường này
};

// Hàm tính số thùng (Làm tròn lên)
const customCalcBoxes = (weight) => {
  const w = parseFloat(weight) || 0;
  if (w <= 0) return 0;
  return Math.ceil(w / WEIGHT_PER_BOX);
};

// Hàm tính tiền
const customCalcCost = (boxes) => {
  return boxes * PRICE_PER_BOX;
};

// Hàm lấy thông tin nhiệt độ (Đề phòng file coldChain bị lỗi, tôi copy tạm logic vào đây)
const getProductInfo = (type) => {
  const products = {
    'Sầu riêng': { minTemp: 13, maxTemp: 15, name: 'Sầu riêng', shelfHours: 48, note: 'Bảo quản lạnh sâu, tránh sốc nhiệt.' },
    'Dâu tây': { minTemp: -0.5, maxTemp: 1, name: 'Dâu tây', shelfHours: 24, note: 'Cần độ ẩm cao, tránh dập nát.' },
    'Bơ': { minTemp: 4, maxTemp: 13, name: 'Bơ', shelfHours: 72, note: 'Bảo quản mát, tránh ánh sáng trực tiếp.' },
    'Xoài': { minTemp: 10, maxTemp: 13, name: 'Xoài', shelfHours: 60, note: 'Nhiệt độ phù hợp để xoài chín đều.' },
  };
  return products[type] || { minTemp: '--', maxTemp: '--', name: 'Chưa xác định', shelfHours: 0, note: 'Chọn loại nông sản để xem cấu hình.' };
};

function takeBookingDraft() {
  try {
    const raw = sessionStorage.getItem('agrocold_booking_draft');
    if (!raw) return null;
    sessionStorage.removeItem('agrocold_booking_draft');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function BookingPage() {
  const [boot] = useState(() => {
    const draft = takeBookingDraft();
    if (!draft) return { formData: EMPTY_FORM, boxes: 0, cost: 0 };
    const formData = {
      ...EMPTY_FORM,
      customer_name: draft.customer_name || '',
      customer_phone: draft.customer_phone || '',
      product_type: draft.product_type || '',
      weight: draft.weight || '',
      delivery_address: draft.delivery_address || '',
    };
    const boxes = customCalcBoxes(draft.weight);
    return { formData, boxes, cost: customCalcCost(boxes) };
  });

  const [formData, setFormData] = useState(boot.formData);
  const [boxes, setBoxes] = useState(boot.boxes);
  const [cost, setCost] = useState(boot.cost);
  const [successBoxes, setSuccessBoxes] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(''); // State báo lỗi thời gian

  const [deliveryCoords, setDeliveryCoords] = useState({ lat: null, lng: null });

  const product = getProductInfo(formData.product_type);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg(''); // Xóa lỗi khi người dùng thay đổi input

    if (name === 'weight') {
      const calculatedBoxes = customCalcBoxes(value);
      setBoxes(calculatedBoxes);
      setCost(customCalcCost(calculatedBoxes));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Kiểm tra thời gian quá khứ
    if (formData.send_date && formData.pickup_time) {
      const selectedDateTime = new Date(`${formData.send_date}T${formData.pickup_time}`);
      const now = new Date();
      if (selectedDateTime < now) {
        setErrorMsg('Thời gian gửi hàng không hợp lệ. Vui lòng chọn thời gian trong tương lai!');
        return;
      }
    }

    // 2. Kiểm tra điểm giao hàng
    if (!deliveryCoords.lat) {
      alert('Bạn cần chọn vị trí giao hàng trên bản đồ!');
      return;
    }

    setLoading(true);
    try {
      const currentBoxes = boxes;
      
      // Gọi API tạo đơn (Lưu ý: bạn cần đảm bảo hàm createOrder có nhận hub_address)
      await createOrder({
        ...formData,
        pickup_lat: HUB_COORDS.lat, // Gán cứng tọa độ Hub
        pickup_lng: HUB_COORDS.lng,
        delivery_lat: deliveryCoords.lat,
        delivery_lng: deliveryCoords.lng,
        boxes: currentBoxes, // Ghi đè số thùng tính toán được
      });

      setSuccessBoxes(currentBoxes);
      setIsSuccess(true);
      setFormData(EMPTY_FORM);
      setDeliveryCoords({ lat: null, lng: null });
      setBoxes(0);
      setCost(0);
      setTimeout(() => {
        setIsSuccess(false);
        setSuccessBoxes(0);
      }, 5000);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-agro-bg min-h-screen py-12 font-sans">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-agro-dark mb-2">
          BẮT ĐẦU CHUYẾN ĐI
        </h1>
        <h2 className="text-4xl font-extrabold text-agro-dark mb-8">
          Đặt thùng lạnh
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Thông tin khách hàng */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-agro-dark">
                    Tên người đặt
                  </label>
                  <input
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium"
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-agro-dark">
                    Số điện thoại
                  </label>
                  <input
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium"
                    placeholder="VD: 0905xxxxxx"
                  />
                </div>
              </div>

              {/* Thông tin hàng hóa */}
              <div className="grid md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-agro-dark">
                    Loại nông sản
                  </label>
                  <select
                    name="product_type"
                    value={formData.product_type}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium bg-white"
                  >
                    <option value="">-- Chọn loại nông sản --</option>
                    <option value="Sầu riêng">🍈 Sầu riêng</option>
                    <option value="Dâu tây">🍓 Dâu tây</option>
                    <option value="Bơ">🥑 Bơ</option>
                    <option value="Xoài">🥭 Xoài</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-agro-dark">
                    Ngày gửi
                  </label>
                  <input
                    type="date"
                    name="send_date"
                    value={formData.send_date}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-agro-dark">
                    Giờ đặt
                  </label>
                  <input
                    type="time"
                    name="pickup_time"
                    value={formData.pickup_time}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Giờ xe đến lấy hàng
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-agro-dark">
                    Khối lượng (kg)
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium"
                    placeholder="VD: 700"
                  />
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
                <LocationPicker
                  label="🎯 Điểm giao hàng"
                  value={deliveryCoords}
                  onChange={(coords) => {
                    setDeliveryCoords(coords);
                    if (coords.address) {
                      setFormData((prev) => ({
                        ...prev,
                        delivery_address: coords.address,
                      }));
                    }
                  }}
                />
              </div>

              {/* Thông báo lỗi (nếu có) */}
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 font-medium">
                  <AlertCircle className="w-5 h-5" /> {errorMsg}
                </div>
              )}

              {/* Nút submit */}
              <div className="border-t border-gray-100 pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold text-lg py-4 rounded-xl transition-colors disabled:opacity-50"
                >
                  {loading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN ĐẶT THÙNG'}
                </button>
              </div>
            </form>

            {isSuccess && (
              <div className="mt-4 bg-green-100 text-agro-dark p-4 rounded-xl flex items-center gap-3 font-semibold">
                <CheckCircle className="w-6 h-6" />
                <span>
                  Đặt thùng thành công! Đã ước tính {successBoxes} thùng cho
                  chuyến hàng.
                </span>
              </div>
            )}
          </div>

          {/* Sidebar tóm tắt */}
          <div className="space-y-6">
            <div className="bg-agro-dark text-white rounded-2xl p-6 shadow-md">
              <p className="text-sm opacity-80 mb-1 font-medium">
                Chi phí dự kiến
              </p>
              <h3 className="text-4xl font-extrabold text-agro-yellow">
                {cost.toLocaleString('vi-VN')}đ
              </h3>
              <hr className="my-4 border-white/20" />
              <p className="text-sm opacity-80 font-medium">Số thùng ước tính</p>
              <p className="text-2xl font-bold text-white">
                {boxes > 0 ? `${boxes} thùng` : 'Chưa xác định'}
              </p>
              <p className="text-xs opacity-60 mt-2 italic">
                * Quy cách: {WEIGHT_PER_BOX}kg / thùng. Làm tròn lên.
              </p>
            </div>

            {/* Thẻ nhiệt độ hiện tại */}
            <div
              className={`rounded-2xl p-6 border transition-all ${
                formData.product_type
                  ? 'bg-green-50 border-green-200 shadow-sm'
                  : 'bg-green-50/50 border-green-100'
              }`}
            >
              <div className="flex items-center gap-2 text-agro-dark font-bold mb-2">
                <span className="text-xl">🌡️</span>
                <span>
                  Nhiệt độ mục tiêu:{' '}
                  <span className="text-agro-dark text-lg">
                    {product.minTemp}–{product.maxTemp}°C
                  </span>
                </span>
              </div>
              {formData.product_type ? (
                <>
                  <p className="text-xs text-agro-dark font-bold mb-1">
                    {product.name} · Bảo quản {product.shelfHours}h
                  </p>
                  <p className="text-sm text-gray-600 font-medium">
                    {product.note}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500 font-medium">
                  Chọn loại nông sản để xem cấu hình làm lạnh phù hợp
                </p>
              )}
            </div>

            {/* BẢNG TRA CỨU NHIỆT ĐỘ NÔNG SẢN */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-agro-dark mb-4 flex items-center gap-2">
                📋 Bảng nhiệt độ bảo quản
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="font-medium text-gray-700">🍈 Sầu riêng</span>
                  <span className="font-bold text-green-700 bg-green-50 px-2 py-1 rounded">13 – 15°C</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="font-medium text-gray-700">🍓 Dâu tây</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">-0.5 – 1°C</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="font-medium text-gray-700">🥑 Bơ</span>
                  <span className="font-bold text-yellow-700 bg-yellow-50 px-2 py-1 rounded">4 – 13°C</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-gray-700">🥭 Xoài</span>
                  <span className="font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded">10 – 13°C</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}