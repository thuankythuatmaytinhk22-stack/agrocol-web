import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import useIoTSensor from '../../hooks/useIoTSensor';
import TempSparkline from '../../components/admin/TempSparkline';
import {
  getUnresolvedAlerts,
  resolveAlert,
  formatRelativeTime,
  formatTemp,
} from '../../services/iotService';
import {
  Activity,
  Thermometer,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  Bell,
  Zap,
  Snowflake,
  Package,
  MapPin,
  ArrowRight,
  Truck,
  X,
  Navigation, // Icon mới cho GPS
  Map,        // Icon mới cho bản đồ
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix icon Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function IoTPage() {
  const { latest, history, shippingOrders, status, loading, error, deviceId } =
    useIoTSensor();
  const [alerts, setAlerts] = useState([]);
  const [alertLoading, setAlertLoading] = useState(true);
  
  // State cho popup thông báo
  const [popupAlert, setPopupAlert] = useState(null);

  // State cho GPS
  const [gpsCoords, setGpsCoords] = useState(null);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  // Cập nhật tọa độ GPS mỗi khi có dữ liệu mới từ cảm biến
  useEffect(() => {
    if (latest && latest.gps_lat && latest.gps_lng) {
      setGpsCoords({ lat: latest.gps_lat, lng: latest.gps_lng });
    }
  }, [latest]);

  // Lắng nghe cảnh báo mới realtime
  useEffect(() => {
    const channel = supabase
      .channel('iot-alerts-popup')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'iot_alerts' },
        (payload) => {
          const newAlert = payload.new;
          setPopupAlert(newAlert);
          setTimeout(() => setPopupAlert(null), 8000);
          loadAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await getUnresolvedAlerts();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setAlerts([]);
    } finally {
      setAlertLoading(false);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await resolveAlert(alertId, 'admin');
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      if (popupAlert?.id === alertId) setPopupAlert(null);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Hàm giả lập lấy vị trí hiện tại (dùng khi test không có GPS thật)
  const handleGetCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          alert("Đã lấy vị trí hiện tại của bạn! (Lưu ý: Đây là vị trí trình duyệt, không phải của thiết bị IoT)");
        },
        (error) => {
          alert("Không thể lấy vị trí: " + error.message);
        }
      );
    } else {
      alert("Trình duyệt không hỗ trợ định vị.");
    }
  };

  const alertsByOrder = alerts.reduce((acc, alert) => {
    const key = alert.order_code || '__no_order__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(alert);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-agro-yellow border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 font-medium">Đang kết nối thiết bị IoT...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-3">
        <XCircle className="w-6 h-6 text-red-600 mt-0.5" />
        <div>
          <p className="font-bold text-red-800">Không thể kết nối thiết bị IoT</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5" />
        <div>
          <p className="font-bold text-amber-800">Chưa nhận được dữ liệu</p>
          <p className="text-sm text-amber-600 mt-1">
            Đảm bảo thiết bị ESP32-C3 đã kết nối WiFi và đang gửi dữ liệu lên Supabase.
          </p>
        </div>
      </div>
    );
  }

  const statusColor = {
    ideal: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-700',
      icon: CheckCircle,
    },
    too_high: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-700',
      icon: AlertTriangle,
    },
    too_low: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-700',
      icon: Snowflake,
    },
  }[status?.level || 'ideal'];

  const StatusIcon = statusColor.icon;
  const secondsAgo = Math.floor(
    (Date.now() - new Date(latest.created_at).getTime()) / 1000
  );
  const isLive = secondsAgo < 60 * 20;

  return (
    <div className="space-y-6 relative">
      
      {/* POPUP CẢNH BÁO */}
      {popupAlert && (
        <div className="fixed top-5 right-5 z-[9999] animate-slide-in">
          <div className={`w-96 p-5 rounded-2xl shadow-2xl border-l-8 ${
            popupAlert.severity === 'critical' 
              ? 'bg-red-50 border-red-600' 
              : 'bg-amber-50 border-amber-500'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  popupAlert.severity === 'critical' ? 'bg-red-100' : 'bg-amber-100'
                }`}>
                  <AlertTriangle className={`w-6 h-6 ${
                    popupAlert.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                  }`} />
                </div>
                <div>
                  <h4 className={`font-bold ${
                    popupAlert.severity === 'critical' ? 'text-red-800' : 'text-amber-800'
                  }`}>
                    {popupAlert.severity === 'critical' ? 'CẢNH BÁO NGHIÊM TRỌNG' : 'CẢNH BÁO NHIỆT ĐỘ'}
                  </h4>
                  <p className="text-sm text-gray-700 mt-1 font-medium">
                    {popupAlert.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Nhiệt độ hiện tại: <strong>{popupAlert.temperature?.toFixed(1)}°C</strong>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setPopupAlert(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => handleResolveAlert(popupAlert.id)}
                className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold py-2 rounded-lg"
              >
                Đã xử lý
              </button>
              <Link 
                to="/admin/iot"
                className={`flex-1 text-center text-xs font-bold py-2 rounded-lg text-white ${
                  popupAlert.severity === 'critical' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                Xem chi tiết
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-agro-dark flex items-center gap-2">
            <Activity className="w-6 h-6" />
            Giám sát Nhiệt độ IoT
          </h2>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}
            ></span>
            Thiết bị: <strong>{deviceId}</strong> ·{' '}
            {isLive ? 'Đang hoạt động' : 'Không hoạt động'} ·{' '}
            <strong>{shippingOrders.length}</strong> đơn đang giao
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 font-medium">Cập nhật</p>
          <p className="text-sm font-bold text-agro-dark">
            {formatRelativeTime(latest.created_at)}
          </p>
        </div>
      </div>

      {/* Main temperature card */}
      <div
        className={`${statusColor.bg} ${statusColor.border} border-2 rounded-2xl p-8 relative overflow-hidden`}
      >
        <div className="grid md:grid-cols-3 gap-6 relative z-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-12 h-12 ${statusColor.badge} rounded-xl flex items-center justify-center`}
              >
                <Thermometer className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Nhiệt độ hiện tại
                </p>
                <p className="text-sm text-gray-500">Ngưỡng an toàn: 13–15°C</p>
              </div>
            </div>
            <div className="flex items-end gap-4">
              <p
                className={`text-7xl font-extrabold ${statusColor.text} leading-none`}
              >
                {formatTemp(latest.temperature)}
              </p>
              <div className="mb-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusColor.badge}`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {status?.label || 'An toàn'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-white/60 backdrop-blur rounded-xl p-3">
              <p className="text-xs text-gray-500 font-semibold mb-1">Chế độ</p>
              <p className="font-bold text-agro-dark text-sm flex items-center gap-1.5">
                {latest.mode === 1 ? (
                  <>
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Đo thực tế
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-blue-500" />
                    Mô phỏng
                  </>
                )}
              </p>
            </div>
            <div className="bg-white/60 backdrop-blur rounded-xl p-3">
              <p className="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                WiFi RSSI
              </p>
              <p className="font-bold text-agro-dark text-sm">
                {latest.wifi_rssi || '--'} dBm
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* === BẢN ĐỒ GPS REALTIME === */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-agro-dark flex items-center gap-2">
            <Map className="w-5 h-5" /> Vị trí GPS Realtime
          </h3>
          <button 
            onClick={handleGetCurrentLocation}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" /> Lấy vị trí hiện tại
          </button>
        </div>

        {gpsCoords ? (
          <div className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-xl text-sm flex justify-between items-center">
              <span className="text-gray-500 font-medium">Tọa độ hiện tại:</span>
              <span className="font-bold text-agro-dark font-mono">
                {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}
              </span>
            </div>
            <div className="h-[400px] w-full rounded-xl overflow-hidden border border-gray-200">
              <MapContainer center={[gpsCoords.lat, gpsCoords.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'
                  url={`https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=0kgv1m784H4kd86re01y`}
                />
                <Marker position={[gpsCoords.lat, gpsCoords.lng]}>
                  <Popup>
                    <div className="font-sans text-center">
                      <p className="font-bold text-agro-dark">{deviceId}</p>
                      <p className="text-xs text-gray-500">Đang ở đây</p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">Chưa có dữ liệu GPS từ thiết bị.</p>
            <p className="text-xs text-gray-400 mt-1">Vui lòng kiểm tra kết nối module LC78G.</p>
            <button 
              onClick={handleGetCurrentLocation}
              className="mt-4 bg-agro-dark hover:bg-agro-dark/90 text-white font-bold px-4 py-2 rounded-xl text-sm"
            >
              Dùng vị trí của tôi để test
            </button>
          </div>
        )}
      </div>

      {/* Shipping orders */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-agro-dark flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Đơn hàng đang vận chuyển ({shippingOrders.length})
          </h3>
          {shippingOrders.length > 0 && (
            <Link
              to="/admin/orders"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              Quản lý đơn <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {shippingOrders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">
              Không có đơn hàng nào đang vận chuyển.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shippingOrders.map((order) => {
              const tempStatus = order.latest_temp
                ? getTemperatureStatusFromTemp(order.latest_temp)
                : null;
              const isWarning = tempStatus && tempStatus.level !== 'ideal';
              const orderAlerts = alertsByOrder[order.order_code] || [];

              return (
                <Link
                  key={order.id}
                  to={`/tracking/${order.order_code}`}
                  className={`block p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                    isWarning
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-gray-100 hover:border-agro-yellow'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-agro-dark flex-shrink-0" />
                        <p className="font-bold text-agro-dark">
                          {order.order_code}
                        </p>
                        {isWarning && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            CẢNH BÁO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {order.pickup_address} → {order.delivery_address}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.customer_name} · {order.product_type} ·{' '}
                        {order.boxes} thùng
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500 font-semibold mb-1">
                        Nhiệt độ
                      </p>
                      {order.latest_temp ? (
                        <>
                          <p
                            className={`text-2xl font-extrabold ${
                              isWarning ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {order.latest_temp.toFixed(1)}°C
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {formatRelativeTime(order.temp_updated_at)}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 italic">
                          Chưa có dữ liệu
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-agro-green"></div>
            <span className="text-xs text-gray-500 font-semibold">Min</span>
          </div>
          <p className="text-2xl font-extrabold text-agro-dark">13.0°C</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-gray-500 font-semibold">Max</span>
          </div>
          <p className="text-2xl font-extrabold text-agro-dark">15.0°C</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs text-gray-500 font-semibold">
              Số mẫu 6h
            </span>
          </div>
          <p className="text-2xl font-extrabold text-agro-dark">
            {history.length}
          </p>
        </div>
        <div
          className={`rounded-2xl p-4 border shadow-sm ${
            alerts.length > 0
              ? 'bg-red-50 border-red-100'
              : 'bg-white border-gray-100'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className={`w-3 h-3 rounded-full ${
                alerts.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-gray-300'
              }`}
            ></div>
            <span className="text-xs text-gray-500 font-semibold">
              Cảnh báo
            </span>
          </div>
          <p
            className={`text-2xl font-extrabold ${
              alerts.length > 0 ? 'text-red-600' : 'text-agro-dark'
            }`}
          >
            {alerts.length}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-agro-dark flex items-center gap-2">
            📈 Biểu đồ nhiệt độ 6 giờ qua
          </h3>
          <span className="text-xs text-gray-500 font-medium">
            {history.length} điểm
          </span>
        </div>
        <TempSparkline data={history} minTemp={13} maxTemp={15} />
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-agro-dark flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Cảnh báo chưa xử lý ({alerts.length})
          </h3>
        </div>

        {alertLoading ? (
          <p className="text-center text-gray-400 py-6 text-sm">Đang tải...</p>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">
              Không có cảnh báo nào. Mọi thứ đang hoạt động tốt!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(alertsByOrder).map(([orderCode, orderAlerts]) => (
              <div
                key={orderCode}
                className="border border-red-200 rounded-xl overflow-hidden"
              >
                <div className="bg-red-50 px-4 py-3 border-b border-red-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {orderCode === '__no_order__' ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <p className="font-bold text-amber-800 text-sm">
                          Cảnh báo chung
                        </p>
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4 text-red-600" />
                        <p className="font-bold text-red-800 text-sm">
                          Đơn {orderCode}
                        </p>
                        <span className="bg-red-200 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {orderAlerts.length} cảnh báo
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-red-100">
                  {orderAlerts.map((alert) => {
                    const isCritical = alert.severity === 'critical';
                    return (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-3 p-4 ${
                          isCritical ? 'bg-red-50/50' : 'bg-amber-50/50'
                        }`}
                      >
                        <AlertTriangle
                          className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            isCritical ? 'text-red-600' : 'text-amber-600'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-bold text-sm ${
                              isCritical ? 'text-red-800' : 'text-amber-800'
                            }`}
                          >
                            {alert.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelativeTime(alert.created_at)}
                            </span>
                            <span>
                              Nhiệt độ:{' '}
                              <strong>{alert.temperature?.toFixed(1)}°C</strong>
                            </span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="bg-white hover:bg-gray-50 text-agro-dark text-xs font-bold px-3 py-2 rounded-lg border border-gray-200 flex-shrink-0 transition-colors"
                        >
                          Đã xử lý
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function
function getTemperatureStatusFromTemp(temp) {
  if (temp >= 13.0 && temp <= 15.0) return { level: 'ideal', label: 'An toàn' };
  if (temp > 15.0) return { level: 'too_high', label: 'Quá cao' };
  return { level: 'too_low', label: 'Quá thấp' };
}