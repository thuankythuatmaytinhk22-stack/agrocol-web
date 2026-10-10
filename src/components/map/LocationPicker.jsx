import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix icon marker
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component bắt sự kiện click trên bản đồ
function ClickHandler({ onPick }) {
  useMapEvents({
    click: (e) => {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component để di chuyển bản đồ khi tọa độ thay đổi
function RecenterMap({ lat, lng }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function LocationPicker({ value, onChange, label = 'Chọn vị trí' }) {
  const [position, setPosition] = useState(
    value?.lat && value?.lng ? [value.lat, value.lng] : [12.6662, 108.0382] // Mặc định Buôn Ma Thuột
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const handlePick = (lat, lng) => {
    setPosition([lat, lng]);
    onChange({ lat, lng });
  };

  // Tìm kiếm địa chỉ bằng Nominatim (OpenStreetMap)
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&countrycodes=vn`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        handlePick(parseFloat(lat), parseFloat(lon));
        onChange({ lat: parseFloat(lat), lng: parseFloat(lon), address: display_name });
      } else {
        alert('Không tìm thấy địa chỉ này. Bạn thử click trực tiếp trên bản đồ nhé!');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi tìm kiếm địa chỉ');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-agro-dark">{label}</label>

      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
          placeholder="Tìm địa chỉ (VD: Chợ Bình Điền, TP.HCM)"
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="bg-agro-dark hover:bg-agro-dark/90 text-white font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-50"
        >
          {searching ? '...' : 'Tìm'}
        </button>
      </div>

      {/* Map */}
      <div className="w-full h-[300px] rounded-xl overflow-hidden border border-gray-200">
        <MapContainer
          center={position}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <ClickHandler onPick={handlePick} />
          <RecenterMap lat={position[0]} lng={position[1]} />
          <Marker position={position} />
        </MapContainer>
      </div>

      {/* Hiển thị tọa độ */}
      {value?.lat && value?.lng && (
        <p className="text-xs text-gray-500 font-medium">
          📍 Tọa độ: {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
        </p>
      )}
      <p className="text-xs text-gray-400 italic">
        💡 Click trực tiếp trên bản đồ hoặc tìm địa chỉ để chọn vị trí chính xác
      </p>
    </div>
  );
}