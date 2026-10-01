import { useState } from 'react';
import { createOrder } from '../services/orderService';
import { CheckCircle } from 'lucide-react';

export default function BookingPage() {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    product_type: '',
    weight: '',
    send_date: '',
    pickup_address: '',
    delivery_address: '',
  });
  const [boxes, setBoxes] = useState(0);
  const [cost, setCost] = useState(0);
  const [successBoxes, setSuccessBoxes] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'weight') {
      const weightValue = parseFloat(value || 0);
      const calculatedBoxes = Math.ceil(weightValue / 250);
      setBoxes(calculatedBoxes);
      setCost(calculatedBoxes * 1000000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const currentBoxes = boxes;
      await createOrder(formData);
      setSuccessBoxes(currentBoxes);
      setIsSuccess(true);
      setFormData({ customer_name: '', customer_phone: '', product_type: '', weight: '', send_date: '', pickup_address: '', delivery_address: '' });
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
        <h1 className="text-3xl font-bold text-agro-dark mb-2">BẮT ĐẦU CHUYẾN ĐI</h1>
        <h2 className="text-4xl font-extrabold text-agro-dark mb-8">Đặt thùng lạnh</h2>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-agro-dark">Tên người đặt</label>
                <input name="customer_name" value={formData.customer_name} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium" placeholder="VD: Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-agro-dark">Số điện thoại</label>
                <input name="customer_phone" value={formData.customer_phone} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium" placeholder="VD: 0905xxxxxx" />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-agro-dark">Loại nông sản</label>
                <input name="product_type" value={formData.product_type} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium" placeholder="VD: Sầu riêng" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-agro-dark">Ngày gửi</label>
                <input type="date" name="send_date" value={formData.send_date} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-agro-dark">Khối lượng (kg)</label>
                <input type="number" name="weight" value={formData.weight} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium" placeholder="VD: 650" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-agro-dark">Số thùng (ước tính)</label>
                <div className="w-full bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-agro-dark font-bold text-lg">
                  {boxes > 0 ? `${boxes} thùng` : 'Chưa xác định'}
                </div>
                <p className="text-xs text-gray-400 mt-1">Ước tính theo định mức 250 kg/thùng</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-agro-dark">Điểm lấy hàng</label>
                <input name="pickup_address" value={formData.pickup_address} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium" placeholder="VD: Nhà vườn Đắk Lắk" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-agro-dark">Điểm giao</label>
                <input name="delivery_address" value={formData.delivery_address} onChange={handleChange} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-agro-dark outline-none text-agro-dark font-medium" placeholder="VD: Chợ Bình Điền, TP.HCM" />
              </div>
              <div className="md:col-span-2">
                <button type="submit" disabled={loading}
                  className="w-full bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold text-lg py-4 rounded-xl transition-colors disabled:opacity-50">
                  {loading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN ĐẶT THÙNG'}
                </button>
              </div>
            </form>
            {isSuccess && (
              <div className="mt-4 bg-green-100 text-agro-dark p-4 rounded-xl flex items-center gap-3 font-semibold">
                <CheckCircle className="w-6 h-6" />
                <span>Đặt thùng thành công! Đã ước tính {successBoxes} thùng cho chuyến hàng.</span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-agro-dark text-white rounded-2xl p-6 shadow-md">
              <p className="text-sm opacity-80 mb-1 font-medium">Chi phí dự kiến</p>
              <h3 className="text-4xl font-extrabold text-agro-yellow">
                {cost.toLocaleString('vi-VN')}đ
              </h3>
              <hr className="my-4 border-white/20" />
              <p className="text-sm opacity-80 font-medium">Số thùng ước tính</p>
              <p className="text-2xl font-bold text-white">{boxes > 0 ? `${boxes} thùng` : 'Chưa xác định'}</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
              <div className="flex items-center gap-2 text-agro-dark font-bold mb-1">
                <span>🌡️</span> Nhiệt độ mục tiêu: 13–15°C
              </div>
              <p className="text-sm text-gray-500 font-medium">Cấu hình làm lạnh: AgroCold đề xuất</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}