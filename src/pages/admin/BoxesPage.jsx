import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  Recycle,
  Search,
  MapPin,
  Package,
  Truck,
  X,
  CheckCircle,
  Clock,
  Eye,
  User,
  Phone,
} from 'lucide-react';

export default function BoxesPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [detailModal, setDetailModal] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Lấy đơn đã giao hoặc đang giao
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['delivered', 'shipping'])
        .order('created_at', { ascending: false });

      // Lấy thùng
      const { data: boxesData } = await supabase.from('boxes').select('*');

      // Gộp thùng theo order_id
      const boxMap = {};
      (boxesData || []).forEach((b) => {
        if (!boxMap[b.order_id]) boxMap[b.order_id] = [];
        boxMap[b.order_id].push(b);
      });

      // Gắn thông tin thùng vào đơn
      const ordersWithBoxes = (orderData || [])
        .map((o) => {
          const orderBoxes = boxMap[o.id] || [];
          const pickupBoxes = orderBoxes.filter((b) =>
            ['delivered', 'waiting_return', 'picking_up'].includes(b.status)
          );
          const doneBoxes = orderBoxes.filter((b) =>
            ['at_hub', 'ready'].includes(b.status)
          );

          const waiting = pickupBoxes.filter((b) =>
            ['delivered', 'waiting_return'].includes(b.status)
          ).length;
          const pickingUp = pickupBoxes.filter(
            (b) => b.status === 'picking_up'
          ).length;
          const done = doneBoxes.length;

          return {
            ...o,
            total_boxes: orderBoxes.length,
            waiting_boxes: waiting,
            picking_up_boxes: pickingUp,
            done_boxes: done,
            waiting_box_ids: pickupBoxes
              .filter((b) => ['delivered', 'waiting_return'].includes(b.status))
              .map((b) => b.id),
          };
        })
        .filter((o) => o.total_boxes > 0);

      setOrders(ordersWithBoxes);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Hàm xác định trạng thái
  const getPickupStatus = (order) => {
    if (order.total_boxes === 0) {
      return { level: 'empty', label: 'Chưa có thùng', color: 'gray' };
    }
    if (order.waiting_boxes > 0 && order.picking_up_boxes === 0) {
      return { level: 'waiting', label: 'Chờ đối tác thu', color: 'yellow' };
    }
    if (order.picking_up_boxes > 0) {
      return { level: 'picking_up', label: 'Đối tác đang thu', color: 'blue' };
    }
    if (order.done_boxes === order.total_boxes) {
      return { level: 'done', label: 'Đã thu hồi', color: 'green' };
    }
    if (order.done_boxes > 0) {
      return {
        level: 'partial',
        label: `Đã thu ${order.done_boxes}/${order.total_boxes}`,
        color: 'green',
      };
    }
    return { level: 'unknown', label: 'Không xác định', color: 'gray' };
  };

  // Lọc
  const filteredOrders = orders.filter((o) => {
    if (filter === 'waiting' && o.waiting_boxes === 0) return false;
    if (filter === 'picking_up' && o.picking_up_boxes === 0) return false;
    if (filter === 'done' && o.done_boxes === 0) return false;

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

  // Thống kê
  const stats = {
    total: orders.reduce((sum, o) => sum + o.total_boxes, 0),
    waiting: orders.reduce((sum, o) => sum + o.waiting_boxes, 0),
    pickingUp: orders.reduce((sum, o) => sum + o.picking_up_boxes, 0),
    done: orders.reduce((sum, o) => sum + o.done_boxes, 0),
  };

  const statusColorMap = {
    yellow: { badge: 'bg-yellow-100 text-yellow-700', icon: Clock },
    blue: { badge: 'bg-blue-100 text-blue-700', icon: Truck },
    green: { badge: 'bg-green-100 text-green-700', icon: CheckCircle },
    gray: { badge: 'bg-gray-100 text-gray-700', icon: Package },
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-agro-dark flex items-center gap-2">
            <Recycle className="w-6 h-6" />
            Quản lý Thùng lạnh
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredOrders.length} / {orders.length} đơn hàng đang hiển thị ·{' '}
            <span className="font-semibold text-blue-600">
              Đối tác vận tải chịu trách nhiệm thu gom
            </span>
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-1">Tổng thùng</p>
          <p className="text-2xl font-bold text-agro-dark">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <p className="text-xs text-gray-500 font-medium mb-1">Chờ đối tác thu</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.waiting}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs text-gray-500 font-medium mb-1">Đối tác đang thu</p>
          <p className="text-2xl font-bold text-blue-700">{stats.pickingUp}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-xs text-gray-500 font-medium mb-1">Đã thu hồi</p>
          <p className="text-2xl font-bold text-green-700">{stats.done}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'Tất cả' },
            { value: 'waiting', label: 'Chờ thu' },
            { value: 'picking_up', label: 'Đang thu' },
            { value: 'done', label: 'Đã thu hồi' },
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
              <th className="px-4 py-4 text-xs font-bold text-center">Số thùng</th>
              <th className="px-4 py-4 text-xs font-bold">Trạng thái</th>
              <th className="px-4 py-4 text-xs font-bold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-10 text-gray-400 text-sm">
                  Không có đơn hàng nào
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const status = getPickupStatus(order);
                const statusStyle = statusColorMap[status.color];
                const StatusIcon = statusStyle.icon;

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
                          <p className="text-sm font-semibold">{order.customer_name || 'N/A'}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {order.customer_phone || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-agro-dark text-sm">{order.order_code}</p>
                      <p className="text-xs text-gray-500">{order.product_type}</p>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="bg-agro-dark text-white font-bold text-xs px-2 py-1 rounded-lg">
                          {order.total_boxes} thùng
                        </span>
                        {(order.waiting_boxes > 0 || order.picking_up_boxes > 0) && (
                          <span className="text-[10px] text-yellow-600 font-semibold mt-0.5">
                            {order.waiting_boxes + order.picking_up_boxes} cần thu
                          </span>
                        )}
                      </div>
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
                        {/* ĐÃ XÓA NÚT PHÂN CÔNG - Đối tác tự làm bên họ */}
                        <button
                          onClick={() => setDetailModal(order)}
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
                  <h3 className="font-bold text-agro-dark">Chi tiết đơn hàng</h3>
                  <p className="text-xs text-gray-500">{detailModal.order_code}</p>
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
                  <span className="font-semibold">{detailModal.customer_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">SĐT:</span>
                  <span className="font-semibold">{detailModal.customer_phone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tổng thùng:</span>
                  <span className="font-semibold">{detailModal.total_boxes} thùng</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Chờ thu:</span>
                  <span className="font-semibold text-yellow-700">{detailModal.waiting_boxes} thùng</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Đang thu:</span>
                  <span className="font-semibold text-blue-700">{detailModal.picking_up_boxes} thùng</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Đã thu:</span>
                  <span className="font-semibold text-green-700">{detailModal.done_boxes} thùng</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-bold text-gray-500 mb-2">ĐỊA CHỈ LẤY HÀNG</p>
                <p className="text-sm font-semibold text-agro-dark flex items-start gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {detailModal.pickup_address}
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-bold text-gray-500 mb-2">ĐỊA CHỈ GIAO HÀNG</p>
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