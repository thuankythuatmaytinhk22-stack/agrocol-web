import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

export default function RouteMap({ points = [] }) {
  const [roadPath, setRoadPath] = useState([]);
  const [loadingRoute, setLoadingRoute] = useState(false);

  useEffect(() => {
    if (points.length < 2) return;

    const fetchRoute = async () => {
      setLoadingRoute(true);
      try {
        const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
        );
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const coordsArray = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
          setRoadPath(coordsArray);
        }
      } catch (err) {
        console.error('Lỗi OSRM:', err);
        setRoadPath(points.map((p) => [p.lat, p.lng]));
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchRoute();
  }, [points]);

  if (!points.length) return null;

  const center = [
    points.reduce((sum, p) => sum + p.lat, 0) / points.length,
    points.reduce((sum, p) => sum + p.lng, 0) / points.length,
  ];

  return (
    <div className="relative">
      {loadingRoute && (
        <div className="absolute top-3 right-3 z-[1000] bg-white px-3 py-2 rounded-xl shadow-md text-xs font-bold text-agro-dark">
          🚗 Đang tính đường đi...
        </div>
      )}
      <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-gray-200">
        <MapContainer center={center} zoom={6} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {roadPath.length > 0 && (
            <Polyline positions={roadPath} pathOptions={{ color: '#0F4C3A', weight: 5, opacity: 0.8 }} />
          )}

          {roadPath.length === 0 && (
            <Polyline
              positions={points.map((p) => [p.lat, p.lng])}
              pathOptions={{ color: '#0F4C3A', weight: 3, opacity: 0.6, dashArray: '8, 8' }}
            />
          )}

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
                      <p className="text-xs text-gray-600 mt-1">Mã đơn: {p.order.order_code}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}