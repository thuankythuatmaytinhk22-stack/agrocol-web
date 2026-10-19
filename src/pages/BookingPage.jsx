import { useState } from 'react';
import { createOrder } from '../services/orderService';
import { CheckCircle } from 'lucide-react';
import { calcBoxes, calcCost, matchProduct } from '../lib/coldChain';
import LocationPicker from '../components/map/LocationPicker';

const EMPTY_FORM = {
  customer_name: '',
  customer_phone: '',
  product_type: '',
  weight: '',
  send_date: '',
  pickup_time: '',
  pickup_address: '',
  delivery_address: '',
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
      pickup_address: draft.pickup_address || '',
      delivery_address: draft.delivery_address || '',
    };
    const boxes = calcBoxes(draft.weight);
    return { formData, boxes, cost: calcCost(boxes) };
  });

  const [formData, setFormData] = useState(boot.formData);
  const [boxes, setBoxes] = useState(boot.boxes);
  const [cost, setCost] = useState(boot.cost);
  const [successBoxes, setSuccessBoxes] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [pickupCoords, setPickupCoords] = useState({ lat: null, lng: null });
  const [deliveryCoords, setDeliveryCoords] = useState({ lat: null, lng: null });

  const product = matchProduct(formData.product_type);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'weight') {
      const calculatedBoxes = calcBoxes(value);
      setBoxes(calculatedBoxes);
      setCost(calcCost(calculatedBoxes));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pickupCoords.lat || !deliveryCoords.lat) {
      alert('Bạn cần chọn vị trí lấy hàng và giao hàng trên bản đồ!');
      return;
    }

    setLoading(true);
    try {
      const currentBoxes = boxes;
      await createOrder({
        ...formData,
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        delivery_lat: deliveryCoords.lat,
        delivery_lng: deliveryCoords.lng,
      });
      setSuccessBoxes(currentBoxes);
      setIsSuccess(true);
      setFormData(EMPTY_FORM);
      setPickupCoords({ lat: null, lng: null });
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
                    placeholder="VD: 650"
                  />
                </div>
              </div>

              {/* Điểm lấy hàng */}
              <div className="border-t border-gray-100 pt-6">
                <LocationPicker
                  label="📍 Điểm lấy hàng"
                  value={pickupCoords}
                  onChange={(coords) => {
                    setPickupCoords(coords);
                    if (coords.address) {
                      setFormData((prev) => ({
                        ...prev,
                        pickup_address: coords.address,
                      }));
                    }
                  }}
                />
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