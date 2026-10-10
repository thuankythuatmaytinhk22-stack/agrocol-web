import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

function RecenterMap({ lat, lng }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }, [lat, lng, map]);
  return null;
}

export default function LocationPicker({ value, onChange, label = 'Chọn vị trí' }) {
  const [position, setPosition] = useState(
    value?.lat && value?.lng ? [value.lat, value.lng] : [12.6662, 108.0382]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);
  const selectingRef = useRef(false);

  const handlePick = (lat, lng, address = null) => {
    setPosition([lat, lng]);
    const data = { lat, lng };
    if (address) data.address = address;
    onChange(data);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (selectingRef.current) return;

      setSearching(true);
      try {
        const res = await fetch(
          `${window.location.origin}/api/trackasia?text=${encodeURIComponent(searchQuery)}`
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setSuggestions(data.slice(0, 8));
          setShowDropdown(true);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Lỗi search:', err);
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const handleSelectSuggestion = (s) => {
    selectingRef.current = true;
    setShowDropdown(false);
    setSuggestions([]);

    if (s.lat && s.lng) {
      // Dùng `label` (địa chỉ đầy đủ) nếu có, fallback về `name`
      const displayAddress = s.label || s.name;
      handlePick(parseFloat(s.lat), parseFloat(s.lng), displayAddress);
      setSearchQuery(displayAddress);
    }

    setTimeout(() => {
      selectingRef.current = false;
    }, 500);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-agro-dark">{label}</label>

      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && !selectingRef.current && setShowDropdown(true)}
          placeholder="Tìm địa chỉ (VD: 43 Diên Hồng, Đà Nẵng)"
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
            Đang tìm...
          </div>
        )}

        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[1000] max-h-72 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectSuggestion(s)}
                className="w-full text-left px-4 py-3 hover:bg-green-50 border-b border-gray-50 last:border-0 transition-colors flex items-start gap-3"
              >
                <span className="text-agro-dark mt-0.5 flex-shrink-0">📍</span>
                <div className="flex-1 min-w-0">
                  {/* Tên ngắn - dòng 1 */}
                  <p className="text-sm font-bold text-agro-dark truncate">
                    {s.name}
                  </p>
                  {/* Địa chỉ đầy đủ - dòng 2 */}
                  {s.label && s.label !== s.name && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {s.label}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-full h-[300px] rounded-xl overflow-hidden border border-gray-200">
        <MapContainer center={position} zoom={6} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'
            url={`https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=0kgv1m784H4kd86re01y`}
          />
          <ClickHandler onPick={handlePick} />
          <RecenterMap lat={position[0]} lng={position[1]} />
          <Marker position={position} />
        </MapContainer>
      </div>

      {value?.lat && value?.lng && (
        <p className="text-xs text-gray-500 font-medium">
          📍 Tọa độ: {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
        </p>
      )}
      <p className="text-xs text-gray-400 italic">
        💡 Gõ địa chỉ để xem gợi ý, hoặc click trực tiếp trên bản đồ
      </p>
    </div>
  );
}