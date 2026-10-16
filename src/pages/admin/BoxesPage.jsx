import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  getPickupVehicles,
  getAvailableDriversForPickup,
  createPickupTrip,
  getAllPickupTrips,
  getPickupTripDetails,
  updateTripStatus,
  markPointPickedUp,
} from '../../services/pickupService';
import {
  Recycle,
  Search,
  MapPin,
  Package,
  Truck,
  Users,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  User,
  Phone,
} from 'lucide-react';

export default function BoxesPage() {
  const [orders, setOrders] = useState([]); // Đơn hàng có thùng cần thu hồi
  const [trips, setTrips] = useState([]); // Chuyến thu hồi
  const [pickupVehicles, setPickupVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal phân công
  const [assignModal, setAssignModal] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [notes, setNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Modal chi tiết
  const [detailModal, setDetailModal] = useState(null);
  const [detailPoints, setDetailPoints] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Lấy tất cả đơn hàng
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      // Lấy tất cả thùng
      const { data: boxesData } = await supabase
        .from('boxes')
        .select('*');

      // Lấy tất cả chuyến thu hồi
      const [vehiclesData, driversData, tripsData] = await Promise.all([
        getPickupVehicles(),
        getAvailableDriversForPickup(),
        getAllPickupTrips(),
      ]);

      setPickupVehicles(vehiclesData);
      setAvailableDrivers(driversData);
      setTrips(tripsData);

      // Gộp thùng theo order_id
      const boxMap = {};
      (boxesData || []).forEach((b) => {
        if (!boxMap[b.order_id]) boxMap[b.order_id] = [];
        boxMap[b.order_id].push(b);
      });

      // Gắn thông tin thùng vào đơn hàng
      const ordersWithBoxes = (orderData || [])
        .map((o) => {
          const orderBoxes = boxMap[o.id] || [];
          const waitingBoxes = orderBoxes.filter(
            (b) => b.status === 'delivered' || b.status === 'waiting_return'
          );
          const atHubBoxes = orderBoxes.filter((b) => b.status === 'at_hub');
          const readyBoxes = orderBoxes.filter((b) => b.status === 'ready');

          // Tìm chuyến thu hồi liên quan
          const relatedTrip = tripsData.find(
            (t) => t.status !== 'completed' && t.status !== 'cancelled'
          );

          return {
            ...o,
            total_boxes: orderBoxes.length,
            waiting_boxes: waitingBoxes.length,
            at_hub_boxes: atHubBoxes.length,
            ready_boxes: readyBoxes.length,
            box_ids: orderBoxes.map((b) => b.id),
            waiting_box_ids: waitingBoxes.map((b) => b.id),
            trip: relatedTrip,
          };
        })
        // Chỉ hiển thị đơn có thùng đang giao hoặc cần thu hồi
        .filter((o) => o.total_boxes > 0);

      setOrders(ordersWithBoxes);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Tính trạng thái thu hồi của đơn
  const getPickupStatus = (order) => {
    // Tìm chuyến thu hồi có chứa đơn này
    const relatedTrip = trips.find((t) => {
      if (t.status === 'cancelled') return false;
      return true; // Sẽ check chi tiết bên dưới nếu cần
    });

    if (order.ready_boxes === order.total_boxes) {
      return { level: 'ready', label: 'Đã thu hồi', color: 'green' };
    }
    if (order.at_hub_boxes > 0) {
      return { level: 'at_hub', label: 'Đã về Hub', color: 'blue' };
    }
    if (order.waiting_boxes > 0) {
      return { level: 'waiting', label: 'Chờ thu hồi', color: 'yellow' };
    }
    return { level: 'delivered', label: 'Đã giao', color: 'green' };
  };

  // Mở modal phân công
  const openAssignModal = (order) => {
    setAssignModal(order);
    setSelectedVehicle('');
    setSelectedDriver('');
    setScheduledDate(new Date().toISOString().split('T')[0]);
    setScheduledTime('08:00');
    setNotes('');
  };

  // Xử lý phân công
  const handleAssign = async () => {
    if (!selectedVehicle || !selectedDriver) {
      alert('Vui lòng chọn xe và tài xế!');
      return;
    }

    setAssigning(true);
    try {
      const points = [
        {
          orderId: assignModal.id,
          orderCode: assignModal.order_code,
          lat: assignModal.pickup_lat || 12.6662,
          lng: assignModal.pickup_lng || 108.0382,
          address: assignModal.pickup_address,
          boxes: assignModal.waiting_boxes,
          boxIds: assignModal.waiting_box_ids,
        },
      ];

      await createPickupTrip({
        vehicleId: selectedVehicle,
        driverId: selectedDriver,
        scheduledDate,
        scheduledTime,
        points,
        notes,
      });

      alert('Phân công thu hồi thành công!');
      setAssignModal(null);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setAssigning(false);
    }
  };

  // Xem chi tiết
  const viewDetails = (order) => {
    setDetailModal(order);
    // Tìm trip points
    const boxIds = order.waiting_box_ids;
    // Vì đơn giản nên chỉ hiển thị box_ids
    setDetailPoints(
      (order.box_ids || []).map((id) => ({ box_id: id, status: 'pending' }))
    );
  };

  // Format
  const formatRelative = (timestamp) => {
    if (!timestamp) return '—';
    const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (diff < 60) return `${diff}s trước`;
    if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
    return `${Math.floor(diff / 86400)}d trước`;
  };

  // Stats
  const stats = {
    total: orders.reduce((sum, o) => sum + o.total_boxes, 0),
    delivered: orders.reduce((sum, o) => sum + o.waiting_boxes, 0),
    atHub: orders.reduce((sum, o) => sum + o.at_hub_boxes, 0),
    ready: orders.reduce((sum, o) => sum + o.ready_boxes, 0),
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (filter === 'waiting' && o.waiting_boxes === 0) return false;
    if (filter === 'at_hub' && o.at_hub_boxes === 0) return false;
    if (filter === 'ready' && o.ready_boxes === 0) return false;

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.order_code?.toLowerCase().includes(q) ||
      o.pickup_address?.toLowerCase().includes(q) ||
      o.delivery_address?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.includes(search)
    );
  });

  const statusColorMap = {
    yellow: {
      badge: 'bg-yellow-100 text-yellow-700',
      dot: 'bg-yellow-500',
      icon: Clock,
    },
    blue: {
      badge: 'bg-blue-100 text-blue-700',
      dot: 'bg-blue-500',
      icon: Truck,
    },
    green: {
      badge: 'bg-green-100 text-green-700',
      dot: 'bg-green-500',
      icon: CheckCircle,
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-agro-yellow border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-agro-dark flex items-center gap-2">
          <Recycle className="w-6 h-6" />
          Quản lý Thùng lạnh
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {filteredOrders.length} / {orders.length} đơn hàng đang hiển thị
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-1">Tổng thùng</p>
          <p className="text-2xl font-bold text-agro-dark">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <p className="text-xs text-gray-500 font-medium mb-1">Chờ thu hồi</p>
          <p className="text-2xl font-bold text-yellow-700">
            {stats.delivered}
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs text-gray-500 font-medium mb-1">Đã về Hub</p>
          <p className="text-2xl font-bold text-blue-700">{stats.atHub}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-xs text-gray-500 font-medium mb-1">Sẵn sàng</p>
          <p className="text-2xl font-bold text-green-700">{stats.ready}</p>
        </div>
      </div>

      {/* Filter + Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'Tất cả' },
            { value: 'waiting', label: 'Chờ thu hồi' },
            { value: 'at_hub', label: 'Đã về Hub' },
            { value: 'ready', label: 'Sẵn sàng' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === tab.value
                  ? 'bg-agro-dark text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, địa chỉ, khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-agro-dark text-white">
            <tr>
              <th className="px-4 py-4 text-xs font-bold">Địa điểm</th>
              <th className="px-4 py-4 text-xs font-bold">Khách hàng</th>
              <th className="px-4 py-4 text-xs font-bold">Đơn hàng</th>
              <th className="px-4 py-4 text-xs font-bold text-center">
                Số thùng
              </th>
              <th className="px-4 py-4 text-xs font-bold">Ngày gửi</th>
              <th className="px-4 py-4 text-xs font-bold">Trạng thái</th>
              <th className="px-4 py-4 text-xs font-bold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="text-center py-10 text-gray-400 text-sm"
                >
                  Không có đơn hàng nào
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const status = getPickupStatus(order);
                const statusStyle = statusColorMap[status.color];
                const StatusIcon = statusStyle.icon;
                const canAssign = order.waiting_boxes > 0 && !order.trip;

                return (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2 max-w-[280px]">
                        <MapPin className="w-4 h-4 text-agro-dark flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-agro-dark">
                            {order.pickup_address || 'Không có địa chỉ'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Giao: {order.delivery_address || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold">
                            {order.customer_name || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {order.customer_phone || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-agro-dark text-sm">
                        {order.order_code}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.product_type}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="bg-agro-dark text-white font-bold text-xs px-2 py-1 rounded-lg">
                          {order.waiting_boxes + order.at_hub_boxes + order.ready_boxes} thùng
                        </span>
                        {order.waiting_boxes > 0 && (
                          <span className="text-[10px] text-yellow-600 font-semibold mt-0.5">
                            {order.waiting_boxes} chờ thu
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {order.send_date
                        ? new Date(order.send_date).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusStyle.badge}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        {canAssign && (
                          <button
                            onClick={() => openAssignModal(order)}
                            className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors flex items-center gap-1"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Phân công
                          </button>
                        )}
                        <button
                          onClick={() => viewDetails(order)}
                          className="bg-gray-100 hover:bg-gray-200 text-agro-dark font-bold px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Chi tiết
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

      {/* === MODAL PHÂN CÔNG === */}
      {assignModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setAssignModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-agro-yellow rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5 text-agro-dark" />
                </div>
                <div>
                  <h3 className="font-bold text-agro-dark">
                    Phân công thu hồi
                  </h3>
                  <p className="text-xs text-gray-500">
                    Đơn {assignModal.order_code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignModal(null)}
                className="text-gray-400 hover:text-agro-dark"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Thông tin đơn */}
              <div className="bg-agro-bg rounded-xl p-4 border border-gray-100">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Khách hàng</p>
                    <p className="font-semibold">
                      {assignModal.customer_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Số thùng cần thu</p>
                    <p className="font-semibold text-yellow-700">
                      {assignModal.waiting_boxes} thùng
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Địa điểm</p>
                    <p className="font-semibold text-xs">
                      {assignModal.pickup_address}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chọn xe */}
              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  🚛 Chọn xe thu hồi
                </label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
                >
                  <option value="">-- Chọn xe --</option>
                  {pickupVehicles
                    .filter((v) => v.status === 'idle')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate_number} · {v.max_boxes || v.capacity_boxes} thùng
                      </option>
                    ))}
                </select>
              </div>

              {/* Chọn tài xế */}
              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  👨‍✈️ Chọn tài xế
                </label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
                >
                  <option value="">-- Chọn tài xế --</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ngày giờ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-agro-dark mb-2">
                    📅 Ngày đi
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-agro-dark mb-2">
                    🕒 Giờ xuất phát
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  📝 Ghi chú
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="VD: Gọi trước cho khách 30 phút..."
                  rows="2"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button
                onClick={() => setAssignModal(null)}
                className="flex-1 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning || !selectedVehicle || !selectedDriver}
                className="flex-1 bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {assigning ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL CHI TIẾT === */}
      {detailModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setDetailModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-agro-dark rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-agro-yellow" />
                </div>
                <div>
                  <h3 className="font-bold text-agro-dark">
                    Chi tiết đơn hàng
                  </h3>
                  <p className="text-xs text-gray-500">
                    {detailModal.order_code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModal(null)}
                className="text-gray-400 hover:text-agro-dark"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-agro-bg rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Khách hàng:</span>
                  <span className="font-semibold">
                    {detailModal.customer_name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">SĐT:</span>
                  <span className="font-semibold">
                    {detailModal.customer_phone}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Nông sản:</span>
                  <span className="font-semibold">
                    {detailModal.product_type}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tổng thùng:</span>
                  <span className="font-semibold">
                    {detailModal.total_boxes} thùng
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Chờ thu hồi:</span>
                  <span className="font-semibold text-yellow-700">
                    {detailModal.waiting_boxes} thùng
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Đã về Hub:</span>
                  <span className="font-semibold text-blue-700">
                    {detailModal.at_hub_boxes} thùng
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sẵn sàng:</span>
                  <span className="font-semibold text-green-700">
                    {detailModal.ready_boxes} thùng
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-bold text-gray-500 mb-2">
                  ĐỊA CHỈ LẤY HÀNG
                </p>
                <p className="text-sm font-semibold text-agro-dark flex items-start gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {detailModal.pickup_address}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-bold text-gray-500 mb-2">
                  ĐỊA CHỈ GIAO HÀNG
                </p>
                <p className="text-sm font-semibold text-agro-dark flex items-start gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {detailModal.delivery_address}
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100">
              <button
                onClick={() => setDetailModal(null)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-agro-dark font-bold py-3 rounded-xl transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}