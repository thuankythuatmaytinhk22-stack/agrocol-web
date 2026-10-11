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
  AlertTriangle,
  Wrench,
  Route,
  Clock,
} from 'lucide-react';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    plate_number: '',
    capacity_boxes: 12,
    status: 'idle',
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

  // Mở modal thêm mới
  const openAddModal = () => {
    setEditingVehicle(null);
    setFormData({
      plate_number: '',
      capacity_boxes: 12,
      status: 'idle',
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
      notes: vehicle.notes || '',
    });
    setShowModal(true);
  };

  // Lưu (thêm hoặc sửa)
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

  // Xóa xe
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
      dot: 'bg-green-500',
      icon: CheckCircle,
    },
    in_transit: {
      label: 'Đang chạy',
      color: 'bg-yellow-100 text-yellow-700',
      dot: 'bg-yellow-500',
      icon: Truck,
    },
    maintenance: {
      label: 'Bảo trì',
      color: 'bg-red-100 text-red-700',
      dot: 'bg-red-500',
      icon: Wrench,
    },
  };

  // Lọc
  const filteredVehicles = vehicles.filter((v) => {
    const matchStatus = filter === 'all' || v.status === filter;
    const matchSearch =
      !search ||
      v.plate_number.toLowerCase().includes(search.toLowerCase()) ||
      v.notes?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all: vehicles.length,
    idle: vehicles.filter((v) => v.status === 'idle').length,
    in_transit: vehicles.filter((v) => v.status === 'in_transit').length,
    maintenance: vehicles.filter((v) => v.status === 'maintenance').length,
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
            <Truck className="w-6 h-6" />
            Quản lý Đội xe
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {vehicles.length} xe · {counts.idle} rảnh · {counts.in_transit} đang chạy ·{' '}
            {counts.maintenance} bảo trì
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Thêm xe mới
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-agro-dark"></div>
            <span className="text-xs text-gray-500 font-semibold">Tổng xe</span>
          </div>
          <p className="text-3xl font-extrabold text-agro-dark">{counts.all}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs text-green-700 font-semibold">Rảnh</span>
          </div>
          <p className="text-3xl font-extrabold text-green-700">{counts.idle}</p>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-yellow-700 font-semibold">Đang chạy</span>
          </div>
          <p className="text-3xl font-extrabold text-yellow-700">
            {counts.in_transit}
          </p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-red-700 font-semibold">Bảo trì</span>
          </div>
          <p className="text-3xl font-extrabold text-red-700">{counts.maintenance}</p>
        </div>
      </div>

      {/* Filter + Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: `Tất cả (${counts.all})` },
            { value: 'idle', label: `Rảnh (${counts.idle})` },
            { value: 'in_transit', label: `Đang chạy (${counts.in_transit})` },
            { value: 'maintenance', label: `Bảo trì (${counts.maintenance})` },
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

      {/* Vehicles grid */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {search || filter !== 'all'
              ? 'Không tìm thấy xe nào phù hợp'
              : 'Chưa có xe nào. Bấm "Thêm xe mới" để bắt đầu!'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle) => {
            const status = statusOptions[vehicle.status];
            const StatusIcon = status.icon;
            return (
              <div
                key={vehicle.id}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-agro-dark rounded-xl flex items-center justify-center">
                      <Truck className="w-6 h-6 text-agro-yellow" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-agro-dark text-lg">
                        {vehicle.plate_number}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Sức chứa: {vehicle.capacity_boxes} thùng
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

                {/* Status */}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.color}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>

                {/* Info */}
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
                          {new Date(vehicle.estimated_return_at).toLocaleString(
                            'vi-VN',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                            }
                          )}
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

                {/* Status quick change */}
                {vehicle.status !== 'in_transit' && (
                  <select
                    value={vehicle.status}
                    onChange={(e) => handleStatusChange(vehicle, e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark"
                  >
                    <option value="idle">🟢 Rảnh</option>
                    <option value="maintenance">🔴 Bảo trì</option>
                  </select>
                )}
                {vehicle.status === 'in_transit' && (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-2 text-center">
                    <p className="text-xs text-yellow-700 font-semibold">
                      🚛 Đang vận chuyển
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
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
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
                    {editingVehicle ? 'Sửa thông tin xe' : 'Thêm xe mới'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {editingVehicle
                      ? `Cập nhật xe ${editingVehicle.plate_number}`
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

            {/* Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  Biển số xe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.plate_number}
                  onChange={(e) =>
                    setFormData({ ...formData, plate_number: e.target.value })
                  }
                  placeholder="VD: 51C-12345"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  Sức chứa (số thùng)
                </label>
                <input
                  type="number"
                  value={formData.capacity_boxes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity_boxes: parseInt(e.target.value) || 12,
                    })
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mặc định 12 thùng/xe
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
                  placeholder="VD: Xe tải lạnh 1.5 tấn, đăng kiểm 12/2025..."
                  rows="3"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-gray-100">
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
                {saving ? 'Đang lưu...' : editingVehicle ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}