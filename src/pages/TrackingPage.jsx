import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrderByCode, subscribeToOrder } from '../services/orderService';
import { Package, Truck, CheckCircle, MapPin, Thermometer } from 'lucide-react';

export default function TrackingPage() {
  const { orderCode } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState(orderCode || '');

  useEffect(() => {
    if (!orderCode) { setLoading(false); return; }
    
    const fetchOrder = async () => {
      try {
        const data = await getOrderByCode(orderCode);
        setOrder(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();

    const subscription = subscribeToOrder(orderCode, (updatedOrder) => {
      setOrder(updatedOrder);
    });
    return () => subscription.unsubscribe();
  }, [orderCode]);

  const steps = [
    { key: 'pending', label: 'Đã đặt', icon: Package },
    { key: 'packed', label: 'Đã đóng hàng', icon: Package },
    { key: 'shipping', label: 'Đang vận chuyển', icon: Truck },
    { key: 'delivered', label: 'Đã giao', icon: MapPin },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === order?.status);

  if (loading) return <div className="text-center py-20">Đang tải...</div>;

  if (!orderCode) {
    return (
      <div className="bg-agro-bg min-h-screen py-20 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-agro-dark mb-6">Theo dõi chuyến hàng</h1>
        <div className="flex gap-4 max-w-md w-full px-4">
          <input value={searchCode} onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Nhập mã chuyến hàng (VD: AC-2026-00125)"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-agro-dark" />
          <Link to={`/tracking/${searchCode}`} className="bg-agro-yellow text-agro-dark font-bold px-6 py-3 rounded-xl hover:bg-yellow-500">
            Tìm
          </Link>
        </div>
      </div>
    );
  }

  if (!order) return <div className="text-center py-20">Không tìm thấy đơn hàng!</div>;

  return (
    <div className="bg-agro-bg min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-sm text-gray-400 font-semibold">MÃ CHUYẾN HÀNG</p>
              <h2 className="text-3xl font-extrabold text-agro-dark">{order.order_code}</h2>
              <p className="text-agro-dark font-semibold mt-1">{order.pickup_address} → {order.delivery_address}</p>
            </div>
            <span className="bg-green-100 text-agro-dark px-4 py-2 rounded-full text-sm font-bold">
              {order.status === 'delivered' ? 'Đã giao' : order.status === 'shipping' ? 'Đang vận chuyển' : 'Đã đặt'}
            </span>
          </div>

          {/* Timeline */}
          <div className="flex justify-between items-center mb-10 relative">
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 z-0"></div>
            <div className="absolute top-5 left-0 h-1 bg-agro-dark z-0" style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}></div>
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isActive = i <= currentStepIndex;
              return (
                <div key={step.key} className="flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-agro-dark text-white' : 'bg-gray-200 text-gray-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 font-semibold ${isActive ? 'text-agro-dark' : 'text-gray-400'}`}>{step.label}</span>
                </div>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-agro-dark mb-4">Thông tin chuyến hàng</h3>
              <p className="text-sm text-gray-600 mb-1">{order.product_type} | {order.weight} kg | {order.boxes} thùng</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
              <div className="flex items-center gap-2 text-agro-dark font-bold mb-2">
                <Truck className="w-5 h-5" /> Tài xế: {order.driver_name || 'Nguyễn Văn A'}
              </div>
              <p className="text-sm text-gray-600 mb-1">SĐT: {order.driver_phone || '+84905xxxxxxx'}</p>
              <div className="mt-4 pt-4 border-t border-green-200 flex items-center gap-2 text-agro-dark">
                <Thermometer className="w-5 h-5" />
                <span className="font-bold">Nhiệt độ: {order.temperature}°C (13-15°C)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}