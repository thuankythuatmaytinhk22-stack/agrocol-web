import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getAllVehicles } from '../../services/vehicleService';
import { getAllDrivers } from '../../services/driverService';
import {
  Package,
  Search,
  Truck,
  Users,
  X,
  CheckCircle,
} from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal
  const [assignModal, setAssignModal] = useState(null);
  const [assignList, setAssignList] = useState([]);
  const [assigning, setAssigning] = useState(false);

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

      // CHỈ LẤY XE VẬN CHUYỂN
      const vData = await getAllVehicles();
      setVehicles(vData.filter(v => v.vehicle_type !== 'pickup'));

      // CHỈ LẤY TX VẬN CHUYỂN
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

  // HÀM CẬP NHẬT TRẠNG THÁI (TỰ ĐỘNG GIẢI PHÓNG XE/TX)
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // 1. Cập nhật đơn hàng
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;

      // 2. Nếu là 'delivered' hoặc 'cancelled' -> Giải phóng xe và tài xế
      if (newStatus === 'delivered' || newStatus === 'cancelled') {
        const orderAssigns = assignments[orderId] || [];
        
        for (const a of orderAssigns) {
          // Trả xe về Rảnh (idle)
          await supabase.from('vehicles').update({
            status: 'idle',
            current_order_ids: null,
            current_driver_id: null,
            current_route: null,
            departed_at: null,
            estimated_return_at: null,
          }).eq('id', a.vehicle_id);

          // Trả tài xế về Sẵn sàng (available)
          await supabase.from('drivers').update({
            status: 'available',
            current_vehicle_id: null,
          }).eq('id', a.driver_id);
        }

        // Đánh dấu phân công đã hoàn thành/hủy
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

  const openAssignModal = (order) => {
    const distribution = calculateVehicles(order.boxes);
    const existing = assignments[order.id] || [];
    const list = distribution.map((boxes, i) => ({
      vehicleId: existing[i]?.vehicle_id || '',
      driverId: existing[i]?.driver_id || '',
      boxes: boxes,
    }));
    setAssignList(list);
    setAssignModal(order);
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
      await supabase.from('order_assignments').delete().eq('order_id', assignModal.id);

      const inserts = assignList.map((a) => ({
        order_id: assignModal.id,
        vehicle_id: a.vehicleId,
        driver_id: a.driverId,
        boxes_assigned: a.boxes,
        status: 'assigned',
      }));
      await supabase.from('order_assignments').insert(inserts);

      await supabase.from('orders').update({
        status: 'shipping',
        vehicle_id: assignList[0].vehicleId,
        driver_id: assignList[0].driverId,
      }).eq('id', assignModal.id);

      for (const a of assignList) {
        await supabase.from('vehicles').update({
          status: 'in_transit',
          current_order_ids: [assignModal.id],
          current_driver_id: a.driverId,
          current_route: `${assignModal.pickup_address} → ${assignModal.delivery_address}`,
          departed_at: new Date().toISOString(),
          estimated_return_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        }).eq('id', a.vehicleId);

        await supabase.from('drivers').update({
          status: 'on_duty',
          current_vehicle_id: a.vehicleId,
        }).eq('id', a.driverId);
      }

      alert(`Phân công thành công ${assignList.length} xe!`);
      setAssignModal(null);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setAssigning(false);
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
        <table className="w-full text-left min-w-[1100px]">
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
              <th className="px-4 py-4 text-xs font-bold">Trạng thái</th>
              <th className="px-4 py-4 text-xs font-bold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr><td colSpan="10" className="text-center py-10 text-gray-400 text-sm">Không có đơn hàng nào</td></tr>
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
                    <td className="px-4 py-4">
                      <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)} className={`border rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-agro-dark ${orderStatusOptions.find((s) => s.value === order.status)?.color}`}>
                        {orderStatusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      {orderAssigns.length === 0 ? (
                        <button onClick={() => openAssignModal(order)} className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-3 py-2 rounded-lg text-xs whitespace-nowrap">Phân công</button>
                      ) : (
                        <button onClick={() => handleUnassign(order)} className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-2 rounded-lg text-xs whitespace-nowrap">Hủy PC</button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Phân công (Giữ nguyên) */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-agro-dark">Phân công {assignList.length} xe vận chuyển</h3>
              <button onClick={() => setAssignModal(null)} className="text-gray-400 hover:text-agro-dark"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-agro-bg rounded-xl p-4 border border-gray-100">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-gray-500">Khách hàng</p><p className="font-semibold">{assignModal.customer_name}</p></div>
                  <div><p className="text-xs text-gray-500">Số thùng</p><p className="font-semibold">{assignModal.boxes} thùng</p></div>
                  <div className="col-span-2"><p className="text-xs text-gray-500">Tuyến</p><p className="font-semibold text-xs">{assignModal.pickup_address} → {assignModal.delivery_address}</p></div>
                </div>
              </div>
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
              <button onClick={handleAssign} disabled={assigning || assignList.some((a) => !a.vehicleId || !a.driverId)} className="flex-1 bg-agro-yellow hover:bg-yellow-500 font-bold py-3 rounded-xl disabled:opacity-50">{assigning ? 'Đang xử lý...' : `Xác nhận ${assignList.length} xe`}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}