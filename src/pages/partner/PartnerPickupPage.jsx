import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getOrdersNeedingPickup, getPickupVehicles, getAvailableDriversForPickup, createPickupTrip } from '../../services/pickupService';
import { MapPin, Truck, LogOut, Clock, Calendar, CheckCircle, X } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' });

export default function PartnerPickupPage() {
  const [orders, setOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State cho Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [creating, setCreating] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('isPartner') !== 'true') {
      navigate('/partner/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const orderData = await getOrdersNeedingPickup();
      setOrders(orderData);
      
      const vData = await getPickupVehicles();
      const dData = await getAvailableDriversForPickup();
      setVehicles(vData.filter(v => v.status === 'idle'));
      setDrivers(dData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOrder = (order) => {
    setSelectedOrders(prev => {
      const exists = prev.find(o => o.id === order.id);
      if (exists) return prev.filter(o => o.id !== order.id);
      return [...prev, order];
    });
  };

  const handleCreateTrip = async () => {
    if (selectedOrders.length === 0) return alert('Chọn ít nhất 1 điểm!');
    if (!selectedVehicle || !selectedDriver) return alert('Chọn xe và tài xế!');

    setCreating(true);
    try {
      const points = selectedOrders.map(o => ({
        orderId: o.id, orderCode: o.order_code,
        lat: o.delivery_lat || 12.6662, lng: o.delivery_lng || 108.0382,
        address: o.delivery_address,
        boxes: o.boxes_to_pickup, boxIds: o.box_ids,
      }));

      await createPickupTrip({
        vehicleId: selectedVehicle, driverId: selectedDriver,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: new Date().toTimeString().slice(0, 5),
        points, notes: 'Đối tác tạo chuyến thu hồi'
      });

      alert('Tạo chuyến thành công!');
      setShowModal(false);
      setSelectedOrders([]);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isPartner');
    navigate('/partner/login');
  };

  // Lấy tâm bản đồ từ đơn hàng đầu tiên
  const mapCenter = orders.length > 0 
    ? [orders[0].delivery_lat || 12.6662, orders[0].delivery_lng || 108.0382]
    : [12.6662, 108.0382];

  if (loading) return <div className="p-20 text-center">Đang tải dữ liệu...</div>;

  return (
    <div className="bg-gray-50 min-h-screen py-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-agro-dark flex items-center gap-2">
              <Truck className="w-6 h-6" /> Đối tác thu hồi thùng
            </h1>
            <p className="text-gray-500 text-sm mt-1">Danh sách điểm cần thu gom thùng rỗng</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 font-bold hover:text-red-800 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5" /> Đăng xuất
          </button>
        </div>

        {/* Layout chính: 1 Cột danh sách + 1 Cột Map */}
        <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          
          {/* Cột trái: Danh sách điểm */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-y-auto flex flex-col">
            <div className="p-5 border-b border-gray-100 sticky top-0 bg-white z-10 flex justify-between items-center">
              <h2 className="font-bold text-agro-dark text-lg">Điểm cần thu ({orders.length})</h2>
              {selectedOrders.length > 0 && (
                <button onClick={() => setShowModal(true)} className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-4 py-2 rounded-lg text-sm">
                  Tạo chuyến ({selectedOrders.length})
                </button>
              )}
            </div>
            
            <div className="flex-1 divide-y divide-gray-100">
              {orders.length === 0 ? (
                <div className="p-10 text-center text-gray-500">Không có điểm nào cần thu.</div>
              ) : (
                orders.map(order => {
                  const isSelected = selectedOrders.find(o => o.id === order.id);
                  return (
                    <div 
                      key={order.id} 
                      className={`p-5 flex items-start gap-4 transition-colors cursor-pointer ${isSelected ? 'bg-agro-yellow/10' : 'hover:bg-gray-50'}`}
                      onClick={() => handleToggleOrder(order)}
                    >
                      <input type="checkbox" checked={!!isSelected} readOnly className="w-5 h-5 mt-1 accent-agro-dark cursor-pointer" />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-agro-dark">{order.order_code}</p>
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-semibold">{order.product_type}</span>
                        </div>
                        
                        {/* Địa chỉ giao hàng (Chính là điểm thu) */}
                        <p className="text-sm text-gray-600 flex items-start gap-1 mb-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          {order.delivery_address}
                        </p>

                        {/* Thời gian dự kiến thu (Lấy từ ngày giao hàng) */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                          <Clock className="w-3 h-3" /> Dự kiến đến: <strong>{order.estimated_arrival}</strong>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500 font-medium mb-1">Cần thu</p>
                        <p className="font-bold text-yellow-600 text-lg">{order.boxes_to_pickup} thùng</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Cột phải: Map */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
            <MapContainer center={mapCenter} zoom={6} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>'
                url={`https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=0kgv1m784H4kd86re01y`}
              />
              
              {/* Vẽ Marker cho các điểm cần thu */}
              {orders.map(order => (
                <Marker 
                  key={order.id} 
                  position={[order.delivery_lat || 12.6662, order.delivery_lng || 108.0382]}
                >
                  <Popup>
                    <div className="font-sans">
                      <p className="font-bold text-agro-dark">{order.order_code}</p>
                      <p className="text-xs text-gray-600">{order.delivery_address}</p>
                      <p className="text-xs text-yellow-600 font-bold mt-1">{order.boxes_to_pickup} thùng cần thu</p>
                      <p className="text-xs text-blue-600 mt-1">Dự kiến: {order.estimated_arrival}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* MODAL TẠO CHUYẾN */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-agro-dark text-lg">Tạo chuyến thu hồi</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 font-bold"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">
                <p><span className="font-semibold">Số điểm:</span> {selectedOrders.length}</p>
                <p><span className="font-semibold">Tổng thùng:</span> {selectedOrders.reduce((sum, o) => sum + o.boxes_to_pickup, 0)}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Chọn xe thu hồi</label>
                <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-agro-dark">
                  <option value="">-- Chọn xe --</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number} ({v.max_boxes || 30} thùng)</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Chọn tài xế</label>
                <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-agro-dark">
                  <option value="">-- Chọn tài xế --</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name} - {d.phone}</option>)}
                </select>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 hover:bg-white text-gray-700 font-bold py-2.5 rounded-xl">Hủy</button>
              <button onClick={handleCreateTrip} disabled={creating || !selectedVehicle || !selectedDriver} className="flex-1 bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-2.5 rounded-xl disabled:opacity-50">{creating ? 'Đang tạo...' : 'Xác nhận'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}