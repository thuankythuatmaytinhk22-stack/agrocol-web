import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getAllVehicles } from '../../services/vehicleService';
import { getAllDrivers } from '../../services/driverService';
import { updateDepositStatus, deleteOrder } from '../../services/orderService';
import {
  Package,
  Search,
  Truck,
  Users,
  X,
  CheckCircle,
  Trash2,
  AlertCircle,
  Link as LinkIcon // Icon cho tính năng ghép chuyến
} from 'lucide-react';

// Hàm tính khoảng cách tương đối giữa 2 tọa độ (dùng để check "gần nhau")
const isNearby = (lat1, lng1, lat2, lng2) => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return false;
  // Tính khoảng cách Euclid đơn giản (không cần chính xác tuyệt đối cho gợi ý)
  const dist = Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
  return dist < 0.5; // Khoảng cách < 0.5 độ (khoảng ~50km) thì coi là gần
};

// Hàm tính chênh lệch giờ
const hoursDiff = (date1, time1, date2, time2) => {
  if (!date1 || !time1 || !date2 || !time2) return 99;
  const d1 = new Date(`${date1}T${time1}`);
  const d2 = new Date(`${date2}T${time2}`);
  return Math.abs(d1 - d2) / 36e5; // miliseconds to hours
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal Phân công
  const [assignModal, setAssignModal] = useState(null);
  const [assignList, setAssignList] = useState([]);
  const [assigning, setAssigning] = useState(false);
  
  // State cho tính năng ghép chuyến
  const [mergeSuggestions, setMergeSuggestions] = useState([]);
  const [selectedMergeOrders, setSelectedMergeOrders] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (orderData) setOrders(orderData);

      const vData = await getAllVehicles();
      setVehicles(vData.filter(v => v.vehicle_type !== 'pickup'));

      const dData = await getAllDrivers();
      setDrivers(dData.filter(d => d.driver_type !== 'pickup'));

      const { data: assignData } = await supabase.from('order_assignments').select('*');
      if (assignData) {
        const map = {};
        assignData.forEach((a) => {
          if (!map[a.order_id]) map[a.order_id] = [];
          map[a.order_id].push(a);
        });
        setAssignments(map);
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Hàm tìm các đơn có thể ghép chuyến
  const findMergeSuggestions = (currentOrder) => {
    // 1. Lấy các đơn chưa phân công, cùng ngày gửi
    const unassigned = orders.filter(o => 
      o.id !== currentOrder.id && 
      (!assignments[o.id] || assignments[o.id].length === 0) &&
      o.status === 'pending' &&
      o.send_date === currentOrder.send_date
    );

    // 2. Lọc theo điều kiện: Gần nhau, giờ cách <= 4h, tổng thùng <= 12
    const validSuggestions = unassigned.filter(o => {
      const near = isNearby(currentOrder.delivery_lat, currentOrder.delivery_lng, o.delivery_lat, o.delivery_lng);
      const timeClose = hoursDiff(currentOrder.send_date, currentOrder.pickup_time, o.send_date, o.pickup_time) <= 4;
      const totalBoxes = (currentOrder.boxes || 0) + (o.boxes || 0);
      
      return near && timeClose && totalBoxes <= 12;
    });

    setMergeSuggestions(validSuggestions);
    setSelectedMergeOrders([]); // Reset lựa chọn
  };

  const handleOpenAssignModal = (order) => {
    setAssignModal(order);
    findMergeSuggestions(order); // Tìm đơn ghép ngay khi mở Modal
    
    // Khởi tạo danh sách xe mặc định cho đơn hiện tại
    const distribution = calculateVehicles(order.boxes);
    const existing = assignments[order.id] || [];
    const list = distribution.map((boxes, i) => ({
      vehicleId: existing[i]?.vehicle_id || '',
      driverId: existing[i]?.driver_id || '',
      boxes: boxes,
    }));
    setAssignList(list);
  };

  const handleToggleMergeOrder = (order) => {
    setSelectedMergeOrders(prev => {
      const exists = prev.find(o => o.id === order.id);
      if (exists) return prev.filter(o => o.id !== order.id);
      return [...prev, order];
    });
  };

  // Tính lại số xe khi có ghép chuyến
  useEffect(() => {
    if (!assignModal) return;
    
    // Tổng số thùng bao gồm cả các đơn được ghép
    const totalBoxes = (assignModal.boxes || 0) + selectedMergeOrders.reduce((sum, o) => sum + (o.boxes || 0), 0);
    
    // Chia lại số xe (12 thùng/xe)
    const numVehicles = Math.ceil(totalBoxes / 12);
    const distribution = [];
    let remaining = totalBoxes;
    
    for (let i = 0; i < numVehicles; i++) {
      const assigned = remaining >= 12 ? 12 : remaining;
      distribution.push(assigned);
      remaining -= assigned;
    }

    const existing = assignments[assignModal.id] || [];
    const list = distribution.map((boxes, i) => ({
      vehicleId: existing[i]?.vehicle_id || '',
      driverId: existing[i]?.driver_id || '',
      boxes: boxes,
    }));
    setAssignList(list);
  }, [selectedMergeOrders, assignModal]);

  const calculateVehicles = (boxes) => {
    const numVehicles = Math.ceil((boxes || 0) / 12);
    const distribution = [];
    let remaining = boxes || 0;
    for (let i = 0; i < numVehicles; i++) {
      const assigned = remaining >= 12 ? 12 : remaining;
      distribution.push(assigned);
      remaining -= assigned;
    }
    return distribution;
  };

  const updateAssignment = (index, field, value) => {
    setAssignList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAssign = async () => {
    const invalid = assignList.some((a) => !a.vehicleId || !a.driverId);
    if (invalid) return alert('Chọn đủ xe và tài xế!');
    
    const vehicleIds = assignList.map((a) => a.vehicleId);
    if (new Set(vehicleIds).size !== vehicleIds.length) return alert('Trùng xe!');
    
    const driverIds = assignList.map((a) => a.driverId);
    if (new Set(driverIds).size !== driverIds.length) return alert('Trùng tài xế!');

    setAssigning(true);
    try {
      // Xóa phân công cũ của các đơn liên quan (nếu có)
      await supabase.from('order_assignments').delete().eq('order_id', assignModal.id);
      for (const mergeOrder of selectedMergeOrders) {
        await supabase.from('order_assignments').delete().eq('order_id', mergeOrder.id);
      }

      // Tạo phân công mới cho đơn chính
      const inserts = assignList.map((a) => ({
        order_id: assignModal.id, 
        vehicle_id: a.vehicleId, 
        driver_id: a.driverId, 
        boxes_assigned: a.boxes, 
        status: 'assigned',
      }));
      await supabase.from('order_assignments').insert(inserts);

      // Cập nhật trạng thái đơn chính
      await supabase.from('orders').update({
        status: 'shipping', 
        vehicle_id: assignList[0].vehicleId, 
        driver_id: assignList[0].driverId,
      }).eq('id', assignModal.id);

      // NẾU CÓ GHÉP CHUYẾN: Cập nhật luôn cho các đơn được ghép
      for (const mergeOrder of selectedMergeOrders) {
        await supabase.from('order_assignments').insert({
          order_id: mergeOrder.id,
          vehicle_id: assignList[assignList.length - 1].vehicleId, // Cho lên xe cuối cùng
          driver_id: assignList[assignList.length - 1].driverId,
          boxes_assigned: mergeOrder.boxes,
          status: 'assigned',
        });
        await supabase.from('orders').update({
          status: 'shipping',
          vehicle_id: assignList[assignList.length - 1].vehicleId,
          driver_id: assignList[assignList.length - 1].driverId,
        }).eq('id', mergeOrder.id);
      }

      // Cập nhật trạng thái xe và tài xế
      for (const a of assignList) {
        await supabase.from('vehicles').update({
          status: 'in_transit', 
          current_order_ids: [assignModal.id, ...selectedMergeOrders.map(o => o.id)], 
          current_driver_id: a.driverId, 
          current_route: `Gom đơn (${assignModal.order_code}...)`, 
          departed_at: new Date().toISOString(), 
          estimated_return_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        }).eq('id', a.vehicleId);

        await supabase.from('drivers').update({
          status: 'on_duty', 
          current_vehicle_id: a.vehicleId,
        }).eq('id', a.driverId);
      }

      alert(`Phân công thành công! Đã ghép ${selectedMergeOrders.length} đơn.`);
      setAssignModal(null);
      setSelectedMergeOrders([]);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;

      if (newStatus === 'delivered' || newStatus === 'cancelled') {
        const orderAssigns = assignments[orderId] || [];
        for (const a of orderAssigns) {
          await supabase.from('vehicles').update({
            status: 'idle', current_order_ids: null, current_driver_id: null, current_route: null, departed_at: null, estimated_return_at: null,
          }).eq('id', a.vehicle_id);

          await supabase.from('drivers').update({
            status: 'available', current_vehicle_id: null,
          }).eq('id', a.driver_id);
        }
        await supabase.from('order_assignments').update({
          status: newStatus === 'delivered' ? 'delivered' : 'cancelled',
          completed_at: newStatus === 'delivered' ? new Date().toISOString() : null,
        }).eq('order_id', orderId);
      }
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleUnassign = async (order) => {
    if (!window.confirm('Hủy phân công?')) return;
    try {
      const orderAssigns = assignments[order.id] || [];
      for (const a of orderAssigns) {
        await supabase.from('vehicles').update({ status: 'idle', current_order_ids: null, current_driver_id: null, current_route: null, departed_at: null, estimated_return_at: null }).eq('id', a.vehicle_id);
        await supabase.from('drivers').update({ status: 'available', current_vehicle_id: null }).eq('id', a.driver_id);
      }
      await supabase.from('order_assignments').delete().eq('order_id', order.id);
      await supabase.from('orders').update({ vehicle_id: null, driver_id: null, status: 'pending' }).eq('id', order.id);
      alert('Đã hủy phân công!');
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const orderStatusOptions = [
    { value: 'pending', label: 'Đã đặt', color: 'bg-gray-100 text-gray-700' },
    { value: 'packed', label: 'Đã đóng hàng', color: 'bg-blue-100 text-blue-700' },
    { value: 'shipping', label: 'Đang vận chuyển', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'delivered', label: 'Đã giao', color: 'bg-green-100 text-green-700' },
    { value: 'cancelled', label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
  ];

  const filteredOrders = orders.filter((order) => {
    const matchStatus = filter === 'all' || order.status === filter;
    const matchSearch = !search || order.order_code.toLowerCase().includes(search.toLowerCase()) || order.customer_name?.toLowerCase().includes(search.toLowerCase()) || order.customer_phone?.includes(search);
    return matchStatus && matchSearch;
  });

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    packed: orders.filter((o) => o.status === 'packed').length,
    shipping: orders.filter((o) => o.status === 'shipping').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  const getAvailableVehicles = (currentIndex) => {
    const selectedIds = assignList.filter((_, i) => i !== currentIndex).map((a) => a.vehicleId).filter(Boolean);
    return vehicles.filter((v) => (v.status === 'idle' || assignList[currentIndex].vehicleId === v.id) && !selectedIds.includes(v.id));
  };

  const getAvailableDrivers = (currentIndex) => {
    const selectedIds = assignList.filter((_, i) => i !== currentIndex).map((a) => a.driverId).filter(Boolean);
    return drivers.filter((d) => (d.status === 'available' || assignList[currentIndex].driverId === d.id) && !selectedIds.includes(d.id));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-12 h-12 border-4 border-agro-yellow border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-agro-dark flex items-center gap-2"><Package className="w-6 h-6" /> Quản lý Đơn hàng</h2>
          <p className="text-sm text-gray-500 mt-1">Tổng cộng {orders.length} đơn hàng · {counts.pending} đang chờ xử lý</p>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm flex gap-2 overflow-x-auto">
        {[
          { value: 'all', label: 'Tất cả', count: counts.all },
          { value: 'pending', label: 'Chờ xử lý', count: counts.pending },
          { value: 'packed', label: 'Đã đóng', count: counts.packed },
          { value: 'shipping', label: 'Đang giao', count: counts.shipping },
          { value: 'delivered', label: 'Đã giao', count: counts.delivered },
          { value: 'cancelled', label: 'Đã hủy', count: counts.cancelled },
        ].map((tab) => (
          <button key={tab.value} onClick={() => setFilter(tab.value)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${filter === tab.value ? 'bg-agro-dark text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {tab.label} <span className={`text-xs px-2 py-0.5 rounded-full ${filter === tab.value ? 'bg-white/20' : 'bg-gray-200'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Tìm mã đơn, tên khách, SĐT..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-agro-dark" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left min-w-[1300px]">
          <thead className="bg-agro-dark text-white">
            <tr>
              <th className="px-4 py-4 text-xs font-bold">Mã đơn</th>
              <th className="px-4 py-4 text-xs font-bold">Khách hàng</th>
              <th className="px-4 py-4 text-xs font-bold">Nông sản</th>
              <th className="px-4 py-4 text-xs font-bold">Số thùng</th>
              <th className="px-4 py-4 text-xs font-bold">Số xe cần</th>
              <th className="px-4 py-4 text-xs font-bold">Ngày gửi</th>
              <th className="px-4 py-4 text-xs font-bold">Giờ đặt</th>
              <th className="px-4 py-4 text-xs font-bold">Xe / Tài xế</th>
              <th className="px-4 py-4 text-xs font-bold text-center">Thanh toán cọc</th>
              <th className="px-4 py-4 text-xs font-bold">Trạng thái</th>
              <th className="px-4 py-4 text-xs font-bold text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr><td colSpan="11" className="text-center py-10 text-gray-400 text-sm">Không có đơn hàng nào</td></tr>
            ) : (
              filteredOrders.map((order) => {
                const orderAssigns = assignments[order.id] || [];
                const vehiclesNeeded = Math.ceil((order.boxes || 0) / 12);
                return (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-4 font-bold text-agro-dark text-sm">{order.order_code}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-sm">{order.customer_name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{order.customer_phone || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-4 text-sm">{order.product_type}</td>
                    <td className="px-4 py-4 text-sm"><span className="font-semibold">{order.weight} kg</span><br /><span className="text-xs text-gray-500">{order.boxes} thùng</span></td>
                    <td className="px-4 py-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">{vehiclesNeeded} xe</span></td>
                    <td className="px-4 py-4 text-sm text-gray-600">{order.send_date ? new Date(order.send_date).toLocaleDateString('vi-VN') : '—'}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-agro-dark">{order.pickup_time || '—'}</td>
                    <td className="px-4 py-4">
                      {orderAssigns.length > 0 ? (
                        <div className="space-y-1">
                          {orderAssigns.map((a, idx) => {
                            const v = vehicles.find((x) => x.id === a.vehicle_id);
                            const d = drivers.find((x) => x.id === a.driver_id);
                            return (
                              <div key={a.id} className="flex items-center gap-1.5 text-[10px]">
                                <span className="bg-agro-dark text-white font-bold w-4 h-4 rounded-full flex items-center justify-center">{idx + 1}</span>
                                <span className="font-bold text-agro-dark">{v?.plate_number}</span>
                                <span className="text-gray-500">· {d?.name}</span>
                                <span className="text-gray-400">({a.boxes_assigned}t)</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Chưa phân công</span>
                      )}
                    </td>
                    
                    {/* CỘT THANH TOÁN CỌC */}
                    <td className="px-4 py-4 text-center">
                      <select 
                        value={order.deposit_status || 'unpaid'} 
                        onChange={(e) => handleDepositChange(order.id, e.target.value)} 
                        className={`border rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-agro-dark ${
                          order.deposit_status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                        }`}
                      >
                        <option value="unpaid">Chưa cọc</option>
                        <option value="paid">Đã cọc</option>
                      </select>
                    </td>

                    <td className="px-4 py-4">
                      <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)} className={`border rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-agro-dark ${orderStatusOptions.find((s) => s.value === order.status)?.color}`}>
                        {orderStatusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </td>
                    
                    {/* CỘT HÀNH ĐỘNG */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 justify-center">
                        {orderAssigns.length === 0 ? (
                          <button onClick={() => handleOpenAssignModal(order)} className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-3 py-2 rounded-lg text-xs whitespace-nowrap">Phân công</button>
                        ) : (
                          <button onClick={() => handleUnassign(order)} className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-2 rounded-lg text-xs whitespace-nowrap">Hủy PC</button>
                        )}
                        
                        <button onClick={() => handleDeleteOrder(order.id)} className="bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 p-2 rounded-lg transition-colors" title="Xóa đơn">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL PHÂN CÔNG + GHÉP CHUYẾN */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-agro-dark">Phân công vận chuyển</h3>
              <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-agro-dark"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-agro-bg rounded-xl p-4 border border-gray-100">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-gray-500">Mã đơn</p><p className="font-semibold">{assignModal.order_code}</p></div>
                  <div><p className="text-xs text-gray-500">Số thùng</p><p className="font-semibold">{assignModal.boxes} thùng</p></div>
                  <div className="col-span-2"><p className="text-xs text-gray-500">Tuyến</p><p className="font-semibold text-xs">{assignModal.pickup_address} → {assignModal.delivery_address}</p></div>
                </div>
              </div>

              {/* GỢI Ý GHÉP CHUYẾN */}
              {mergeSuggestions.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <LinkIcon className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-blue-800 text-sm">Có {mergeSuggestions.length} đơn có thể ghép chuyến</h4>
                  </div>
                  <p className="text-xs text-blue-600 mb-3">Các đơn này cùng ngày, gần nhau, cách &lt; 4h và tổng thùng &le; 12.</p>
                  
                  <div className="space-y-2">
                    {mergeSuggestions.map(o => (
                      <label key={o.id} className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedMergeOrders.some(so => so.id === o.id)}
                          onChange={() => handleToggleMergeOrder(o)}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <div className="flex-1">
                          <p className="font-bold text-sm text-agro-dark">{o.order_code} - {o.customer_name}</p>
                          <p className="text-xs text-gray-500">{o.boxes} thùng · {o.pickup_time} · {o.delivery_address}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* DANH SÁCH XE (CẬP NHẬT THEO SỐ THÙNG GHÉP) */}
              <div className="space-y-3">
                {assignList.map((assign, index) => (
                  <div key={index} className="bg-white border-2 border-gray-100 rounded-xl p-4 hover:border-agro-yellow">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-7 h-7 bg-agro-dark text-white rounded-full flex items-center justify-center font-bold text-sm">{index + 1}</span>
                      <p className="font-bold text-agro-dark text-sm">Xe #{index + 1}</p>
                      <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{assign.boxes} thùng</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">🚛 Chọn xe</label>
                        <select value={assign.vehicleId} onChange={(e) => updateAssignment(index, 'vehicleId', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-agro-dark">
                          <option value="">-- Chọn xe --</option>
                          {getAvailableVehicles(index).map((v) => <option key={v.id} value={v.id}>{v.plate_number} ({v.capacity_boxes}t)</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">👨‍✈️ Chọn tài xế</label>
                        <select value={assign.driverId} onChange={(e) => updateAssignment(index, 'driverId', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-agro-dark">
                          <option value="">-- Chọn tài xế --</option>
                          {getAvailableDrivers(index).map((d) => <option key={d.id} value={d.id}>{d.name} · {d.phone}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setAssignModal(null)} className="flex-1 border-2 border-gray-300 hover:bg-gray-50 font-bold py-3 rounded-xl">Hủy</button>
              <button onClick={handleAssign} disabled={assigning || assignList.some((a) => !a.vehicleId || !a.driverId)} className="flex-1 bg-agro-yellow hover:bg-yellow-500 font-bold py-3 rounded-xl disabled:opacity-50">{assigning ? 'Đang xử lý...' : `Xác nhận phân công`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}