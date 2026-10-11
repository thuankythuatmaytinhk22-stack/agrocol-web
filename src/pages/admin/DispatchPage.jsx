import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Route, AlertTriangle } from 'lucide-react';
import { simulateColdTelemetry } from '../../lib/coldChain';
import { optimizeRoutes, stopKindLabel } from '../../lib/routeOptimizer';
import RouteMap from '../../components/map/RouteMap';

export default function DispatchPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  const shippingAlerts = orders
    .filter((o) => o.status === 'shipping' || o.status === 'packed')
    .map((o) => ({ order: o, tel: simulateColdTelemetry(o) }))
    .filter((x) => x.tel.level !== 'ok');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-agro-yellow border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-agro-dark flex items-center gap-2">
            <Route className="w-6 h-6" />
            Điều phối AI
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Tối ưu lộ trình giao hàng và cảnh báo nhiệt độ theo thời gian thực
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium text-sm"
          />
          <button
            onClick={() => setPlan(optimizeRoutes(orders, selectedDate))}
            className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-6 py-3 rounded-xl whitespace-nowrap transition-colors text-sm"
          >
            Tính tuyến tối ưu
          </button>
        </div>
      </div>

      {/* Cảnh báo nhiệt độ */}
      {shippingAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-agro-dark flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Cảnh báo nhiệt độ ({shippingAlerts.length})
          </h3>
          {shippingAlerts.map(({ order, tel }) => (
            <div
              key={order.id}
              className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-agro-dark text-sm">
                  Cảnh báo: Nhiệt độ thùng {order.order_code} có xu hướng tăng lên{' '}
                  {tel.predicted30}°C
                  {tel.breachIn ? ` trong ${tel.breachIn} phút tới` : ''}.
                </p>
                <p className="text-sm text-gray-600 font-medium mt-1">
                  {tel.advice}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kết quả lộ trình */}
      {plan && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-agro-dark text-white rounded-2xl p-6">
              <p className="text-sm text-white/70 font-medium">
                Tiết kiệm so với FIFO
              </p>
              <p className="text-4xl font-extrabold text-agro-yellow mt-1">
                {plan.savedMinutes} phút
              </p>
              <p className="text-sm mt-2 font-medium">
                {plan.savedKm} km · {plan.count || 0} đơn đang xử lý
              </p>
            </div>
            <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              {plan.empty ? (
                <p className="text-gray-500 font-medium">
                  Không có đơn hàng nào trong ngày{' '}
                  {new Date(selectedDate).toLocaleDateString('vi-VN')}.
                </p>
              ) : (
                <>
                  <p className="font-bold text-agro-dark mb-3 text-sm">
                    Tuyến đường tối ưu: {plan.next.points.map((p) => p.label).join(' → ')}
                  </p>
                  <p className="text-sm text-gray-500 font-medium mb-4">
                    Tiết kiệm {plan.savedMinutes} phút và {plan.savedKm} km so với lộ trình cũ ({plan.old.km} km).
                  </p>
                  <ol className="space-y-2">
                    {plan.next.points.map((p, i) => (
                      <li key={p.id} className="flex items-center gap-3 text-sm">
                        <span className="w-7 h-7 rounded-full bg-agro-dark text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-semibold text-agro-dark">
                          {stopKindLabel(p.kind)}
                        </span>
                        <span className="text-gray-600 truncate">{p.label}</span>
                        {p.product && (
                          <span className="ml-auto text-xs bg-green-50 text-agro-dark px-2 py-1 rounded-full font-bold whitespace-nowrap">
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

          {!plan.empty && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-agro-dark mb-4 flex items-center gap-2">
                🗺️ Bản đồ lộ trình tối ưu
              </h3>
              <RouteMap points={plan.next.points} />
              <div className="flex items-center gap-4 mt-4 text-xs font-medium text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-agro-yellow border border-white shadow"></span>
                  Kho
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-agro-green border border-white shadow"></span>
                  Lấy hàng
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-agro-dark border border-white shadow"></span>
                  Giao hàng
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hướng dẫn khi chưa tính */}
      {!plan && (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          <Route className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-agro-dark mb-1">
            Chưa có lộ trình nào được tính
          </h3>
          <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
            Chọn ngày và bấm "Tính tuyến tối ưu" để AI phân tích và đề xuất
            lộ trình giao hàng tối ưu nhất.
          </p>
        </div>
      )}
    </div>
  );
}