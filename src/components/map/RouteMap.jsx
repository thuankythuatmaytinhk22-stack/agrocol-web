import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix lỗi icon marker mặc định của Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Icon tùy chỉnh cho từng loại điểm
const createIcon = (color, label) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color}; color:white; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; border:3px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export default function RouteMap({ points = [] }) {
  if (!points.length) return null;

  // Tính tâm bản đồ
  const center = [
    points.reduce((sum, p) => sum + p.lat, 0) / points.length,
    points.reduce((sum, p) => sum + p.lng, 0) / points.length,
  ];

  // Polyline path
  const polylinePath = points.map((p) => [p.lat, p.lng]);

  return (
    <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-gray-200">
      <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline
          positions={polylinePath}
          pathOptions={{ color: '#0F4C3A', weight: 3, opacity: 0.7, dashArray: '8, 8' }}
        />
        {points.map((p, i) => {
          const color = p.kind === 'hub' ? '#F4C542' : p.kind === 'pickup' ? '#4CAF50' : '#0F4C3A';
          const label = i + 1;
          return (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={createIcon(color, label)}>
              <Popup>
                <div className="font-sans">
                  <p className="font-bold text-agro-dark">{p.label}</p>
                  <p className="text-xs text-gray-500">
                    {p.kind === 'hub' ? 'Kho' : p.kind === 'pickup' ? 'Lấy hàng' : 'Giao hàng'} · Thứ tự #{label}
                  </p>
                  {p.product && (
                    <p className="text-xs mt-1">
                      <strong>{p.product.name}</strong> · Bảo quản {p.shelfHours}h
                    </p>
                  )}
                  {p.order && (
                    <p className="text-xs text-gray-600 mt-1">
                      Mã đơn: {p.order.order_code}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}