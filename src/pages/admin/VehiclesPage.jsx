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
    vehicle_type: 'delivery', // Mặc định là xe vận chuyển
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const data = await getAllVehicles();
      // CHỈ LỌC LẤY XE VẬN CHUYỂN (delivery)
      const deliveryVehicles = data.filter(v => v.vehicle_type !== 'pickup');
      setVehicles(deliveryVehicles);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingVehicle(null);
    setFormData({
      plate_number: '',
      capacity_boxes: 12,
      status: 'idle',
      vehicle_type: 'delivery',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      plate_number: vehicle.plate_number,
      capacity_boxes: vehicle.capacity_boxes,
      status: vehicle.status,
      vehicle_type: 'delivery',
      notes: vehicle.notes || '',
    });
    setShowModal(true);
  };

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

  const handleDelete = async (vehicle) => {
    if (vehicle.status === 'in_transit') {
      alert('Không thể xóa xe đang vận chuyển!');
      return;
    }
    if (!window.confirm(`Xóa xe ${vehicle.plate_number}?`)) return;
    try {
      await deleteVehicle(vehicle.id);
      alert('Đã xóa xe!');
      fetchVehicles();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleStatusChange = async (vehicle, newStatus) => {
    try {
      await updateVehicleStatus(vehicle.id, newStatus);
      fetchVehicles();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const statusOptions = {
    idle: { label: 'Rảnh', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    in_transit: { label: 'Đang chạy', color: 'bg-yellow-100 text-yellow-700', icon: Truck },
    maintenance: { label: 'Bảo trì', color: 'bg-red-100 text-red-700', icon: Wrench },
  };

  const filteredVehicles = vehicles.filter((v) => {
    const matchStatus = filter === 'all' || v.status === filter;
    const matchSearch = !search || v.plate_number.toLowerCase().includes(search.toLowerCase()) || v.notes?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all: vehicles.length,
    idle: vehicles.filter((v) => v.status === 'idle').length,
    in_transit: vehicles.filter((v) => v.status === 'in_transit').length,
    maintenance: vehicles.filter((v) => v.status === 'maintenance').length,
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-agro-yellow border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-agro-dark flex items-center gap-2">
            <Truck className="w-6 h-6" /> Quản lý Xe vận chuyển
          </h2>
          <p className="text-sm text-gray-500 mt-1">Danh sách xe tải lạnh giao hàng</p>
        </div>
        <button onClick={openAddModal} className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-5 py-3 rounded-xl flex items-center gap-2 shadow-sm">
          <Plus className="w-5 h-5" /> Thêm xe vận chuyển
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-semibold mb-1">Tổng xe</p>
          <p className="text-2xl font-extrabold text-agro-dark">{counts.all}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <p className="text-xs text-green-700 font-semibold mb-1">Rảnh</p>
          <p className="text-2xl font-extrabold text-green-700">{counts.idle}</p>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
          <p className="text-xs text-yellow-700 font-semibold mb-1">Đang chạy</p>
          <p className="text-2xl font-extrabold text-yellow-700">{counts.in_transit}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
          <p className="text-xs text-red-700 font-semibold mb-1">Bảo trì</p>
          <p className="text-2xl font-extrabold text-red-700">{counts.maintenance}</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex gap-2">
          {['all', 'idle', 'in_transit', 'maintenance'].map(status => (
            <button key={status} onClick={() => setFilter(status)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === status ? 'bg-agro-dark text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {status === 'all' ? 'Tất cả' : statusOptions[status].label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Tìm biển số..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map((vehicle) => {
          const status = statusOptions[vehicle.status];
          const StatusIcon = status.icon;
          return (
            <div key={vehicle.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-agro-dark rounded-xl flex items-center justify-center"><Truck className="w-6 h-6 text-agro-yellow" /></div>
                  <div>
                    <h3 className="font-extrabold text-agro-dark text-lg">{vehicle.plate_number}</h3>
                    <p className="text-xs text-gray-500">Sức chứa: {vehicle.capacity_boxes} thùng</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(vehicle)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(vehicle)} className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              
              <div className="mb-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                  <StatusIcon className="w-3 h-3" /> {status.label}
                </span>
              </div>

              {vehicle.status === 'in_transit' && (
                <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                  {vehicle.current_route && <div className="flex items-start gap-2 text-xs"><Route className="w-3.5 h-3.5 text-gray-400 mt-0.5" /><span className="text-gray-600">{vehicle.current_route}</span></div>}
                  {vehicle.estimated_return_at && <div className="flex items-center gap-2 text-xs"><Clock className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-600">Dự kiến về: {new Date(vehicle.estimated_return_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span></div>}
                </div>
              )}

              {vehicle.notes && <p className="text-xs text-gray-500 italic mb-4">💬 {vehicle.notes}</p>}

              <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pt-3 border-t border-gray-100">
                <span>🚛 {vehicle.total_trips || 0} chuyến</span>
                <span>📏 {Math.round(vehicle.total_km || 0)} km</span>
              </div>

              {vehicle.status !== 'in_transit' ? (
                <select value={vehicle.status} onChange={(e) => handleStatusChange(vehicle, e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark">
                  <option value="idle">🟢 Rảnh</option>
                  <option value="maintenance">🔴 Bảo trì</option>
                </select>
              ) : (
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-2 text-center"><p className="text-xs text-yellow-700 font-semibold">🚛 Đang vận chuyển</p></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-agro-dark">{editingVehicle ? 'Sửa thông tin xe' : 'Thêm xe vận chuyển'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-agro-dark"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">Biển số xe <span className="text-red-500">*</span></label>
                <input type="text" value={formData.plate_number} onChange={(e) => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })} placeholder="VD: 51C-12345" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark" />
              </div>
              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">Sức chứa (số thùng)</label>
                <input type="number" value={formData.capacity_boxes} onChange={(e) => setFormData({ ...formData, capacity_boxes: parseInt(e.target.value) || 12 })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark" />
                <p className="text-xs text-gray-500 mt-1">Mặc định 12 thùng/xe</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">Trạng thái</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark">
                  <option value="idle">🟢 Rảnh</option>
                  <option value="maintenance">🔴 Bảo trì</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">Ghi chú</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="VD: Xe tải lạnh 1.5 tấn" rows="3" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark resize-none" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-3 rounded-xl">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 rounded-xl disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}