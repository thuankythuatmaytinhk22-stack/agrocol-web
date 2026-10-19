import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getOrdersNeedingPickup, getPickupVehicles, getAvailableDriversForPickup, createPickupTrip } from '../../services/pickupService';
import { MapPin, Truck, LogOut, Clock, CheckCircle, X, Plus, Users, Edit, Trash2, Home } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' });

export default function PartnerPickupPage() {
  const [activeTab, setActiveTab] = useState('dispatch'); // 'dispatch' | 'moving' | 'vehicles' | 'drivers'
  
  const [orders, setOrders] = useState([]);
  const [movingOrders, setMovingOrders] = useState([]); // Đơn đang thu hồi
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [defaultPartnerId, setDefaultPartnerId] = useState(null);

  // State cho Modal Phân công
  const [showModal, setShowModal] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [creating, setCreating] = useState(false);

  // State cho Modal Thêm/Sửa
  const [showFleetModal, setShowFleetModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [savingFleet, setSavingFleet] = useState(false);
  const [formData, setFormData] = useState({
    plate_number: '', capacity_boxes: 30, status: 'idle', notes: '',
    name: '', phone: '', license_number: '', years_experience: 0, favorite_routes_text: '',
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('isPartner') !== 'true') {
      navigate('/partner/login');
      return;
    }
    fetchPartnerId();
    fetchData();
  }, []);

  const fetchPartnerId = async () => {
    const { data } = await supabase.from('partners').select('id').limit(1).maybeSingle();
    if (data) setDefaultPartnerId(data.id);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Lấy đơn chờ thu (chưa phân công)
      const orderData = await getOrdersNeedingPickup();
      setOrders(orderData);

      // Lấy đơn đang thu hồi (đã phân công, đang picking_up)
      const { data: movingData } = await supabase
        .from('orders')
        .select('*, boxes(*), pickup_trip_points(*)')
        .eq('status', 'delivered'); // Vẫn là delivered nhưng thùng đang picking_up
      
      // Lọc những đơn có thùng picking_up
      const activeMoving = (movingData || []).filter(o => 
        o.boxes.some(b => b.status === 'picking_up')
      ).map(o => {
        const pickingBoxes = o.boxes.filter(b => b.status === 'picking_up');
        return {
          ...o,
          picking_count: pickingBoxes.length,
          trip_info: o.pickup_trip_points[0] || null // Lấy thông tin chuyến nếu có
        };
      });
      setMovingOrders(activeMoving);
      
      const vData = await getPickupVehicles();
      const dData = await getAvailableDriversForPickup();
      setVehicles(vData);
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
        boxes: o.waiting_count, boxIds: o.box_ids,
      }));

      await createPickupTrip({
        vehicleId: selectedVehicle, driverId: selectedDriver,
        points, notes: 'Đối tác tạo chuyến thu hồi'
      });

      alert('Tạo chuyến thành công! Chuyển sang tab Đang thu hồi.');
      setShowModal(false);
      setSelectedOrders([]);
      setActiveTab('moving'); // Tự động chuyển tab
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // HÀM CẬP NHẬT ĐÃ THU HỒI (CHUYỂN VỀ HUB)
  const handleMarkArrived = async (orderId) => {
    if (!window.confirm('Xác nhận đã thu hồi thùng và chuyển về Hub?')) return;
    try {
      // 1. Cập nhật thùng → ready (sẵn sàng tái sử dụng)
      await supabase.from('boxes')
        .update({ status: 'ready' })
        .eq('order_id', orderId)
        .eq('status', 'picking_up');

      // 2. Cập nhật trip point → picked_up
      await supabase.from('pickup_trip_points')
        .update({ status: 'picked_up', picked_up_at: new Date().toISOString() })
        .eq('order_id', orderId);

      alert('Đã xác nhận thu hồi thùng!');
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isPartner');
    navigate('/partner/login');
  };

  const openFleetModal = (item = null) => {
    setEditingItem(item);
    if (activeTab === 'vehicles') {
      setFormData({
        plate_number: item?.plate_number || '', 
        capacity_boxes: item?.capacity_boxes || 30, 
        status: item?.status || 'idle', 
        notes: item?.notes || '',
        name: '', phone: '', license_number: '', years_experience: 0, favorite_routes_text: '',
      });
    } else {
      setFormData({
        plate_number: '', capacity_boxes: 30, status: 'idle', notes: item?.notes || '',
        name: item?.name || '', 
        phone: item?.phone || '', 
        license_number: item?.license_number || '', 
        years_experience: item?.years_experience || 0, 
        favorite_routes_text: (item?.favorite_routes || []).join(', '),
      });
    }
    setShowFleetModal(true);
  };

  const handleSaveFleet = async () => {
    setSavingFleet(true);
    try {
      if (activeTab === 'vehicles') {
        const payload = {
          plate_number: formData.plate_number.toUpperCase(),
          capacity_boxes: formData.capacity_boxes,
          max_boxes: formData.capacity_boxes,
          status: formData.status,
          vehicle_type: 'pickup',
          notes: formData.notes,
          partner_id: defaultPartnerId,
        };
        if (editingItem) await supabase.from('vehicles').update(payload).eq('id', editingItem.id);
        else await supabase.from('vehicles').insert([payload]);
      } else {
        const payload = {
          name: formData.name, phone: formData.phone,
          license_number: formData.license_number,
          years_experience: parseInt(formData.years_experience) || 0,
          favorite_routes: formData.favorite_routes_text.split(',').map(r => r.trim()).filter(Boolean),
          status: formData.status, driver_type: 'pickup', notes: formData.notes,
          partner_id: defaultPartnerId,
        };
        if (editingItem) await supabase.from('drivers').update(payload).eq('id', editingItem.id);
        else await supabase.from('drivers').insert([payload]);
      }
      alert('Lưu thành công!');
      setShowFleetModal(false);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSavingFleet(false);
    }
  };

  const handleDeleteFleet = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa?')) return;
    try {
      if (activeTab === 'vehicles') await supabase.from('vehicles').delete().eq('id', id);
      else await supabase.from('drivers').delete().eq('id', id);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const mapCenter = orders.length > 0 
    ? [orders[0].delivery_lat || 12.6662, orders[0].delivery_lng || 108.0382]
    : movingOrders.length > 0
    ? [movingOrders[0].delivery_lat || 12.6662, movingOrders[0].delivery_lng || 108.0382]
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
            <p className="text-gray-500 text-sm mt-1">Quản lý điểm thu, xe và tài xế</p>
          </div>
          <div className="flex gap-3">
            {(activeTab === 'vehicles' || activeTab === 'drivers') && (
              <button onClick={() => openFleetModal()} className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-4 py-2 rounded-xl flex items-center gap-2">
                <Plus className="w-5 h-5" /> Thêm mới
              </button>
            )}
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 font-bold hover:text-red-800 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
              <LogOut className="w-5 h-5" /> Đăng xuất
            </button>
          </div>
        </div>

        {/* Tabs (4 Tab) */}
        <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm flex gap-2 overflow-x-auto">
          <button onClick={() => setActiveTab('dispatch')} className={`flex-1 flex-shrink-0 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-colors ${activeTab === 'dispatch' ? 'bg-agro-dark text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <MapPin className="w-4 h-4" /> Điều phối thu hồi
          </button>
          <button onClick={() => setActiveTab('moving')} className={`flex-1 flex-shrink-0 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-colors ${activeTab === 'moving' ? 'bg-agro-dark text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Truck className="w-4 h-4" /> Đang thu hồi ({movingOrders.length})
          </button>
          <button onClick={() => setActiveTab('vehicles')} className={`flex-1 flex-shrink-0 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-colors ${activeTab === 'vehicles' ? 'bg-agro-dark text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Truck className="w-4 h-4" /> Xe thu hồi ({vehicles.length})
          </button>
          <button onClick={() => setActiveTab('drivers')} className={`flex-1 flex-shrink-0 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-colors ${activeTab === 'drivers' ? 'bg-agro-dark text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Users className="w-4 h-4" /> Tài xế thu hồi ({drivers.length})
          </button>
        </div>

        {/* TAB 1: ĐIỀU PHỐI THU HỒI (Chờ phân công) */}
        {activeTab === 'dispatch' && (
          <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-320px)]">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-y-auto flex flex-col">
              <div className="p-5 border-b border-gray-100 sticky top-0 bg-white z-10 flex justify-between items-center">
                <h2 className="font-bold text-agro-dark text-lg">Điểm chờ thu ({orders.length})</h2>
                {selectedOrders.length > 0 && (
                  <button onClick={() => setShowModal(true)} className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-4 py-2 rounded-lg text-sm">
                    Phân công ({selectedOrders.length})
                  </button>
                )}
              </div>
              <div className="flex-1 divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <div className="p-10 text-center text-gray-500">Không có điểm nào.</div>
                ) : (
                  orders.map(order => {
                    const isSelected = selectedOrders.find(o => o.id === order.id);
                    return (
                      <div key={order.id} className={`p-5 flex items-start gap-4 transition-colors cursor-pointer ${isSelected ? 'bg-agro-yellow/10' : 'hover:bg-gray-50'}`} onClick={() => handleToggleOrder(order)}>
                        <input type="checkbox" checked={!!isSelected} readOnly className="w-5 h-5 mt-1 accent-agro-dark cursor-pointer" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-agro-dark">{order.order_code}</p>
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-semibold">{order.product_type}</span>
                          </div>
                          <p className="text-sm text-gray-600 flex items-start gap-1 mb-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            {order.delivery_address}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                            <Clock className="w-3 h-3" /> Dự kiến: <strong>{order.estimated_arrival}</strong>
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

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
              <MapContainer center={mapCenter} zoom={6} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; MapTiler' url={`https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=0kgv1m784H4kd86re01y`} />
                {orders.map(order => (
                  <Marker key={order.id} position={[order.delivery_lat || 12.6662, order.delivery_lng || 108.0382]}>
                    <Popup>
                      <div className="font-sans">
                        <p className="font-bold text-agro-dark">{order.order_code}</p>
                        <p className="text-xs text-gray-600">{order.delivery_address}</p>
                        <p className="text-xs text-yellow-600 font-bold mt-1">{order.waiting_count} thùng</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        )}

        {/* TAB 2: ĐANG THU HỒI (Đã phân công) */}
        {activeTab === 'moving' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-bold text-agro-dark text-lg mb-4">Danh sách đang thu hồi ({movingOrders.length})</h2>
            {movingOrders.length === 0 ? (
              <div className="p-10 text-center text-gray-500">Không có chuyến nào đang thu hồi.</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {movingOrders.map(order => (
                  <div key={order.id} className="border border-blue-100 bg-blue-50/50 rounded-xl p-5">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-agro-dark">{order.order_code}</p>
                      <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-bold">Đang thu</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 flex items-start gap-1">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" /> {order.delivery_address}
                    </p>
                    <p className="text-sm font-bold text-yellow-600 mb-3">{order.picking_count} thùng</p>
                    
                    <button 
                      onClick={() => handleMarkArrived(order.id)}
                      className="w-full bg-agro-dark hover:bg-agro-dark/90 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                    >
                      <Home className="w-4 h-4" /> Đã về Hub
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: XE THU HỒI */}
        {activeTab === 'vehicles' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map(v => (
              <div key={v.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><Truck className="w-5 h-5" /></div>
                    <div>
                      <h3 className="font-bold text-agro-dark">{v.plate_number}</h3>
                      <p className="text-xs text-gray-500">Sức chứa: {v.max_boxes || v.capacity_boxes} thùng</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openFleetModal(v)} className="p-1 text-gray-400 hover:text-agro-dark"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteFleet(v.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="mb-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${v.status === 'idle' ? 'bg-green-100 text-green-700' : v.status === 'in_transit' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {v.status === 'idle' ? 'Rảnh' : v.status === 'in_transit' ? 'Đang chạy' : 'Bảo trì'}
                  </span>
                </div>
                {v.notes && <p className="text-xs text-gray-500 italic mt-2">💬 {v.notes}</p>}
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: TÀI XẾ THU HỒI */}
        {activeTab === 'drivers' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map(d => (
              <div key={d.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-agro-dark text-agro-yellow rounded-xl flex items-center justify-center font-bold">{d.name.charAt(0)}</div>
                    <div>
                      <h3 className="font-bold text-agro-dark">{d.name}</h3>
                      <p className="text-xs text-gray-500">{d.phone}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openFleetModal(d)} className="p-1 text-gray-400 hover:text-agro-dark"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteFleet(d.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="mb-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${d.status === 'available' ? 'bg-green-100 text-green-700' : d.status === 'on_duty' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                    {d.status === 'available' ? 'Sẵn sàng' : d.status === 'on_duty' ? 'Đang làm' : 'Nghỉ'}
                  </span>
                </div>
                {d.favorite_routes && d.favorite_routes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {d.favorite_routes.map((r, i) => <span key={i} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">{r}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL PHÂN CÔNG */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-agro-dark text-lg">Tạo chuyến thu hồi</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">
                <p><span className="font-semibold">Số điểm:</span> {selectedOrders.length}</p>
                <p><span className="font-semibold">Tổng thùng:</span> {selectedOrders.reduce((sum, o) => sum + o.waiting_count, 0)}</p>
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

      {/* MODAL THÊM/SỬA XE HOẶC TÀI XẾ */}
      {showFleetModal && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-agro-dark">{editingItem ? 'Sửa' : 'Thêm'} {activeTab === 'vehicles' ? 'Xe thu hồi' : 'Tài xế thu hồi'}</h3>
              <button onClick={() => setShowFleetModal(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              {activeTab === 'vehicles' ? (
                <>
                  <div><label className="block text-sm font-bold mb-1">Biển số xe</label><input type="text" value={formData.plate_number} onChange={e => setFormData({...formData, plate_number: e.target.value.toUpperCase()})} className="w-full border rounded-lg p-3" placeholder="VD: 51C-99999" /></div>
                  <div><label className="block text-sm font-bold mb-1">Sức chứa (thùng)</label><input type="number" value={formData.capacity_boxes} onChange={e => setFormData({...formData, capacity_boxes: parseInt(e.target.value) || 30})} className="w-full border rounded-lg p-3" /></div>
                  <div><label className="block text-sm font-bold mb-1">Trạng thái</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border rounded-lg p-3"><option value="idle">Rảnh</option><option value="maintenance">Bảo trì</option></select></div>
                </>
              ) : (
                <>
                  <div><label className="block text-sm font-bold mb-1">Tên tài xế</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                  <div><label className="block text-sm font-bold mb-1">Số điện thoại</label><input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                  <div><label className="block text-sm font-bold mb-1">Bằng lái</label><input type="text" value={formData.license_number} onChange={e => setFormData({...formData, license_number: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                  <div><label className="block text-sm font-bold mb-1">Kinh nghiệm (năm)</label><input type="number" value={formData.years_experience} onChange={e => setFormData({...formData, years_experience: e.target.value})} className="w-full border rounded-lg p-3" /></div>
                  <div><label className="block text-sm font-bold mb-1">Trạng thái</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border rounded-lg p-3"><option value="available">Sẵn sàng</option><option value="off">Nghỉ</option></select></div>
                </>
              )}
              <div><label className="block text-sm font-bold mb-1">Ghi chú</label><textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows="2" className="w-full border rounded-lg p-3" /></div>
            </div>
            <div className="p-5 border-t bg-gray-50 flex gap-3">
              <button onClick={() => setShowFleetModal(false)} className="flex-1 border border-gray-300 font-bold py-2.5 rounded-xl hover:bg-white">Hủy</button>
              <button onClick={handleSaveFleet} disabled={savingFleet} className="flex-1 bg-agro-yellow font-bold py-2.5 rounded-xl hover:bg-yellow-500 disabled:opacity-50">{savingFleet ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}