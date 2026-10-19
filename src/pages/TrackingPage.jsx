import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrderByCode, subscribeToOrder } from '../services/orderService';
import {
  getOrderTemperatureHistory,
  formatRelativeTime,
  TEMP_MIN,
  TEMP_MAX,
} from '../services/iotService';
import {
  Package,
  Truck,
  CheckCircle,
  MapPin,
  Thermometer,
  X,
  Eye,
  AlertTriangle,
  Clock,
  Calendar,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createIcon = (color, label) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color}; color:white; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; border:3px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export default function TrackingPage() {
  const { orderCode } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState(orderCode || '');
  const [showDetail, setShowDetail] = useState(false);
  const [tempHistory, setTempHistory] = useState([]);
  const [tempLoading, setTempLoading] = useState(false);
  
  // State cho bản đồ
  const [roadPath, setRoadPath] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    if (!orderCode) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const data = await getOrderByCode(orderCode);
        setOrder(data);

        if (data) {
          setTempLoading(true);
          const tempData = await getOrderTemperatureHistory(data.id);
          setTempHistory(tempData);
          setTempLoading(false);
        }
      } catch (err) {
        console.error('Lỗi fetch order:', err);
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

  // Lấy đường đi thực tế từ OSRM
  useEffect(() => {
    if (!order) return;
    const pickupLat = order.pickup_lat;
    const pickupLng = order.pickup_lng;
    const deliveryLat = order.delivery_lat;
    const deliveryLng = order.delivery_lng;

    if (!pickupLat || !pickupLng || !deliveryLat || !deliveryLng) return;

    const fetchRoute = async () => {
      setRouteLoading(true);
      try {
        const coords = `${pickupLng},${pickupLat};${deliveryLng},${deliveryLat}`;
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
        );
        const data = await res.json();
        
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const coordsArray = route.geometry.coordinates.map((c) => [c[1], c[0]]);
          setRoadPath(coordsArray);
          setRouteInfo({
            distance: (route.distance / 1000).toFixed(1), // km
            duration: Math.round(route.duration / 60), // phút (di chuyển thuần)
          });
        }
      } catch (err) {
        console.error('Lỗi OSRM:', err);
        setRoadPath([
          [pickupLat, pickupLng],
          [deliveryLat, deliveryLng],
        ]);
      } finally {
        setRouteLoading(false);
      }
    };
    fetchRoute();
  }, [order]);

  const steps = [
    { key: 'pending', label: 'Đã đặt', icon: Package },
    { key: 'packed', label: 'Đã đóng hàng', icon: Package },
    { key: 'shipping', label: 'Đang vận chuyển', icon: Truck },
    { key: 'delivered', label: 'Đã giao', icon: MapPin },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === order?.status);

  // Hàm tính toán thời gian đến chi tiết
  const getEstimatedArrival = () => {
    if (!order) return null;
    if (order.status === 'delivered') return 'Đã giao thành công';
    
    if (routeInfo) {
      const distance = parseFloat(routeInfo.distance);
      
      // 1. Thời gian di chuyển (Vận tốc 45km/h)
      const travelHours = distance / 45;
      
      // 2. Thời gian chất hàng (Giả định 1 xe = 1 tiếng)
      const numVehicles = Math.ceil((order.boxes || 0) / 12) || 1;
      const loadingHours = numVehicles * 1;
      
      // 3. Thời gian dự phòng (nghỉ ngơi, kẹt xe) = 1 tiếng
      const bufferHours = 1;
      
      const totalHours = travelHours + loadingHours + bufferHours;
      
      // Tạo đối tượng Date từ ngày và giờ đặt hàng
      const startDateStr = order.send_date || new Date().toISOString().split('T')[0];
      const startTimeStr = order.pickup_time || '08:00';
      const startDateTime = new Date(`${startDateStr}T${startTimeStr}:00`);
      
      // Cộng thêm tổng thời gian
      const arrivalDateTime = new Date(startDateTime.getTime() + totalHours * 60 * 60 * 1000);
      
      // Định dạng: Thứ X, DD/MM/YYYY lúc HH:mm
      return arrivalDateTime.toLocaleString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    
    return 'Đang tính toán...';
  };

  if (loading) return <div className="text-center py-20 font-sans">Đang tải...</div>;

  if (!orderCode) {
    return (
      <div className="bg-agro-bg min-h-screen py-20 flex flex-col items-center justify-center font-sans">
        <h1 className="text-3xl font-bold text-agro-dark mb-6">Theo dõi chuyến hàng</h1>
        <div className="flex gap-4 max-w-md w-full px-4">
          <input
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Nhập mã chuyến hàng (VD: AC-2026-00125)"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
          />
          <Link to={`/tracking/${searchCode}`} className="bg-agro-yellow text-agro-dark font-bold px-6 py-3 rounded-xl hover:bg-yellow-500">
            Tìm
          </Link>
        </div>
      </div>
    );
  }

  if (!order) return <div className="text-center py-20 font-sans">Không tìm thấy đơn hàng!</div>;

  const latestOrderTemp = tempHistory.length > 0 ? tempHistory[tempHistory.length - 1] : null;
  const isTempSafe = latestOrderTemp ? (latestOrderTemp.temperature >= TEMP_MIN && latestOrderTemp.temperature <= TEMP_MAX) : true;
  const hasWarningTemp = latestOrderTemp ? !isTempSafe : false;

  const pickupPoint = {
    lat: order.pickup_lat || 12.6662,
    lng: order.pickup_lng || 108.0382,
    label: order.pickup_address || 'Điểm lấy hàng',
  };
  const deliveryPoint = {
    lat: order.delivery_lat || 10.7769,
    lng: order.delivery_lng || 106.7009,
    label: order.delivery_address || 'Điểm giao hàng',
  };
  const mapCenter = [
    (pickupPoint.lat + deliveryPoint.lat) / 2,
    (pickupPoint.lng + deliveryPoint.lng) / 2,
  ];

  return (
    <div className="bg-agro-bg min-h-screen py-12 font-sans">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* === THÔNG TIN ĐƠN HÀNG === */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-sm text-gray-400 font-semibold tracking-wide">MÃ CHUYẾN HÀNG</p>
              <h2 className="text-3xl font-extrabold text-agro-dark">{order.order_code}</h2>
              <p className="text-agro-dark font-semibold mt-1">
                {order.pickup_address} → {order.delivery_address}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${
              order.status === 'delivered' ? 'bg-green-100 text-green-700'
              : order.status === 'shipping' ? 'bg-yellow-100 text-yellow-700'
              : order.status === 'cancelled' ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700'
            }`}>
              {order.status === 'delivered' ? 'Đã giao'
              : order.status === 'shipping' ? 'Đang vận chuyển'
              : order.status === 'cancelled' ? 'Đã hủy'
              : 'Đã đặt'}
            </span>
          </div>

          {/* Timeline */}
          <div className="flex justify-between items-center mb-10 relative">
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 z-0"></div>
            <div className="absolute top-5 left-0 h-1 bg-agro-dark z-0 transition-all duration-500"
              style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            ></div>
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isActive = i <= currentStepIndex;
              return (
                <div key={step.key} className="flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isActive ? 'bg-agro-dark text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 font-semibold ${isActive ? 'text-agro-dark' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-agro-dark mb-4">Thông tin chuyến hàng</h3>
              <p className="text-sm text-gray-600 mb-1 font-medium">
                {order.product_type} | {order.weight} kg | {order.boxes} thùng
              </p>
              
              <div className="space-y-2 mt-3 mb-6">
                {order.send_date && (
                  <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Ngày gửi: {new Date(order.send_date).toLocaleDateString('vi-VN')}</span>
                  </p>
                )}
                {order.pickup_time && (
                  <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>Giờ đặt: {order.pickup_time}</span>
                  </p>
                )}
                {/* KHỐI HIỂN THỊ GIỜ DỰ KIẾN ĐẾN CHI TIẾT */}
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 mt-2">
                  <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Dự kiến đến</p>
                  <p className="text-sm text-green-700 font-bold flex items-start gap-2">
                    <Truck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{getEstimatedArrival()}</span>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1 italic">
                    * Đã bao gồm giờ chất hàng, di chuyển và dự phòng
                  </p>
                </div>
              </div>

              <button onClick={() => setShowDetail(true)} className="inline-flex items-center gap-2 border-2 border-agro-dark text-agro-dark font-bold px-6 py-2 rounded-xl hover:bg-agro-dark hover:text-white transition-colors">
                <Eye className="w-5 h-5" /> XEM CHI TIẾT
              </button>
            </div>
            
            <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
              <div className="flex items-center gap-2 text-agro-dark font-bold mb-2">
                <Truck className="w-5 h-5" /> Tài xế: {order.driver_name || 'Nguyễn Văn A'}
              </div>
              <p className="text-sm text-gray-600 mb-1 font-medium">SĐT: {order.driver_phone || '+84905xxxxxxx'}</p>
              <div className="mt-4 pt-4 border-t border-green-200 flex items-center gap-2 text-agro-dark">
                <Thermometer className="w-5 h-5" />
                <span className="font-bold">
                  Nhiệt độ: {latestOrderTemp ? latestOrderTemp.temperature.toFixed(1) : '--'}°C
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* === NHIỆT ĐỘ REALTIME === */}
        {order.status === 'shipping' && (
          <div className={`rounded-2xl p-6 shadow-sm border-2 ${
            hasWarningTemp ? 'bg-red-50 border-red-200'
            : isTempSafe && latestOrderTemp ? 'bg-green-50 border-green-200'
            : 'bg-white border-gray-100'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-agro-dark flex items-center gap-2">
                <Thermometer className="w-5 h-5" /> Nhiệt độ realtime
              </h3>
              {latestOrderTemp && (
                <span className="text-xs text-gray-500 font-medium">
                  Cập nhật {formatRelativeTime(latestOrderTemp.created_at)}
                </span>
              )}
            </div>

            {tempLoading ? (
              <p className="text-center text-gray-500 text-sm py-4">Đang tải dữ liệu...</p>
            ) : latestOrderTemp ? (
              <div className="flex items-center gap-6">
                <div>
                  <p className={`text-5xl font-extrabold ${hasWarningTemp ? 'text-red-600' : 'text-green-600'}`}>
                    {latestOrderTemp.temperature.toFixed(1)}°C
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Ngưỡng an toàn: {TEMP_MIN}–{TEMP_MAX}°C</p>
                </div>
                <div className="flex-1">
                  {hasWarningTemp ? (
                    <div className="flex items-start gap-3 p-4 bg-red-100 rounded-xl border border-red-200">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-red-800 text-sm">CẢNH BÁO NHIỆT ĐỘ</p>
                        <p className="text-xs text-red-700 mt-1">
                          Nhiệt độ hiện tại {latestOrderTemp.temperature.toFixed(1)}°C vượt ngưỡng ({TEMP_MIN}–{TEMP_MAX}°C). Cần kiểm tra hệ thống làm lạnh!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 bg-green-100 rounded-xl border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-green-800 text-sm">NHIỆT ĐỘ AN TOÀN</p>
                        <p className="text-xs text-green-700 mt-1">Nhiệt độ đang trong ngưỡng cho phép. Hàng hóa được bảo quản tốt.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 italic">Chưa có dữ liệu nhiệt độ cho chuyến hàng này.</p>
                <p className="text-xs text-gray-400 mt-2">Dữ liệu sẽ xuất hiện khi thiết bị IoT gửi mẫu đầu tiên.</p>
              </div>
            )}
          </div>
        )}

        {/* === BẢN ĐỒ LỘ TRÌNH === */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-agro-dark flex items-center gap-2">🗺️ Bản đồ lộ trình</h3>
            {routeInfo && (
              <div className="flex items-center gap-4 text-xs font-semibold text-gray-600">
                <span className="flex items-center gap-1">📏 {routeInfo.distance} km</span>
                <span className="flex items-center gap-1">⏱️ {routeInfo.duration} phút di chuyển</span>
              </div>
            )}
          </div>

          <div className="w-full h-[450px] rounded-xl overflow-hidden border border-gray-200">
            <MapContainer center={mapCenter} zoom={6} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'
                url={`https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=0kgv1m784H4kd86re01y`}
              />
              {roadPath.length > 0 && (
                <Polyline positions={roadPath} pathOptions={{ color: '#0F4C3A', weight: 5, opacity: 0.8 }} />
              )}
              {roadPath.length === 0 && (
                <Polyline
                  positions={[[pickupPoint.lat, pickupPoint.lng], [deliveryPoint.lat, deliveryPoint.lng]]}
                  pathOptions={{ color: '#0F4C3A', weight: 3, opacity: 0.6, dashArray: '8, 8' }}
                />
              )}
              <Marker position={[pickupPoint.lat, pickupPoint.lng]} icon={createIcon('#4CAF50', 'A')}>
                <Popup>
                  <div className="font-sans">
                    <p className="font-bold text-agro-dark">📍 Điểm lấy hàng</p>
                    <p className="text-xs text-gray-600 mt-1">{pickupPoint.label}</p>
                  </div>
                </Popup>
              </Marker>
              <Marker position={[deliveryPoint.lat, deliveryPoint.lng]} icon={createIcon('#0F4C3A', 'B')}>
                <Popup>
                  <div className="font-sans">
                    <p className="font-bold text-agro-dark">🎯 Điểm giao hàng</p>
                    <p className="text-xs text-gray-600 mt-1">{deliveryPoint.label}</p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      </div>

      {/* MODAL CHI TIẾT */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-agro-dark">Chi tiết chuyến hàng</h3>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-agro-dark transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-green-50 rounded-2xl p-6 border border-green-100 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Tài xế</p>
                  <p className="font-bold text-agro-dark">{order.driver_name || 'Nguyễn Văn A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Xe</p>
                  <p className="font-bold text-agro-dark">Xe tải lạnh AgroCold</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 font-medium">Dự kiến giao</p>
                  <p className="font-bold text-green-700">{getEstimatedArrival()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 font-medium">Trạng thái nhiệt độ</p>
                  <p className={`font-bold ${isTempSafe ? 'text-agro-green' : 'text-red-600'}`}>
                    {isTempSafe ? 'Within Range' : 'Cần kiểm tra'} · {TEMP_MIN}–{TEMP_MAX}°C
                  </p>
                </div>
              </div>
            </div>
            <button onClick={() => setShowDetail(false)} className="w-full mt-6 bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 rounded-xl transition-colors">
              ĐÓNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}