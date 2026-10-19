import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getPickupVehicles, getAvailableDriversForPickup, createPickupTrip } from '../../services/pickupService';
import { MapPin, Truck, Package, LogOut, Search, CheckCircle, X } from 'lucide-react';

export default function PartnerPickupPage() {
  const [orders, setOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState([]);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [creating, setCreating] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Kiểm tra quyền đối tác
    if (localStorage.getItem('isPartner') !== 'true') {
      navigate('/partner/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Lấy các đơn đã giao nhưng còn thùng cần thu
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'delivered')
        .order('created_at', { ascending: false });

      const { data: boxData } = await supabase
        .from('boxes')
        .select('*')
        .in('status', ['delivered', 'waiting_return']);

      // Gom nhóm thùng theo order
      const boxMap = {};
      (boxData || []).forEach(b => {
        if (!boxMap[b.order_id]) boxMap[b.order_id] = [];
        boxMap[b.order_id].push(b);
      });

      const pendingOrders = (orderData || [])
        .map(o => {
          const boxes = boxMap[o.id] || [];
          return {
            ...o,
            boxes_to_pickup: boxes.length,
            box_ids: boxes.map(b => b.id)
          };
        })
        .filter(o => o.boxes_to_pickup > 0);

      setOrders(pendingOrders);

      // 2. Lấy TẤT CẢ xe và tài xế pickup (không phân biệt đối tác)
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

  const toggleOrder = (order) => {
    setSelectedOrders(prev => {
      const exists = prev.find(o => o.id === order.id);
      if (exists) return prev.filter(o => o.id !== order.id);
      return [...prev, order];
    });
  };

  const handleCreateTrip = async () => {
    if (selectedOrders.length === 0) {
      alert('Vui lòng chọn ít nhất 1 điểm thu hồi!');
      return;
    }
    if (!selectedVehicle || !selectedDriver) {
      alert('Vui lòng chọn xe và tài xế!');
      return;
    }

    setCreating(true);
    try {
      const points = selectedOrders.map(o => ({
        orderId: o.id,
        orderCode: o.order_code,
        lat: o.pickup_lat || 12.6662,
        lng: o.pickup_lng || 108.0382,
        address: o.pickup_address,
        boxes: o.boxes_to_pickup,
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

      alert('Tạo chuyến thu hồi thành công!');
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

  if (loading) return <div className="p-10 text-center">Đang tải dữ liệu...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500 font-medium mb-1">Điểm cần thu</p>
            <p className="text-3xl font-extrabold text-agro-dark">{orders.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500 font-medium mb-1">Xe thu hồi rảnh</p>
            <p className="text-3xl font-extrabold text-blue-600">{vehicles.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-500 font-medium mb-1">Tài xế available</p>
            <p className="text-3xl font-extrabold text-green-600">{drivers.length}</p>
          </div>
        </div>

        {/* Danh sách điểm thu */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-bold text-agro-dark text-lg">Danh sách điểm cần thu thùng</h2>
            {selectedOrders.length > 0 && (
              <button 
                onClick={() => setShowModal(true)}
                className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                <Truck className="w-4 h-4" />
                Tạo chuyến đi ({selectedOrders.length} điểm)
              </button>
            )}
          </div>
          
          <div className="divide-y divide-gray-100">
            {orders.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p>Hiện tại không có điểm nào cần thu hồi.</p>
              </div>
            ) : (
              orders.map(order => {
                const isSelected = selectedOrders.find(o => o.id === order.id);
                return (
                  <div 
                    key={order.id} 
                    className={`p-5 flex items-start gap-4 transition-colors cursor-pointer ${isSelected ? 'bg-agro-yellow/10' : 'hover:bg-gray-50'}`}
                    onClick={() => toggleOrder(order)}
                  >
                    <div className="pt-1">
                      <input type="checkbox" checked={!!isSelected} readOnly className="w-5 h-5 accent-agro-dark cursor-pointer" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-agro-dark">{order.order_code}</p>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-semibold">
                          {order.product_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 flex items-start gap-1">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        {order.pickup_address}
                      </p>
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
      </div>

      {/* MODAL TẠO CHUYẾN */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-agro-dark text-lg">Tạo chuyến thu hồi</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">
                <p><span className="font-semibold">Số điểm đã chọn:</span> {selectedOrders.length}</p>
                <p><span className="font-semibold">Tổng số thùng:</span> {selectedOrders.reduce((sum, o) => sum + o.boxes_to_pickup, 0)}</p>
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
                {creating ? 'Đang tạo...' : 'Xác nhận chuyến'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}