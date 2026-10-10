import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getAllBoxes, updateBoxStatus } from '../services/boxService';
import { Package, Recycle, Route, AlertTriangle } from 'lucide-react';
import { simulateColdTelemetry } from '../lib/coldChain';
import { optimizeRoutes, stopKindLabel } from '../lib/routeOptimizer';

export default function AdminPage() {
  const [orders, setOrders] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);

  const fetchData = async () => {
    const { data: orderData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (orderData) setOrders(orderData);

    try {
      const boxData = await getAllBoxes();
      setBoxes(boxData);
    } catch (err) {
      console.error(err);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) alert('Lỗi: ' + error.message);
    else fetchData();
  };

  const handleUpdateBoxStatus = async (boxCode, newStatus) => {
    try {
      await updateBoxStatus(boxCode, newStatus);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const orderStatusOptions = [
    { value: 'pending', label: 'Đã đặt', color: 'bg-gray-100 text-gray-700' },
    { value: 'packed', label: 'Đã đóng hàng', color: 'bg-blue-100 text-blue-700' },
    { value: 'shipping', label: 'Đang vận chuyển', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'delivered', label: 'Đã giao', color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
  ];

  const boxStatusOptions = [
    { value: 'delivered', label: 'Đã giao (Chờ thu hồi)', color: 'bg-green-100 text-green-700' },
    { value: 'waiting_return', label: 'Chờ thu hồi', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'at_hub', label: 'Đã về Hub', color: 'bg-blue-100 text-blue-700' },
    { value: 'ready', label: 'Sẵn sàng tái sử dụng', color: 'bg-purple-100 text-purple-700' },
  ];

  const shippingAlerts = orders
    .filter((o) => o.status === 'shipping' || o.status === 'packed')
    .map((o) => ({ order: o, tel: simulateColdTelemetry(o) }))
    .filter((x) => x.tel.level !== 'ok');

  if (loading) return <div className="text-center py-20">Đang tải...</div>;

  return (
    <div className="bg-agro-bg min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 space-y-10">

        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Route className="w-6 h-6 text-agro-dark" />
              <h1 className="text-3xl font-bold text-agro-dark">Điều phối AI</h1>
            </div>
            <button
              onClick={() => setPlan(optimizeRoutes(orders))}
              className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-6 py-3 rounded-xl"
            >
              Tính tuyến tối ưu hôm nay
            </button>
          </div>

          {shippingAlerts.length > 0 && (
            <div className="space-y-3 mb-6">
              {shippingAlerts.map(({ order, tel }) => (
                <div key={order.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-agro-dark">
                      Cảnh báo: Nhiệt độ thùng {order.order_code} có xu hướng tăng lên {tel.predicted30}°C
                      {tel.breachIn ? ` trong ${tel.breachIn} phút tới` : ''}.
                    </p>
                    <p className="text-sm text-gray-600 font-medium mt-1">{tel.advice}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {plan && (
            <div className="grid md:grid-cols-3 gap-6 mb-2">
              <div className="bg-agro-dark text-white rounded-2xl p-6">
                <p className="text-sm text-white/70 font-medium">Tiết kiệm so với FIFO</p>
                <p className="text-4xl font-extrabold text-agro-yellow mt-1">{plan.savedMinutes} phút</p>
                <p className="text-sm mt-2 font-medium">{plan.savedKm} km · {plan.count || 0} đơn đang xử lý</p>
              </div>
              <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                {plan.empty ? (
                  <p className="text-gray-500 font-medium">Chưa có đơn pending/packed/shipping để lập tuyến.</p>
                ) : (
                  <>
                    <p className="font-bold text-agro-dark mb-3">
                      Tuyến đường tối ưu hôm nay: {plan.next.points.map((p) => p.label).join(' → ')}
                    </p>
                    <p className="text-sm text-gray-500 font-medium mb-4">
                      Tiết kiệm {plan.savedMinutes} phút và {plan.savedKm} km so với lộ trình cũ ({plan.old.km} km).
                      Ưu tiên nông sản có thời gian bảo quản ngắn.
                    </p>
                    <ol className="space-y-2">
                      {plan.next.points.map((p, i) => (
                        <li key={p.id} className="flex items-center gap-3 text-sm">
                          <span className="w-7 h-7 rounded-full bg-agro-dark text-white font-bold flex items-center justify-center text-xs">
                            {i + 1}
                          </span>
                          <span className="font-semibold text-agro-dark">{stopKindLabel(p.kind)}</span>
                          <span className="text-gray-600">{p.label}</span>
                          {p.product && (
                            <span className="ml-auto text-xs bg-green-50 text-agro-dark px-2 py-1 rounded-full font-bold">
                              {p.product.name} · {p.shelfHours}h
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Phần 1: Quản lý Đơn hàng */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-6 h-6 text-agro-dark" />
            <h1 className="text-3xl font-bold text-agro-dark">Quản trị Đơn hàng</h1>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-agro-dark text-white">
                <tr>
                  <th className="px-6 py-4">Mã đơn</th>
                  <th className="px-6 py-4">Khách hàng</th>
                  <th className="px-6 py-4">Nông sản</th>
                  <th className="px-6 py-4">Khối lượng</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-6 text-gray-400">Chưa có đơn hàng nào</td></tr>
                ) : orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-agro-dark">{order.order_code}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold">{order.customer_name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{order.customer_phone || 'N/A'}</p>
                    </td>
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
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
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