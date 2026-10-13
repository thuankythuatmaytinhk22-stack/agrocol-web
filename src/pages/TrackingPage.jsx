import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getOrderByCode,
  subscribeToOrder,
} from '../services/orderService';
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
  TrendingUp,
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

// Custom icon cho marker
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

  useEffect(() => {
    if (!orderCode) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const data = await getOrderByCode(orderCode);
        setOrder(data);

        // Lấy lịch sử nhiệt độ
        if (data) {
          setTempLoading(true);
          const tempData = await getOrderTemperatureHistory(data.id);
          setTempHistory(tempData);
          setTempLoading(false);
        }
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

  const currentStepIndex = steps.findIndex((s) => s.key === order?.status);

  if (loading) return <div className="text-center py-20">Đang tải...</div>;

  if (!orderCode) {
    return (
      <div className="bg-agro-bg min-h-screen py-20 flex flex-col items-center justify-center font-sans">
        <h1 className="text-3xl font-bold text-agro-dark mb-6">
          Theo dõi chuyến hàng
        </h1>
        <div className="flex gap-4 max-w-md w-full px-4">
          <input
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder="Nhập mã chuyến hàng (VD: AC-2026-00125)"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
          />
          <Link
            to={`/tracking/${searchCode}`}
            className="bg-agro-yellow text-agro-dark font-bold px-6 py-3 rounded-xl hover:bg-yellow-500"
          >
            Tìm
          </Link>
        </div>
      </div>
    );
  }

  if (!order)
    return <div className="text-center py-20 font-sans">Không tìm thấy đơn hàng!</div>;

  // Tính nhiệt độ hiện tại
  const latestTemp =
    tempHistory.length > 0 ? tempHistory[tempHistory.length - 1].temperature : null;
  const isTempSafe =
    latestTemp !== null && latestTemp >= TEMP_MIN && latestTemp <= TEMP_MAX;
  const hasWarningTemp = latestTemp !== null && !isTempSafe;

  // Điểm lấy hàng và giao hàng cho bản đồ
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

  const mapPoints = [pickupPoint, deliveryPoint];
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
              <p className="text-sm text-gray-400 font-semibold tracking-wide">
                MÃ CHUYẾN HÀNG
              </p>
              <h2 className="text-3xl font-extrabold text-agro-dark">
                {order.order_code}
              </h2>
              <p className="text-agro-dark font-semibold mt-1">
                {order.pickup_address} → {order.delivery_address}
              </p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-bold ${
                order.status === 'delivered'
                  ? 'bg-green-100 text-green-700'
                  : order.status === 'shipping'
                  ? 'bg-yellow-100 text-yellow-700'
                  : order.status === 'cancelled'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {order.status === 'delivered'
                ? 'Đã giao'
                : order.status === 'shipping'
                ? 'Đang vận chuyển'
                : order.status === 'cancelled'
                ? 'Đã hủy'
                : 'Đã đặt'}
            </span>
          </div>

          {/* Timeline */}
          <div className="flex justify-between items-center mb-10 relative">
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 z-0"></div>
            <div
              className="absolute top-5 left-0 h-1 bg-agro-dark z-0 transition-all duration-500"
              style={{
                width: `${(currentStepIndex / (steps.length - 1)) * 100}%`,
              }}
            ></div>
            {steps.map((step, i) => {
              const Icon = step.icon;
              const isActive = i <= currentStepIndex;
              return (
                <div key={step.key} className="flex flex-col items-center z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-agro-dark text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-xs mt-2 font-semibold ${
                      isActive ? 'text-agro-dark' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-agro-dark mb-4">
                Thông tin chuyến hàng
              </h3>
              <p className="text-sm text-gray-600 mb-4 font-medium">
                {order.product_type} | {order.weight} kg | {order.boxes} thùng
              </p>
              <button
                onClick={() => setShowDetail(true)}
                className="inline-flex items-center gap-2 border-2 border-agro-dark text-agro-dark font-bold px-6 py-2 rounded-xl hover:bg-agro-dark hover:text-white transition-colors"
              >
                <Eye className="w-5 h-5" /> XEM CHI TIẾT
              </button>
            </div>
            <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
              <div className="flex items-center gap-2 text-agro-dark font-bold mb-2">
                <Truck className="w-5 h-5" /> Tài xế:{' '}
                {order.driver_name || 'Nguyễn Văn A'}
              </div>
              <p className="text-sm text-gray-600 mb-1 font-medium">
                SĐT: {order.driver_phone || '+84905xxxxxxx'}
              </p>
              <div className="mt-4 pt-4 border-t border-green-200 flex items-center gap-2 text-agro-dark">
                <Thermometer className="w-5 h-5" />
                <span className="font-bold">
                  Nhiệt độ: {order.temperature || 15}°C (13-15°C)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* === NHIỆT ĐỘ HIỆN TẠI (chỉ hiển thị khi đang shipping) === */}
        {order.status === 'shipping' && (
          <div
            className={`rounded-2xl p-6 shadow-sm border-2 ${
              hasWarningTemp
                ? 'bg-red-50 border-red-200'
                : isTempSafe
                ? 'bg-green-50 border-green-200'
                : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-agro-dark flex items-center gap-2">
                <Thermometer className="w-5 h-5" />
                Nhiệt độ realtime
              </h3>
              {tempHistory.length > 0 && (
                <span className="text-xs text-gray-500 font-medium">
                  Cập nhật {formatRelativeTime(tempHistory[tempHistory.length - 1].created_at)}
                </span>
              )}
            </div>

            {tempLoading ? (
              <p className="text-center text-gray-500 text-sm py-4">
                Đang tải dữ liệu...
              </p>
            ) : latestTemp !== null ? (
              <div className="flex items-center gap-6">
                <div>
                  <p
                    className={`text-5xl font-extrabold ${
                      hasWarningTemp ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {latestTemp.toFixed(1)}°C
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">
                    Ngưỡng an toàn: {TEMP_MIN}–{TEMP_MAX}°C
                  </p>
                </div>
                <div className="flex-1">
                  {hasWarningTemp ? (
                    <div className="flex items-start gap-3 p-4 bg-red-100 rounded-xl border border-red-200">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-red-800 text-sm">
                          CẢNH BÁO NHIỆT ĐỘ
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          Nhiệt độ hiện tại {latestTemp.toFixed(1)}°C{' '}
                          {latestTemp > TEMP_MAX
                            ? 'vượt ngưỡng trên'
                            : 'dưới ngưỡng dưới'}{' '}
                          ({TEMP_MIN}–{TEMP_MAX}°C). Cần kiểm tra hệ thống làm lạnh!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 bg-green-100 rounded-xl border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-green-800 text-sm">
                          NHIỆT ĐỘ AN TOÀN
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Nhiệt độ đang trong ngưỡng cho phép. Hàng hóa được bảo
                          quản tốt.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-400 text-sm py-4 italic">
                Chưa có dữ liệu nhiệt độ cho chuyến hàng này.
              </p>
            )}
          </div>
        )}

        {/* === BẢN ĐỒ LỘ TRÌNH === */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-agro-dark mb-4 flex items-center gap-2">
            🗺️ Bản đồ lộ trình
          </h3>
          <div className="w-full h-[400px] rounded-xl overflow-hidden border border-gray-200">
            <MapContainer
              center={mapCenter}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'
                url={`https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=0kgv1m784H4kd86re01y`}
              />
              <Polyline
                positions={[
                  [pickupPoint.lat, pickupPoint.lng],
                  [deliveryPoint.lat, deliveryPoint.lng],
                ]}
                pathOptions={{
                  color: '#0F4C3A',
                  weight: 4,
                  opacity: 0.7,
                  dashArray: '8, 8',
                }}
              />
              <Marker
                position={[pickupPoint.lat, pickupPoint.lng]}
                icon={createIcon('#4CAF50', 'A')}
              >
                <Popup>
                  <div className="font-sans">
                    <p className="font-bold text-agro-dark">📍 Điểm lấy hàng</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {pickupPoint.label}
                    </p>
                  </div>
                </Popup>
              </Marker>
              <Marker
                position={[deliveryPoint.lat, deliveryPoint.lng]}
                icon={createIcon('#0F4C3A', 'B')}
              >
                <Popup>
                  <div className="font-sans">
                    <p className="font-bold text-agro-dark">🎯 Điểm giao hàng</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {deliveryPoint.label}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs font-medium text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-agro-green border border-white shadow"></span>
              Điểm lấy hàng
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-agro-dark border border-white shadow"></span>
              Điểm giao hàng
            </div>
          </div>
        </div>

        {/* === LỊCH SỬ NHIỆT ĐỘ === */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-agro-dark flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Lịch sử nhiệt độ từ lúc bắt đầu giao
            </h3>
            <span className="text-xs text-gray-500 font-medium">
              {tempHistory.length} điểm dữ liệu
            </span>
          </div>

          {tempLoading ? (
            <p className="text-center text-gray-400 py-6 text-sm">
              Đang tải lịch sử...
            </p>
          ) : tempHistory.length < 2 ? (
            <p className="text-center text-gray-400 py-6 text-sm italic">
              Chưa đủ dữ liệu để hiển thị biểu đồ.
            </p>
          ) : (
            <TempHistoryChart data={tempHistory} />
          )}
        </div>
      </div>

      {/* MODAL CHI TIẾT */}
      {showDetail && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-agro-dark">
                Chi tiết chuyến hàng
              </h3>
              <button
                onClick={() => setShowDetail(false)}
                className="text-gray-400 hover:text-agro-dark transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-green-50 rounded-2xl p-6 border border-green-100 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Tài xế</p>
                  <p className="font-bold text-agro-dark">
                    {order.driver_name || 'Nguyễn Văn A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Xe</p>
                  <p className="font-bold text-agro-dark">
                    Xe tải lạnh AgroCold
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">
                    Dự kiến giao
                  </p>
                  <p className="font-bold text-agro-dark">Trong ngày</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">
                    Trạng thái nhiệt độ
                  </p>
                  <p className="font-bold text-agro-green">
                    {isTempSafe ? 'Within Range' : 'Cần kiểm tra'} · 13–15°C
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDetail(false)}
              className="w-full mt-6 bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 rounded-xl transition-colors"
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// === COMPONENT BIỂU ĐỒ NHIỆT ĐỘ LỊCH SỬ ===
function TempHistoryChart({ data, minTemp = 13, maxTemp = 15 }) {
  if (!data || data.length < 2) return null;

  const temps = data.map((d) => d.temperature);
  const lo = Math.min(minTemp - 2, ...temps);
  const hi = Math.max(maxTemp + 3, ...temps);
  const w = 900;
  const h = 220;
  const pad = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const x = (i) => pad.left + (i / (data.length - 1)) * chartW;
  const y = (t) => pad.top + ((hi - t) / (hi - lo)) * chartH;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.temperature)}`)
    .join(' ');

  const safeY1 = y(maxTemp);
  const safeY2 = y(minTemp);

  // Tìm các điểm cảnh báo
  const warningPoints = data
    .map((d, i) => ({ ...d, i }))
    .filter((d) => d.temperature < minTemp || d.temperature > maxTemp);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56 min-w-[600px]">
        {/* Vùng an toàn */}
        <rect
          x={pad.left}
          y={safeY1}
          width={chartW}
          height={Math.max(2, safeY2 - safeY1)}
          fill="#4CAF50"
          opacity="0.08"
        />
        <line
          x1={pad.left}
          y1={safeY1}
          x2={w - pad.right}
          y2={safeY1}
          stroke="#4CAF50"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.6"
        />
        <line
          x1={pad.left}
          y1={safeY2}
          x2={w - pad.right}
          y2={safeY2}
          stroke="#4CAF50"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.6"
        />

        {/* Grid ngang */}
        {[lo, (lo + hi) / 2, hi].map((t, i) => (
          <g key={i}>
            <line
              x1={pad.left}
              y1={y(t)}
              x2={w - pad.right}
              y2={y(t)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={y(t) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#9ca3af"
              fontWeight="600"
            >
              {t.toFixed(0)}°
            </text>
          </g>
        ))}

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#0F4C3A"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Điểm cảnh báo */}
        {warningPoints.map((d) => (
          <g key={d.i}>
            <circle
              cx={x(d.i)}
              cy={y(d.temperature)}
              r="6"
              fill="#EF4444"
              stroke="#fff"
              strokeWidth="2"
            />
            <text
              x={x(d.i)}
              y={y(d.temperature) - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#EF4444"
              fontWeight="bold"
            >
              {d.temperature.toFixed(1)}°
            </text>
          </g>
        ))}

        {/* Trục X - thời gian */}
        {data.length > 1 &&
          [0, Math.floor(data.length / 2), data.length - 1].map((i) => (
            <text
              key={i}
              x={x(i)}
              y={h - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#9ca3af"
              fontWeight="600"
            >
              {new Date(data[i].created_at).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </text>
          ))}
      </svg>
    </div>
  );
}