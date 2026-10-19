import { useState, useEffect } from 'react';
import {
  getAllDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  updateDriverStatus,
} from '../../services/driverService';
import { getAllVehicles } from '../../services/vehicleService';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Phone,
  Award,
  Route,
  Truck,
  CheckCircle,
  Coffee,
  UserCheck,
} from 'lucide-react';

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    license_number: '',
    status: 'available',
    years_experience: 0,
    favorite_routes_text: '',
    driver_type: 'delivery',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const dData = await getAllDrivers();
      // CHỈ LỌC LẤY TÀI XẾ VẬN CHUYỂN (delivery)
      setDrivers(dData.filter(d => d.driver_type !== 'pickup'));
      
      const vData = await getAllVehicles();
      setVehicles(vData);
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingDriver(null);
    setFormData({
      name: '',
      phone: '',
      license_number: '',
      status: 'available',
      years_experience: 0,
      favorite_routes_text: '',
      driver_type: 'delivery',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      license_number: driver.license_number || '',
      status: driver.status,
      years_experience: driver.years_experience || 0,
      favorite_routes_text: (driver.favorite_routes || []).join(', '),
      driver_type: 'delivery',
      notes: driver.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Vui lòng nhập tên và SĐT!');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        license_number: formData.license_number.trim(),
        status: formData.status,
        years_experience: parseInt(formData.years_experience) || 0,
        favorite_routes: formData.favorite_routes_text.split(',').map((r) => r.trim()).filter(Boolean),
        driver_type: 'delivery',
        notes: formData.notes.trim(),
      };

      if (editingDriver) {
        await updateDriver(editingDriver.id, payload);
        alert('Cập nhật tài xế thành công!');
      } else {
        await createDriver(payload);
        alert('Thêm tài xế mới thành công!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (driver) => {
    if (driver.status === 'on_duty') {
      alert('Không thể xóa tài xế đang làm việc!');
      return;
    }
    if (!window.confirm(`Xóa tài xế ${driver.name}?`)) return;
    try {
      await deleteDriver(driver.id);
      alert('Đã xóa tài xế!');
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleStatusChange = async (driver, newStatus) => {
    try {
      await updateDriverStatus(driver.id, newStatus);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const statusOptions = {
    available: { label: 'Sẵn sàng', color: 'bg-green-100 text-green-700', icon: UserCheck },
    on_duty: { label: 'Đang làm việc', color: 'bg-yellow-100 text-yellow-700', icon: Truck },
    off: { label: 'Nghỉ', color: 'bg-gray-100 text-gray-700', icon: Coffee },
  };

  const filteredDrivers = drivers.filter((d) => {
    const matchStatus = filter === 'all' || d.status === filter;
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.phone.includes(search) || d.license_number?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all: drivers.length,
    available: drivers.filter((d) => d.status === 'available').length,
    on_duty: drivers.filter((d) => d.status === 'on_duty').length,
    off: drivers.filter((d) => d.status === 'off').length,
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="w-12 h-12 border-4 border-agro-yellow border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-agro-dark flex items-center gap-2">
            <Users className="w-6 h-6" /> Quản lý Tài xế vận chuyển
          </h2>
          <p className="text-sm text-gray-500 mt-1">Danh sách tài xế lái xe giao hàng</p>
        </div>
        <button onClick={openAddModal} className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-5 py-3 rounded-xl flex items-center gap-2 shadow-sm">
          <Plus className="w-5 h-5" /> Thêm TX vận chuyển
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-semibold mb-1">Tổng</p>
          <p className="text-2xl font-extrabold text-agro-dark">{counts.all}</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
          <p className="text-xs text-green-700 font-semibold mb-1">Sẵn sàng</p>
          <p className="text-2xl font-extrabold text-green-700">{counts.available}</p>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
          <p className="text-xs text-yellow-700 font-semibold mb-1">Đang làm việc</p>
          <p className="text-2xl font-extrabold text-yellow-700">{counts.on_duty}</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <p className="text-xs text-gray-700 font-semibold mb-1">Nghỉ</p>
          <p className="text-2xl font-extrabold text-gray-700">{counts.off}</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex gap-2">
          {['all', 'available', 'on_duty', 'off'].map(status => (
            <button key={status} onClick={() => setFilter(status)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === status ? 'bg-agro-dark text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {status === 'all' ? 'Tất cả' : statusOptions[status].label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Tìm tên, SĐT..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-agro-dark" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.map((driver) => {
          const status = statusOptions[driver.status];
          const StatusIcon = status.icon;
          const currentVehicle = vehicles.find((v) => v.id === driver.current_vehicle_id);

          return (
            <div key={driver.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-agro-dark rounded-xl flex items-center justify-center font-extrabold text-agro-yellow text-lg">{driver.name.charAt(0)}</div>
                  <div>
                    <h3 className="font-extrabold text-agro-dark">{driver.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {driver.phone}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(driver)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(driver)} className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="mb-4">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                  <StatusIcon className="w-3 h-3" /> {status.label}
                </span>
              </div>

              <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                {driver.license_number && <div className="flex items-center gap-2 text-xs"><Award className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-600">Bằng lái: {driver.license_number}</span></div>}
                <div className="flex items-center gap-2 text-xs"><Award className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-600">Kinh nghiệm: {driver.years_experience || 0} năm</span></div>
                {currentVehicle && driver.status === 'on_duty' && <div className="flex items-center gap-2 text-xs"><Truck className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-600">Đang lái: <strong>{currentVehicle.plate_number}</strong></span></div>}
              </div>

              {driver.favorite_routes && driver.favorite_routes.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-gray-500 font-bold mb-1.5 flex items-center gap-1"><Route className="w-3 h-3" /> TUYẾN QUEN THUỘC</p>
                  <div className="flex flex-wrap gap-1">
                    {driver.favorite_routes.slice(0, 3).map((route, i) => <span key={i} className="text-[10px] bg-green-50 text-agro-dark px-2 py-1 rounded-full font-semibold">{route}</span>)}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pt-3 border-t border-gray-100">
                <span>🚛 {driver.total_trips || 0} chuyến</span>
                <span>⭐ {driver.years_experience || 0} năm KN</span>
              </div>

              {driver.status !== 'on_duty' ? (
                <select value={driver.status} onChange={(e) => handleStatusChange(driver, e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-agro-dark">
                  <option value="available">🟢 Sẵn sàng</option>
                  <option value="off">⚫ Nghỉ</option>
                </select>
              ) : (
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-2 text-center"><p className="text-xs text-yellow-700 font-semibold">🚛 Đang giao hàng</p></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-agro-dark">{editingDriver ? 'Sửa thông tin' : 'Thêm TX vận chuyển'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-agro-dark"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-bold mb-2">Tên tài xế <span className="text-red-500">*</span></label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark" /></div>
              <div><label className="block text-sm font-bold mb-2">Số điện thoại <span className="text-red-500">*</span></label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark" /></div>
              <div><label className="block text-sm font-bold mb-2">Số bằng lái</label><input type="text" value={formData.license_number} onChange={(e) => setFormData({ ...formData, license_number: e.target.value })} className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark uppercase" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-bold mb-2">Kinh nghiệm (năm)</label><input type="number" value={formData.years_experience} onChange={(e) => setFormData({ ...formData, years_experience: parseInt(e.target.value) || 0 })} className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark" /></div>
                <div><label className="block text-sm font-bold mb-2">Trạng thái</label><select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark"><option value="available">Sẵn sàng</option><option value="off">Nghỉ</option></select></div>
              </div>
              <div><label className="block text-sm font-bold mb-2">Tuyến quen thuộc</label><input type="text" value={formData.favorite_routes_text} onChange={(e) => setFormData({ ...formData, favorite_routes_text: e.target.value })} placeholder="VD: Đắk Lắk → TP.HCM" className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark" /><p className="text-xs text-gray-500 mt-1">Phân cách bằng dấu phẩy</p></div>
              <div><label className="block text-sm font-bold mb-2">Ghi chú</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="2" className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark resize-none" /></div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={() => setShowModal(false)} className="flex-1 border-2 border-gray-300 hover:bg-gray-50 font-bold py-3 rounded-xl">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-agro-yellow hover:bg-yellow-500 font-bold py-3 rounded-xl disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}