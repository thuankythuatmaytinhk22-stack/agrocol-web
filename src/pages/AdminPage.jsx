import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getAllBoxes, updateBoxStatus } from '../services/boxService';
import { Package, Recycle } from 'lucide-react';

export default function AdminPage() {
  const [orders, setOrders] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Lấy đơn hàng
    const { data: orderData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (orderData) setOrders(orderData);

    // Lấy thùng
    try {
      const boxData = await getAllBoxes();
      setBoxes(boxData);
    } catch (err) {
      console.error(err);
    }
    
    setLoading(false);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) alert('Lỗi: ' + error.message);
    else fetchData();
  };

  const handleUpdateBoxStatus = async (boxCode, newStatus) => {
    try {
      await updateBoxStatus(boxCode, newStatus);
      fetchData(); // Tải lại dữ liệu sau khi cập nhật
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const orderStatusOptions = [
    { value: 'pending', label: 'Đã đặt', color: 'bg-gray-100 text-gray-700' },
    { value: 'packed', label: 'Đã đóng hàng', color: 'bg-blue-100 text-blue-700' },
    { value: 'shipping', label: 'Đang vận chuyển', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'delivered', label: 'Đã giao', color: 'bg-green-100 text-green-700' },
  ];

  const boxStatusOptions = [
    { value: 'delivered', label: 'Đã giao (Chờ thu hồi)', color: 'bg-green-100 text-green-700' },
    { value: 'waiting_return', label: 'Chờ thu hồi', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'at_hub', label: 'Đã về Hub', color: 'bg-blue-100 text-blue-700' },
    { value: 'ready', label: 'Sẵn sàng tái sử dụng', color: 'bg-purple-100 text-purple-700' },
  ];

  if (loading) return <div className="text-center py-20">Đang tải...</div>;

  return (
    <div className="bg-agro-bg min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 space-y-10">
        
        {/* Phần 1: Quản lý Đơn hàng */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-6 h-6 text-agro-dark" />
            <h1 className="text-3xl font-bold text-agro-dark">Quản trị Đơn hàng</h1>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-agro-dark text-white">
                <tr>
                  <th className="px-6 py-4">Mã đơn</th>
                  <th className="px-6 py-4">Nông sản</th>
                  <th className="px-6 py-4">Khối lượng</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-6 text-gray-400">Chưa có đơn hàng nào</td></tr>
                ) : orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-agro-dark">{order.order_code}</td>
                    <td className="px-6 py-4">{order.product_type}</td>
                    <td className="px-6 py-4">{order.weight} kg ({order.boxes} thùng)</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${orderStatusOptions.find(s => s.value === order.status)?.color}`}>
                        {orderStatusOptions.find(s => s.value === order.status)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-agro-dark"
                      >
                        {orderStatusOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Phần 2: Quản lý Thùng */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Recycle className="w-6 h-6 text-agro-dark" />
            <h1 className="text-3xl font-bold text-agro-dark">Quản trị Thùng lạnh</h1>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-agro-dark text-white">
                <tr>
                  <th className="px-6 py-4">Mã thùng</th>
                  <th className="px-6 py-4">Loại nông sản</th>
                  <th className="px-6 py-4">Nhiệt độ mục tiêu</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {boxes.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-6 text-gray-400">Chưa có thùng nào</td></tr>
                ) : boxes.map((box) => (
                  <tr key={box.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-agro-dark">{box.box_code}</td>
                    <td className="px-6 py-4">{box.product_type}</td>
                    <td className="px-6 py-4">{box.target_temp}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${boxStatusOptions.find(s => s.value === box.status)?.color}`}>
                        {boxStatusOptions.find(s => s.value === box.status)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={box.status}
                        onChange={(e) => handleUpdateBoxStatus(box.box_code, e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-agro-dark"
                      >
                        {boxStatusOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}