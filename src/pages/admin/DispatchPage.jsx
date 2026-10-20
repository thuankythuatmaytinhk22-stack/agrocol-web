import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Route, AlertTriangle, Truck, MapPin } from 'lucide-react';
import { simulateColdTelemetry } from '../../lib/coldChain';
import { optimizeRoutes, stopKindLabel } from '../../lib/routeOptimizer';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Tọa độ Hub cố định
const HUB_COORDS = { lat: 12.6662, lng: 108.0382 };

// Fix Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createIcon = (color, label) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color}; color:white; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; border:3px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export default function DispatchPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [routePaths, setRoutePaths] = useState({});
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    // 1. Tự động UPDATE tất cả các đơn trong DB thành tọa độ Hub trước khi lấy dữ liệu
    try {
      await supabase
        .from('orders')
        .update({ 
          pickup_lat: HUB_COORDS.lat, 
          pickup_lng: HUB_COORDS.lng,
          pickup_address: 'Kho lạnh AgroCold - 123 Lê Duẩn, TP. Buôn Ma Thuột, Đắk Lắk'
        })
        .not('pickup_lat', 'eq', HUB_COORDS.lat); // Chỉ cập nhật những đơn có tọa độ khác Hub
    } catch (err) {
      console.error('Lỗi tự động cập nhật địa chỉ Hub:', err);
    }

    // 2. Lấy dữ liệu mới nhất
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  const fetchRealRoutes = async (vehicles) => {
    setLoadingRoutes(true);
    const newRoutePaths = {};

    await Promise.all(
      vehicles.map(async (vehicle) => {
        try {
          const coords = vehicle.path.map((p) => `${p.lng},${p.lat}`).join(';');
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
          );
          const data = await res.json();
          
          if (data.routes && data.routes[0]) {
            const roadPath = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
            newRoutePaths[vehicle.id] = roadPath;
          }
        } catch (err) {
          console.error(`Lỗi lấy đường đi cho ${vehicle.vehicleName}:`, err);
          newRoutePaths[vehicle.id] = vehicle.path.map((p) => [p.lat, p.lng]);
        }
      })
    );

    setRoutePaths(newRoutePaths);
    setLoadingRoutes(false);
  };

  const handleOptimize = () => {
    const newPlan = optimizeRoutes(orders, selectedDate);
    setPlan(newPlan);
    if (!newPlan.empty) {
      fetchRealRoutes(newPlan.vehicles);
    }
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-agro-dark flex items-center gap-2">
            <Route className="w-6 h-6" />
            Điều phối AI
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Tự động gom nhóm đơn hàng và tối ưu lộ trình trên thực tế
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
            onClick={handleOptimize}
            disabled={loadingRoutes}
            className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-6 py-3 rounded-xl whitespace-nowrap transition-colors text-sm disabled:opacity-50"
          >
            {loadingRoutes ? 'Đang tính toán...' : 'Tính tuyến tối ưu'}
          </button>
        </div>
      </div>

      {shippingAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-agro-dark flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Cảnh báo nhiệt độ ({shippingAlerts.length})
          </h3>
          {shippingAlerts.map(({ order, tel }) => (
            <div key={order.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold text-agro-dark text-sm">
                  Cảnh báo thùng {order.order_code} có xu hướng tăng lên {tel.predicted30}°C.
                </p>
                <p className="text-sm text-gray-600 font-medium mt-1">{tel.advice}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {plan && !plan.empty && (
        <div className="space-y-6">
          <div className="bg-agro-dark text-white rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70 font-medium">Tổng tiết kiệm so với FIFO</p>
              <p className="text-4xl font-extrabold text-agro-yellow mt-1">
                {plan.totalSavedMinutes} phút
              </p>
              <p className="text-sm mt-1">{plan.totalSavedKm} km · {plan.count} đơn · {plan.vehicles.length} xe</p>
            </div>
            <Truck className="w-16 h-16 text-white/20" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-agro-dark flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Bản đồ điều phối ({plan.vehicles.length} tuyến xe)
              </h3>
            </div>
            <div className="h-[600px] w-full">
              <MapContainer 
                center={[plan.vehicles[0].path[0].lat, plan.vehicles[0].path[0].lng]} 
                zoom={6} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'
                  url={`https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=0kgv1m784H4kd86re01y`}
                />
                
                {plan.vehicles.map((vehicle) => {
                  const path = routePaths[vehicle.id] || vehicle.path.map(p => [p.lat, p.lng]);
                  return (
                    <Polyline
                      key={vehicle.id}
                      positions={path}
                      pathOptions={{ 
                        color: vehicle.color, 
                        weight: 5, 
                        opacity: 0.8,
                        dashArray: vehicle.orders.length > 3 ? '10, 5' : undefined 
                      }}
                    />
                  );
                })}

                {plan.vehicles.map((vehicle) => 
                  vehicle.path.map((p, i) => (
                    <Marker 
                      key={`${vehicle.id}-${p.id}`} 
                      position={[p.lat, p.lng]} 
                      icon={createIcon(vehicle.color, i === 0 ? 'K' : i)}
                    >
                      <Popup>
                        <div className="font-sans">
                          <p className="font-bold" style={{ color: vehicle.color }}>{vehicle.vehicleName}</p>
                          <p className="font-semibold text-agro-dark mt-1">{stopKindLabel(p.kind)}</p>
                          <p className="text-xs text-gray-600">{p.label}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))
                )}
              </MapContainer>
            </div>
          </div>

          <div className="space-y-4">
            {plan.vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div 
                  className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
                  style={{ backgroundColor: `${vehicle.color}10` }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: vehicle.color }}
                    >
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-agro-dark text-lg">{vehicle.vehicleName}</h3>
                      <p className="text-xs text-gray-500">{vehicle.orders.length} đơn hàng</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Quãng đường</p>
                      <p className="font-bold text-agro-dark">{vehicle.stats.km} km</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Thời gian</p>
                      <p className="font-bold text-agro-dark">{vehicle.stats.minutes} phút</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <ol className="space-y-3 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                    {vehicle.path.map((p, i) => (
                      <li key={p.id} className="relative pl-10">
                        <div 
                          className="absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs z-10 border-2 border-white shadow-sm"
                          style={{ backgroundColor: vehicle.color }}
                        >
                          {i === 0 ? <Truck className="w-4 h-4" /> : i + 1}
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <p className="font-semibold text-sm text-agro-dark">{stopKindLabel(p.kind)}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{p.label}</p>
                          {p.product && (
                            <p className="text-[10px] text-green-700 font-medium mt-1">
                              {p.product.name} · {p.shelfHours}h
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!plan && (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          <Route className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-agro-dark mb-1">Chưa có lộ trình nào được tính</h3>
          <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
            Chọn ngày và bấm "Tính tuyến tối ưu". Hệ thống sẽ tự động gom nhóm đơn, vẽ lộ trình thực tế bằng AI và hiển thị trên bản đồ chung.
          </p>
        </div>
      )}
    </div>
  );
}