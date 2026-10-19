import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getPickupVehicles, getAvailableDriversForPickup, createPickupTrip } from '../../services/pickupService';
import { MapPin, Truck, LogOut, Clock, Calendar, CheckCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function PartnerPickupPage() {
  const [orders, setOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('waiting'); // waiting, picking
  
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
      // Lấy TẤT CẢ đơn đã giao (delivered)
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });

      // Lấy thùng chờ thu (delivered, waiting_return) và đang thu (picking_up)
      const { data: boxData } = await supabase
        .from('boxes')
        .select('*')
        .in('status', ['delivered', 'waiting_return', 'picking_up']);

      const boxMap = {};
      (boxData || []).forEach(b => {
        if (!boxMap[b.order_id]) boxMap[b.order_id] = [];
        boxMap[b.order_id].push(b);
      });

      // Gom nhóm và phân loại trạng thái
      const processedOrders = (orderData || [])
        .map(o => {
          const boxes = boxMap[o.id] || [];
          const waitingBoxes = boxes.filter(b => ['delivered', 'waiting_return'].includes(b.status));
          const pickingBoxes = boxes.filter(b => b.status === 'picking_up');

          return {
            ...o,
            waiting_count: waitingBoxes.length,
            picking_count: pickingBoxes.length,
            box_ids: waitingBoxes.map(b => b.id) // Chỉ lấy ID thùng đang chờ
          };
        })
        .filter(o => o.waiting_count > 0 || o.picking_count > 0);

      setOrders(processedOrders);

      // Lấy xe và tài xế
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
        orderId: o.id,
        orderCode: o.order_code,
        lat: o.delivery_lat || 12.6662, // Dùng toạ độ GIAO HÀNG làm điểm thu
        lng: o.delivery_lng || 108.0382,
        address: o.delivery_address, // Dùng địa chỉ GIAO HÀNG làm điểm thu
        boxes: o.waiting_count,
        boxIds: o.box_ids,
      }));

      await createPickupTrip({
        vehicleId: selectedVehicle,
        driverId: selectedDriver,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: new Date().toTimeString().slice(0, 5),
        points,
        notes: 'Đối tác tạo chuyến thu hồi'
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

  // Lọc theo tab
  const filteredOrders = orders.filter(o => {
    if (activeTab === 'waiting') return o.waiting_count > 0;
    if (activeTab === 'picking') return o.picking_count > 0;
    return true;
  });

  // Lấy vị trí map (Dùng địa chỉ giao hàng)
  const mapCenter = orders.length > 0 
    ? [orders[0].delivery_lat || 12.6662, orders[0].delivery_lng || 108.0382]
    : [12.6662, 108.0382];

  if (loading) return <div className="p-20 text-center">Đang tải dữ liệu...</div>;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-agro-dark flex items-center gap-2">
              <Truck className="w-6 h-6" /> Đối tác thu hồi thùng
            </h1>
            <p className="text-gray-500 text-sm mt-1">Quản lý các điểm cần thu gom thùng rỗng</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 font-bold hover:text-red-800 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5" /> Đăng xuất
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm flex gap-2">
          {[
            { id: 'waiting', label: 'Chờ thu thùng', icon: Clock, count: orders.filter(o => o.waiting_count > 0).length },
            { id: 'picking', label: 'Đang thu thùng', icon: Truck, count: orders.filter(o => o.picking_count > 0).length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors ${
                activeTab === tab.id ? 'bg-agro-dark text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Nội dung chính: Chia 2 cột (Danh sách & Map) */}
        <div className="grid md:grid-cols-2 gap-6 h-[600px]">
          
          {/* Cột trái: Danh sách */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-y-auto">
            <div className="p-5 border-b border-gray-100 sticky top-0 bg-white z-10 flex justify-between items-center">
              <h2 className="font-bold text-agro-dark">Danh sách điểm</h2>
              {selectedOrders.length > 0 && activeTab === 'waiting' && (
                <button 
                  onClick={() => setShowModal(true)}
                  className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Tạo chuyến ({selectedOrders.length})
                </button>
              )}
            </div>
            
            <div className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <div className="p-10 text-center text-gray-500">Không có điểm nào.</div>
              ) : (
                filteredOrders.map(order => {
                  const isSelected = selectedOrders.find(o => o.id === order.id);
                  return (
                    <div 
                      key={order.id} 
                      className={`p-5 flex items-start gap-4 transition-colors cursor-pointer ${isSelected ? 'bg-agro-yellow/10' : 'hover:bg-gray-50'}`}
                      onClick={() => activeTab === 'waiting' && handleToggleOrder(order)}
                    >
                      {activeTab === 'waiting' && (
                        <input type="checkbox" checked={!!isSelected} readOnly className="w-5 h-5 mt-1 accent-agro-dark cursor-pointer" />
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-agro-dark">{order.order_code}</p>
                          {activeTab === 'picking' && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Đang thu</span>}
                        </div>
                        
                        {/* Địa chỉ giao hàng (Chính là điểm thu) */}
                        <p className="text-sm text-gray-600 flex items-start gap-1 mb-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          {order.delivery_address}
                        </p>

                        {/* Ngày giờ dự kiến thu */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Ngày giao: {order.send_date ? new Date(order.send_date).toLocaleDateString('vi-VN') : 'N/A'}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Dự kiến thu: {order.pickup_time || 'Trong ngày'}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500 font-medium mb-1">Cần thu</p>
                        <p className="font-bold text-yellow-600 text-lg">{order.waiting_count} thùng</p>
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
              
              {/* Vẽ các Marker điểm cần thu */}
              {filteredOrders.map(order => (
                <Marker 
                  key={order.id} 
                  position={[order.delivery_lat || 12.6662, order.delivery_lng || 108.0382]}
                >
                  <Popup>
                    <div className="font-sans">
                      <p className="font-bold text-agro-dark">{order.order_code}</p>
                      <p className="text-xs text-gray-600">{order.delivery_address}</p>
                      <p className="text-xs text-yellow-600 font-bold mt-1">{order.waiting_count} thùng cần thu</p>
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
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 font-bold">✕</button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">
                <p><span className="font-semibold">Số điểm:</span> {selectedOrders.length}</p>
                <p><span className="font-semibold">Tổng thùng:</span> {selectedOrders.reduce((sum, o) => sum + o.waiting_count, 0)}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Chọn xe thu hồi</label>
                <select 
                  value={selectedVehicle} 
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-agro-dark"
                >
                  <option value="">-- Chọn xe --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.plate_number} ({v.max_boxes || 30} thùng)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Chọn tài xế</label>
                <select 
                  value={selectedDriver} 
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-agro-dark"
                >
                  <option value="">-- Chọn tài xế --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} - {d.phone}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 hover:bg-white text-gray-700 font-bold py-2.5 rounded-xl transition-colors">Hủy</button>
              <button 
                onClick={handleCreateTrip} 
                disabled={creating || !selectedVehicle || !selectedDriver}
                className="flex-1 bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {creating ? 'Đang tạo...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}