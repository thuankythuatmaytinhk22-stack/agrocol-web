import { useState, useEffect } from 'react';
import {
  getOrdersNeedingPickup,
  getPickupVehicles,
  getAvailableDriversForPickup,
  createPickupTrip,
  getAllPickupTrips,
  getPickupTripDetails,
  updateTripStatus,
  markPointPickedUp,
} from '../../services/pickupService';
import {
  Truck,
  MapPin,
  Users,
  Package,
  CheckCircle,
  Clock,
  Calendar,
  X,
  Eye,
  Recycle,
  ArrowRight,
  Plus,
  AlertTriangle,
} from 'lucide-react';

export default function PickupCoordinationPage() {
  const [orders, setOrders] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal tạo chuyến
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Modal xem chi tiết
  const [detailTrip, setDetailTrip] = useState(null);
  const [detailPoints, setDetailPoints] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersData, vehiclesData, driversData, tripsData] =
        await Promise.all([
          getOrdersNeedingPickup(),
          getPickupVehicles(),
          getAvailableDriversForPickup(),
          getAllPickupTrips(),
        ]);
      setOrders(ordersData);
      setVehicles(vehiclesData.filter((v) => v.status === 'idle'));
      setDrivers(driversData);
      setTrips(tripsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleOrder = (order) => {
    setSelectedOrders((prev) => {
      const exists = prev.find((o) => o.id === order.id);
      if (exists) return prev.filter((o) => o.id !== order.id);
      return [...prev, order];
    });
  };

  const openCreateModal = () => {
    setSelectedOrders([]);
    setSelectedVehicle('');
    setSelectedDriver('');
    setScheduledDate(new Date().toISOString().split('T')[0]);
    setScheduledTime('08:00');
    setNotes('');
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
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
      const points = selectedOrders.map((o) => ({
        orderId: o.id,
        orderCode: o.order_code,
        lat: o.pickup_lat || 12.6662,
        lng: o.pickup_lng || 108.0382,
        address: o.pickup_address || 'Không rõ',
        boxes: o.boxes_to_pickup,
        boxIds: o.box_ids,
      }));

      await createPickupTrip({
        vehicleId: selectedVehicle,
        driverId: selectedDriver,
        scheduledDate,
        scheduledTime,
        points,
        notes,
      });

      alert(`Tạo chuyến thu hồi thành công! ${selectedOrders.length} điểm.`);
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const viewTripDetails = async (trip) => {
    try {
      const { trip: tripData, points } = await getPickupTripDetails(trip.id);
      setDetailTrip(tripData);
      setDetailPoints(points);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleStartTrip = async (tripId) => {
    if (!window.confirm('Bắt đầu chuyến thu hồi này?')) return;
    try {
      await updateTripStatus(tripId, 'in_progress');
      fetchData();
      if (detailTrip?.id === tripId) {
        const { trip, points } = await getPickupTripDetails(tripId);
        setDetailTrip(trip);
        setDetailPoints(points);
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleMarkPicked = async (pointId) => {
    if (!window.confirm('Xác nhận đã lấy thùng ở điểm này?')) return;
    try {
      await markPointPickedUp(pointId, detailTrip.id);
      const { trip, points } = await getPickupTripDetails(detailTrip.id);
      setDetailTrip(trip);
      setDetailPoints(points);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const totalBoxes = selectedOrders.reduce(
    (sum, o) => sum + (o.boxes_to_pickup || 0),
    0
  );
  const estimatedTime = selectedOrders.length * 30 + 60;

  const statusOptions = {
    scheduled: {
      label: 'Đã lên lịch',
      color: 'bg-blue-100 text-blue-700',
      icon: Calendar,
    },
    in_progress: {
      label: 'Đang thu hồi',
      color: 'bg-yellow-100 text-yellow-700',
      icon: Truck,
    },
    completed: {
      label: 'Hoàn thành',
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle,
    },
    cancelled: {
      label: 'Đã hủy',
      color: 'bg-red-100 text-red-700',
      icon: X,
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-agro-dark flex items-center gap-2">
            <Recycle className="w-6 h-6" />
            Điều phối thu hồi thùng
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {orders.length} điểm cần thu hồi · {trips.length} chuyến đã tạo
          </p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={orders.length === 0}
          className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          Tạo chuyến thu hồi
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-gray-500 font-semibold">
              Điểm chờ thu hồi
            </span>
          </div>
          <p className="text-2xl font-bold text-agro-dark">{orders.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs text-gray-500 font-semibold">
              Xe thu hồi rảnh
            </span>
          </div>
          <p className="text-2xl font-bold text-agro-dark">
            {vehicles.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-500 font-semibold">
              Tài xế available
            </span>
          </div>
          <p className="text-2xl font-bold text-agro-dark">
            {drivers.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-xs text-gray-500 font-semibold">
              Chuyến đang chạy
            </span>
          </div>
          <p className="text-2xl font-bold text-agro-dark">
            {trips.filter((t) => t.status === 'in_progress').length}
          </p>
        </div>
      </div>

      {/* Danh sách điểm cần thu hồi */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-agro-dark mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Điểm cần thu hồi thùng ({orders.length})
        </h3>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <p className="font-bold text-agro-dark">
              Không có điểm nào cần thu hồi
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Tất cả thùng đã được thu hồi hoặc đang được vận chuyển.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {orders.map((order) => {
              const isSelected = selectedOrders.find((o) => o.id === order.id);
              return (
                <div
                  key={order.id}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'bg-agro-yellow/10 border-agro-yellow'
                      : 'bg-white border-gray-100 hover:border-agro-yellow/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-agro-dark flex-shrink-0" />
                        <p className="font-bold text-agro-dark text-sm">
                          {order.order_code}
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 flex items-start gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span className="truncate">{order.pickup_address}</span>
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="bg-agro-dark text-white font-bold text-xs px-2 py-1 rounded-lg">
                        {order.boxes_to_pickup} thùng
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>👤 {order.customer_name}</span>
                    <span>📞 {order.customer_phone}</span>
                  </div>
                  <button
                    onClick={() => {
                      toggleOrder(order);
                      if (!showCreateModal) openCreateModal();
                    }}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-agro-dark text-white hover:bg-agro-dark/90'
                    }`}
                  >
                    {isSelected ? 'Đã chọn · Bấm để bỏ' : 'Chọn điểm này'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danh sách chuyến thu hồi */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-bold text-agro-dark mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Chuyến thu hồi ({trips.length})
        </h3>

        {trips.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">
            Chưa có chuyến thu hồi nào
          </p>
        ) : (
          <div className="space-y-3">
            {trips.map((trip) => {
              const status = statusOptions[trip.status] || statusOptions.scheduled;
              const StatusIcon = status.icon;
              const vehicle = vehicles.find((v) => v.id === trip.vehicle_id);

              return (
                <div
                  key={trip.id}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-bold text-agro-dark">
                          {trip.trip_code}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${status.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <span>📍 {trip.total_points} điểm</span>
                        <span>📦 {trip.total_boxes} thùng</span>
                        <span>⏱️ {trip.estimated_duration_minutes} phút</span>
                        {trip.scheduled_date && (
                          <span>
                            📅 {new Date(trip.scheduled_date).toLocaleDateString('vi-VN')}
                            {trip.scheduled_time && ` · ${trip.scheduled_time}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => viewTripDetails(trip)}
                        className="bg-gray-100 hover:bg-gray-200 text-agro-dark font-bold px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Chi tiết
                      </button>
                      {trip.status === 'scheduled' && (
                        <button
                          onClick={() => handleStartTrip(trip.id)}
                          className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" /> Bắt đầu
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL TẠO CHUYẾN */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-agro-yellow rounded-xl flex items-center justify-center">
                  <Recycle className="w-5 h-5 text-agro-dark" />
                </div>
                <div>
                  <h3 className="font-bold text-agro-dark">Tạo chuyến thu hồi</h3>
                  <p className="text-xs text-gray-500">
                    {selectedOrders.length} điểm · {totalBoxes} thùng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-agro-dark"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Điểm đã chọn */}
              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  📍 Điểm thu hồi ({selectedOrders.length})
                </label>
                {selectedOrders.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      Bạn chưa chọn điểm nào. Đóng modal và chọn điểm bên ngoài.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedOrders.map((o, idx) => (
                      <div
                        key={o.id}
                        className="flex items-center gap-2 bg-agro-bg rounded-lg p-2 text-xs"
                      >
                        <span className="w-5 h-5 bg-agro-dark text-white rounded-full flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-agro-dark">
                          {o.order_code}
                        </span>
                        <span className="text-gray-600 truncate flex-1">
                          {o.pickup_address}
                        </span>
                        <span className="bg-white font-bold text-agro-dark px-2 py-0.5 rounded">
                          {o.boxes_to_pickup}t
                        </span>
                        <button
                          onClick={() => toggleOrder(o)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate_number} · {v.max_boxes || v.capacity_boxes} thùng ·{' '}
                      {v.notes}
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
                  {drivers.map((d) => (
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
                  placeholder="VD: Ưu tiên lấy thùng ở Đà Nẵng trước..."
                  rows="2"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium resize-none"
                />
              </div>

              {/* Summary */}
              <div className="bg-agro-dark text-white rounded-xl p-4">
                <p className="text-xs opacity-70 mb-1">Ước tính</p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">
                    {selectedOrders.length} điểm
                  </span>
                  <span className="font-bold text-agro-yellow text-lg">
                    {estimatedTime} phút
                  </span>
                  <span className="font-bold text-lg">{totalBoxes} thùng</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  creating ||
                  selectedOrders.length === 0 ||
                  !selectedVehicle ||
                  !selectedDriver
                }
                className="flex-1 bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {creating ? 'Đang tạo...' : 'Xác nhận chuyến'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT CHUYẾN */}
      {detailTrip && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setDetailTrip(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-agro-yellow rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5 text-agro-dark" />
                </div>
                <div>
                  <h3 className="font-bold text-agro-dark">
                    Chuyến {detailTrip.trip_code}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {detailTrip.total_points} điểm · {detailTrip.total_boxes} thùng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailTrip(null)}
                className="text-gray-400 hover:text-agro-dark"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {detailPoints.map((point, idx) => {
                const isPickedUp = point.status === 'picked_up';
                return (
                  <div
                    key={point.id}
                    className={`p-4 rounded-xl border-2 ${
                      isPickedUp
                        ? 'bg-green-50 border-green-200'
                        : 'bg-white border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                            isPickedUp
                              ? 'bg-green-500 text-white'
                              : 'bg-agro-dark text-white'
                          }`}
                        >
                          {isPickedUp ? '✓' : point.sequence}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-agro-dark text-sm">
                            {point.order_code}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5 flex items-start gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span className="truncate">
                              {point.pickup_address}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            📦 {point.boxes_to_pickup} thùng
                            {isPickedUp && point.picked_up_at && (
                              <span className="ml-2 text-green-600 font-semibold">
                                · Đã lấy lúc{' '}
                                {new Date(point.picked_up_at).toLocaleTimeString(
                                  'vi-VN',
                                  { hour: '2-digit', minute: '2-digit' }
                                )}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      {!isPickedUp && detailTrip.status === 'in_progress' && (
                        <button
                          onClick={() => handleMarkPicked(point.id)}
                          className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Đã lấy
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-5 border-t border-gray-100">
              <button
                onClick={() => setDetailTrip(null)}
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