import { useState, useEffect } from 'react';
import {
  getAllVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  updateVehicleStatus,
} from '../../services/vehicleService';
import {
  Truck,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  CheckCircle,
  Wrench,
  Route,
  Clock,
  Package,
  Recycle,
} from 'lucide-react';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('delivery'); // 'delivery' hoặc 'pickup'
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    plate_number: '',
    capacity_boxes: 12,
    status: 'idle',
    vehicle_type: 'delivery',
    max_boxes: 12,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const data = await getAllVehicles();
      setVehicles(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Lọc theo tab
  const tabVehicles = vehicles.filter((v) => {
    const type = v.vehicle_type || 'delivery';
    return type === activeTab;
  });

  // Lọc thêm theo status + search
  const filteredVehicles = tabVehicles.filter((v) => {
    const matchStatus = filter === 'all' || v.status === filter;
    const matchSearch =
      !search ||
      v.plate_number.toLowerCase().includes(search.toLowerCase()) ||
      v.notes?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Đếm theo trạng thái trong tab hiện tại
  const counts = {
    all: tabVehicles.length,
    idle: tabVehicles.filter((v) => v.status === 'idle').length,
    in_transit: tabVehicles.filter((v) => v.status === 'in_transit').length,
    maintenance: tabVehicles.filter((v) => v.status === 'maintenance').length,
  };

  // Đếm tổng 2 loại xe
  const totalDelivery = vehicles.filter(
    (v) => (v.vehicle_type || 'delivery') === 'delivery'
  ).length;
  const totalPickup = vehicles.filter(
    (v) => v.vehicle_type === 'pickup'
  ).length;

  // Mở modal thêm
  const openAddModal = () => {
    setEditingVehicle(null);
    setFormData({
      plate_number: '',
      capacity_boxes: activeTab === 'pickup' ? 30 : 12,
      status: 'idle',
      vehicle_type: activeTab,
      max_boxes: activeTab === 'pickup' ? 30 : 12,
      notes: '',
    });
    setShowModal(true);
  };

  // Mở modal sửa
  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      plate_number: vehicle.plate_number,
      capacity_boxes: vehicle.capacity_boxes,
      status: vehicle.status,
      vehicle_type: vehicle.vehicle_type || 'delivery',
      max_boxes: vehicle.max_boxes || vehicle.capacity_boxes,
      notes: vehicle.notes || '',
    });
    setShowModal(true);
  };

  // Lưu
  const handleSave = async () => {
    if (!formData.plate_number.trim()) {
      alert('Vui lòng nhập biển số xe!');
      return;
    }

    setSaving(true);
    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, formData);
        alert('Cập nhật xe thành công!');
      } else {
        await createVehicle(formData);
        alert('Thêm xe mới thành công!');
      }
      setShowModal(false);
      fetchVehicles();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Xóa
  const handleDelete = async (vehicle) => {
    if (vehicle.status === 'in_transit') {
      alert('Không thể xóa xe đang vận chuyển!');
      return;
    }
    if (
      !window.confirm(
        `Xóa xe ${vehicle.plate_number}? Hành động này không thể hoàn tác.`
      )
    )
      return;
    try {
      await deleteVehicle(vehicle.id);
      alert('Đã xóa xe!');
      fetchVehicles();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Đổi trạng thái nhanh
  const handleStatusChange = async (vehicle, newStatus) => {
    try {
      await updateVehicleStatus(vehicle.id, newStatus);
      fetchVehicles();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const statusOptions = {
    idle: {
      label: 'Rảnh',
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle,
    },
    in_transit: {
      label: 'Đang chạy',
      color: 'bg-yellow-100 text-yellow-700',
      icon: Truck,
    },
    maintenance: {
      label: 'Bảo trì',
      color: 'bg-red-100 text-red-700',
      icon: Wrench,
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
            <Truck className="w-6 h-6" />
            Quản lý Đội xe
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {totalDelivery} xe vận chuyển · {totalPickup} xe thu hồi
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Thêm {activeTab === 'pickup' ? 'xe thu hồi' : 'xe vận chuyển'}
        </button>
      </div>

      {/* Tabs chính: 2 loại xe */}
      <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm flex gap-2">
        <button
          onClick={() => {
            setActiveTab('delivery');
            setFilter('all');
            setSearch('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
            activeTab === 'delivery'
              ? 'bg-agro-dark text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          Xe vận chuyển
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'delivery' ? 'bg-white/20' : 'bg-gray-200'
            }`}
          >
            {totalDelivery}
          </span>
        </button>
        <button
          onClick={() => {
            setActiveTab('pickup');
            setFilter('all');
            setSearch('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
            activeTab === 'pickup'
              ? 'bg-agro-dark text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Recycle className="w-4 h-4" />
          Xe thu hồi
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'pickup' ? 'bg-white/20' : 'bg-gray-200'
            }`}
          >
            {totalPickup}
          </span>
        </button>
      </div>

      {/* Mô tả tab */}
      <div
        className={`rounded-2xl p-4 border ${
          activeTab === 'delivery'
            ? 'bg-green-50 border-green-100'
            : 'bg-blue-50 border-blue-100'
        }`}
      >
        <p
          className={`text-sm font-medium ${
            activeTab === 'delivery' ? 'text-green-800' : 'text-blue-800'
          }`}
        >
          {activeTab === 'delivery'
            ? '🚛 Xe vận chuyển — có hệ thống làm lạnh, chở hàng đi giao (12 thùng/xe).'
            : '🚚 Xe thu hồi — không làm lạnh, chở thùng rỗng về kho (30 thùng/xe).'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-agro-dark"></div>
            <span className="text-xs text-gray-500 font-semibold">Tổng</span>
          </div>
          <p className="text-2xl font-extrabold text-agro-dark">{counts.all}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-green-700 font-semibold">Rảnh</span>
          </div>
          <p className="text-2xl font-extrabold text-green-700">
            {counts.idle}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-yellow-700 font-semibold">
              Đang chạy
            </span>
          </div>
          <p className="text-2xl font-extrabold text-yellow-700">
            {counts.in_transit}
          </p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-red-700 font-semibold">Bảo trì</span>
          </div>
          <p className="text-2xl font-extrabold text-red-700">
            {counts.maintenance}
          </p>
        </div>
      </div>

      {/* Filter + Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: `Tất cả (${counts.all})` },
            { value: 'idle', label: `Rảnh (${counts.idle})` },
            { value: 'in_transit', label: `Đang chạy (${counts.in_transit})` },
            {
              value: 'maintenance',
              label: `Bảo trì (${counts.maintenance})`,
            },
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
            placeholder="Tìm theo biển số, ghi chú..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          {activeTab === 'delivery' ? (
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          ) : (
            <Recycle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          )}
          <p className="text-gray-500 font-medium">
            {search || filter !== 'all'
              ? 'Không tìm thấy xe nào phù hợp'
              : `Chưa có xe ${
                  activeTab === 'pickup' ? 'thu hồi' : 'vận chuyển'
                } nào`}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle) => {
            const status = statusOptions[vehicle.status];
            const StatusIcon = status.icon;
            const isPickup = vehicle.vehicle_type === 'pickup';
            const displayCapacity = isPickup
              ? vehicle.max_boxes || vehicle.capacity_boxes
              : vehicle.capacity_boxes;

            return (
              <div
                key={vehicle.id}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isPickup
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-agro-dark text-agro-yellow'
                      }`}
                    >
                      {isPickup ? (
                        <Recycle className="w-6 h-6" />
                      ) : (
                        <Truck className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-agro-dark text-lg">
                        {vehicle.plate_number}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Sức chứa: {displayCapacity} thùng
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(vehicle)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-agro-dark transition-colors"
                      title="Sửa"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle)}
                      className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Loại xe */}
                <div className="mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isPickup
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {isPickup ? '🚚 Xe thu hồi' : '🚛 Xe vận chuyển'}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.color}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>

                {/* Info khi in_transit */}
                {vehicle.status === 'in_transit' && (
                  <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                    {vehicle.current_route && (
                      <div className="flex items-start gap-2 text-xs">
                        <Route className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600">
                          {vehicle.current_route}
                        </span>
                      </div>
                    )}
                    {vehicle.estimated_return_at && (
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-600">
                          Dự kiến về:{' '}
                          {new Date(
                            vehicle.estimated_return_at
                          ).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {vehicle.notes && (
                  <p className="text-xs text-gray-500 italic mb-4">
                    💬 {vehicle.notes}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pt-3 border-t border-gray-100">
                  <span>🚛 {vehicle.total_trips || 0} chuyến</span>
                  <span>📏 {Math.round(vehicle.total_km || 0)} km</span>
                </div>

                {/* Status change */}
                {vehicle.status !== 'in_transit' ? (
                  <select
                    value={vehicle.status}
                    onChange={(e) =>
                      handleStatusChange(vehicle, e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark"
                  >
                    <option value="idle">🟢 Rảnh</option>
                    <option value="maintenance">🔴 Bảo trì</option>
                  </select>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-2 text-center">
                    <p className="text-xs text-yellow-700 font-semibold">
                      {isPickup ? '🚚 Đang thu hồi' : '🚛 Đang vận chuyển'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* === MODAL THÊM/SỬA XE === */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    formData.vehicle_type === 'pickup'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-agro-yellow text-agro-dark'
                  }`}
                >
                  {formData.vehicle_type === 'pickup' ? (
                    <Recycle className="w-5 h-5" />
                  ) : (
                    <Truck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-agro-dark">
                    {editingVehicle
                      ? 'Sửa thông tin xe'
                      : `Thêm xe ${
                          formData.vehicle_type === 'pickup'
                            ? 'thu hồi'
                            : 'vận chuyển'
                        }`}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {editingVehicle
                      ? `Cập nhật ${editingVehicle.plate_number}`
                      : 'Điền thông tin xe mới'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-agro-dark"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Loại xe (không cho đổi khi sửa) */}
              {!editingVehicle && (
                <div>
                  <label className="block text-sm font-bold text-agro-dark mb-2">
                    Loại xe
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          vehicle_type: 'delivery',
                          capacity_boxes: 12,
                          max_boxes: 12,
                        })
                      }
                      className={`p-3 rounded-xl border-2 text-left transition-colors ${
                        formData.vehicle_type === 'delivery'
                          ? 'border-agro-yellow bg-agro-yellow/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Truck className="w-5 h-5 text-agro-dark mb-1" />
                      <p className="font-bold text-xs">Xe vận chuyển</p>
                      <p className="text-[10px] text-gray-500">
                        Có làm lạnh
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          vehicle_type: 'pickup',
                          capacity_boxes: 30,
                          max_boxes: 30,
                        })
                      }
                      className={`p-3 rounded-xl border-2 text-left transition-colors ${
                        formData.vehicle_type === 'pickup'
                          ? 'border-agro-yellow bg-agro-yellow/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Recycle className="w-5 h-5 text-blue-600 mb-1" />
                      <p className="font-bold text-xs">Xe thu hồi</p>
                      <p className="text-[10px] text-gray-500">
                        Không làm lạnh
                      </p>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  Biển số xe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.plate_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      plate_number: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="VD: 51C-12345"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  {formData.vehicle_type === 'pickup'
                    ? 'Sức chứa tối đa (thùng rỗng)'
                    : 'Sức chứa (số thùng)'}
                </label>
                <input
                  type="number"
                  value={
                    formData.vehicle_type === 'pickup'
                      ? formData.max_boxes
                      : formData.capacity_boxes
                  }
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 12;
                    setFormData({
                      ...formData,
                      capacity_boxes: val,
                      max_boxes: val,
                    });
                  }}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.vehicle_type === 'pickup'
                    ? 'Xe thu hồi có thể chở nhiều thùng rỗng hơn (30 thùng)'
                    : 'Xe vận chuyển mặc định 12 thùng'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  Trạng thái
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
                >
                  <option value="idle">🟢 Rảnh</option>
                  <option value="maintenance">🔴 Bảo trì</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  Ghi chú
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder={
                    formData.vehicle_type === 'pickup'
                      ? 'VD: Xe thu hồi thùng rỗng, không làm lạnh'
                      : 'VD: Xe tải lạnh 1.5 tấn, đăng kiểm 12/2025'
                  }
                  rows="3"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {saving
                  ? 'Đang lưu...'
                  : editingVehicle
                  ? 'Cập nhật'
                  : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}