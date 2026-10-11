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
  AlertCircle,
} from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal phân công
  const [assignModal, setAssignModal] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
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

      const vData = await getAllVehicles();
      setVehicles(vData);

      const dData = await getAllDrivers();
      setDrivers(dData);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    if (error) alert('Lỗi: ' + error.message);
    else fetchData();
  };

  // Mở modal phân công
  const openAssignModal = (order) => {
    setAssignModal(order);
    setSelectedVehicle(order.vehicle_id || '');
    setSelectedDriver(order.driver_id || '');
  };

  // Lưu phân công
  const handleAssign = async () => {
    if (!selectedVehicle || !selectedDriver) {
      alert('Vui lòng chọn cả xe và tài xế!');
      return;
    }

    setAssigning(true);
    try {
      // 1. Cập nhật order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          vehicle_id: selectedVehicle,
          driver_id: selectedDriver,
          status: 'shipping',
        })
        .eq('id', assignModal.id);
      if (orderError) throw orderError;

      // 2. Cập nhật trạng thái xe
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({
          status: 'in_transit',
          current_order_ids: [assignModal.id],
          current_driver_id: selectedDriver,
          current_route: `${assignModal.pickup_address} → ${assignModal.delivery_address}`,
          departed_at: new Date().toISOString(),
          estimated_return_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', selectedVehicle);
      if (vehicleError) throw vehicleError;

      // 3. Cập nhật trạng thái tài xế
      const { error: driverError } = await supabase
        .from('drivers')
        .update({
          status: 'on_duty',
          current_vehicle_id: selectedVehicle,
        })
        .eq('id', selectedDriver);
      if (driverError) throw driverError;

      // 4. Tăng số chuyến
      const vehicle = vehicles.find((v) => v.id === selectedVehicle);
      const driver = drivers.find((d) => d.id === selectedDriver);
      await supabase
        .from('vehicles')
        .update({ total_trips: (vehicle?.total_trips || 0) + 1 })
        .eq('id', selectedVehicle);
      await supabase
        .from('drivers')
        .update({ total_trips: (driver?.total_trips || 0) + 1 })
        .eq('id', selectedDriver);

      alert('Phân công xe và tài xế thành công!');
      setAssignModal(null);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setAssigning(false);
    }
  };

  // Hủy phân công
  const handleUnassign = async (order) => {
    if (!window.confirm('Hủy phân công xe và tài xế cho đơn này?')) return;
    try {
      // Reset order
      await supabase
        .from('orders')
        .update({ vehicle_id: null, driver_id: null, status: 'pending' })
        .eq('id', order.id);

      // Reset vehicle
      if (order.vehicle_id) {
        await supabase
          .from('vehicles')
          .update({
            status: 'idle',
            current_order_ids: null,
            current_driver_id: null,
            current_route: null,
            departed_at: null,
            estimated_return_at: null,
          })
          .eq('id', order.vehicle_id);
      }

      // Reset driver
      if (order.driver_id) {
        await supabase
          .from('drivers')
          .update({ status: 'available', current_vehicle_id: null })
          .eq('id', order.driver_id);
      }

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

  // Lọc và tìm kiếm
  const filteredOrders = orders.filter((order) => {
    const matchStatus = filter === 'all' || order.status === filter;
    const matchSearch =
      !search ||
      order.order_code.toLowerCase().includes(search.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      order.customer_phone?.includes(search);
    return matchStatus && matchSearch;
  });

  // Đếm theo trạng thái
  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    packed: orders.filter((o) => o.status === 'packed').length,
    shipping: orders.filter((o) => o.status === 'shipping').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
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
            <Package className="w-6 h-6" />
            Quản lý Đơn hàng
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Tổng cộng {orders.length} đơn hàng · {counts.pending} đang chờ xử lý
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm flex gap-2 overflow-x-auto">
        {[
          { value: 'all', label: 'Tất cả', count: counts.all },
          { value: 'pending', label: 'Chờ xử lý', count: counts.pending },
          { value: 'packed', label: 'Đã đóng', count: counts.packed },
          { value: 'shipping', label: 'Đang giao', count: counts.shipping },
          { value: 'delivered', label: 'Đã giao', count: counts.delivered },
          { value: 'cancelled', label: 'Đã hủy', count: counts.cancelled },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
              filter === tab.value
                ? 'bg-agro-dark text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                filter === tab.value ? 'bg-white/20' : 'bg-gray-200'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, tên khách hàng, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark"
          />
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="bg-agro-dark text-white">
            <tr>
              <th className="px-4 py-4 text-xs font-bold">Mã đơn</th>
              <th className="px-4 py-4 text-xs font-bold">Khách hàng</th>
              <th className="px-4 py-4 text-xs font-bold">Nông sản</th>
              <th className="px-4 py-4 text-xs font-bold">Số thùng</th>
              <th className="px-4 py-4 text-xs font-bold">Số xe cần</th>
              <th className="px-4 py-4 text-xs font-bold">Xe</th>
              <th className="px-4 py-4 text-xs font-bold">Tài xế</th>
              <th className="px-4 py-4 text-xs font-bold">Trạng thái</th>
              <th className="px-4 py-4 text-xs font-bold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-10 text-gray-400 text-sm">
                  Không có đơn hàng nào
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const vehicle = vehicles.find((v) => v.id === order.vehicle_id);
                const driver = drivers.find((d) => d.id === order.driver_id);
                const vehiclesNeeded = Math.ceil((order.boxes || 0) / 12);

                return (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 font-bold text-agro-dark text-sm">
                      {order.order_code}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-sm">
                        {order.customer_name || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.customer_phone || 'N/A'}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm">{order.product_type}</td>
                    <td className="px-4 py-4 text-sm">
                      <span className="font-semibold">{order.weight} kg</span>
                      <br />
                      <span className="text-xs text-gray-500">
                        {order.boxes} thùng
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                        {vehiclesNeeded} xe
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {vehicle ? (
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-agro-dark" />
                          <div>
                            <p className="font-semibold text-xs">
                              {vehicle.plate_number}
                            </p>
                            <p
                              className={`text-[10px] font-bold ${
                                vehicle.status === 'in_transit'
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                              }`}
                            >
                              {vehicle.status === 'in_transit'
                                ? 'Đang chạy'
                                : 'Rảnh'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Chưa phân công
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {driver ? (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-agro-dark" />
                          <div>
                            <p className="font-semibold text-xs">{driver.name}</p>
                            <p className="text-[10px] text-gray-500">
                              {driver.phone}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Chưa phân công
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className={`border rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-agro-dark ${
                          orderStatusOptions.find((s) => s.value === order.status)
                            ?.color
                        }`}
                      >
                        {orderStatusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      {!order.vehicle_id ? (
                        <button
                          onClick={() => openAssignModal(order)}
                          className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors"
                        >
                          Phân công
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnassign(order)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors"
                        >
                          Hủy PC
                        </button>
                      )}
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
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-agro-yellow rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5 text-agro-dark" />
                </div>
                <div>
                  <h3 className="font-bold text-agro-dark">
                    Phân công xe & tài xế
                  </h3>
                  <p className="text-xs text-gray-500">
                    Đơn hàng {assignModal.order_code}
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

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Thông tin đơn */}
              <div className="bg-agro-bg rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 mb-2">
                  THÔNG TIN ĐƠN HÀNG
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Khách hàng</p>
                    <p className="font-semibold">{assignModal.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Số thùng</p>
                    <p className="font-semibold">
                      {assignModal.boxes} thùng
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Tuyến</p>
                    <p className="font-semibold text-xs">
                      {assignModal.pickup_address} → {assignModal.delivery_address}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chọn xe */}
              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  🚛 Chọn xe
                </label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
                >
                  <option value="">-- Chọn xe --</option>
                  {vehicles
                    .filter((v) => v.status === 'idle' || v.id === selectedVehicle)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate_number} · {v.capacity_boxes} thùng ·{' '}
                        {v.status === 'idle' ? 'Rảnh' : 'Đang chạy'}
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
                  {drivers
                    .filter(
                      (d) => d.status === 'available' || d.id === selectedDriver
                    )
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} · {d.phone} ·{' '}
                        {d.years_experience > 0
                          ? `${d.years_experience} năm KN`
                          : 'Mới'}
                      </option>
                    ))}
                </select>
              </div>

              {/* Thông báo */}
              {selectedVehicle && selectedDriver && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-green-800">
                    <p className="font-bold">Sẵn sàng phân công!</p>
                    <p>
                      Đơn sẽ chuyển sang trạng thái "Đang vận chuyển" và xe sẽ
                      được đánh dấu "Đang chạy".
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-gray-100">
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
                {assigning ? 'Đang xử lý...' : 'Xác nhận phân công'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}