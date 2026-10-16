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
  Recycle,
  Package,
} from 'lucide-react';

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('delivery'); // 'delivery' hoặc 'pickup'
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
      setDrivers(dData);
      const vData = await getAllVehicles();
      setVehicles(vData);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Lọc theo tab
  const tabDrivers = drivers.filter((d) => {
    const type = d.driver_type || 'delivery';
    return type === activeTab;
  });

  // Lọc thêm theo status + search
  const filteredDrivers = tabDrivers.filter((d) => {
    const matchStatus = filter === 'all' || d.status === filter;
    const matchSearch =
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search) ||
      d.license_number?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Đếm theo trạng thái trong tab hiện tại
  const counts = {
    all: tabDrivers.length,
    available: tabDrivers.filter((d) => d.status === 'available').length,
    on_duty: tabDrivers.filter((d) => d.status === 'on_duty').length,
    off: tabDrivers.filter((d) => d.status === 'off').length,
  };

  // Đếm tổng 2 loại
  const totalDelivery = drivers.filter(
    (d) => (d.driver_type || 'delivery') === 'delivery'
  ).length;
  const totalPickup = drivers.filter(
    (d) => d.driver_type === 'pickup'
  ).length;

  // Mở modal thêm
  const openAddModal = () => {
    setEditingDriver(null);
    setFormData({
      name: '',
      phone: '',
      license_number: '',
      status: 'available',
      years_experience: 0,
      favorite_routes_text: '',
      driver_type: activeTab,
      notes: '',
    });
    setShowModal(true);
  };

  // Mở modal sửa
  const openEditModal = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      license_number: driver.license_number || '',
      status: driver.status,
      years_experience: driver.years_experience || 0,
      favorite_routes_text: (driver.favorite_routes || []).join(', '),
      driver_type: driver.driver_type || 'delivery',
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
        favorite_routes: formData.favorite_routes_text
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
        driver_type: formData.driver_type,
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
    if (
      !window.confirm(
        `Xóa tài xế ${driver.name}? Hành động này không thể hoàn tác.`
      )
    )
      return;
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
    available: {
      label: 'Sẵn sàng',
      color: 'bg-green-100 text-green-700',
      icon: UserCheck,
    },
    on_duty: {
      label: 'Đang làm việc',
      color: 'bg-yellow-100 text-yellow-700',
      icon: Truck,
    },
    off: {
      label: 'Nghỉ',
      color: 'bg-gray-100 text-gray-700',
      icon: Coffee,
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
            <Users className="w-6 h-6" />
            Quản lý Tài xế
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {totalDelivery} tài xế vận chuyển · {totalPickup} tài xế thu hồi
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Thêm {activeTab === 'pickup' ? 'TX thu hồi' : 'TX vận chuyển'}
        </button>
      </div>

      {/* Tabs chính */}
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
          Tài xế vận chuyển
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
          Tài xế thu hồi
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
            ? '🚛 Tài xế vận chuyển — được phân công lái xe có làm lạnh đi giao hàng.'
            : '🚚 Tài xế thu hồi — được phân công lái xe thu hồi thùng rỗng về kho.'}
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
            <span className="text-xs text-green-700 font-semibold">
              Sẵn sàng
            </span>
          </div>
          <p className="text-2xl font-extrabold text-green-700">
            {counts.available}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-yellow-700 font-semibold">
              Đang làm việc
            </span>
          </div>
          <p className="text-2xl font-extrabold text-yellow-700">
            {counts.on_duty}
          </p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-xs text-gray-700 font-semibold">Nghỉ</span>
          </div>
          <p className="text-2xl font-extrabold text-gray-700">
            {counts.off}
          </p>
        </div>
      </div>

      {/* Filter + Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: `Tất cả (${counts.all})` },
            { value: 'available', label: `Sẵn sàng (${counts.available})` },
            { value: 'on_duty', label: `Đang làm (${counts.on_duty})` },
            { value: 'off', label: `Nghỉ (${counts.off})` },
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
            placeholder="Tìm theo tên, SĐT, bằng lái..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark"
          />
        </div>
      </div>

      {/* Grid */}
      {filteredDrivers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
          {activeTab === 'delivery' ? (
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          ) : (
            <Recycle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          )}
          <p className="text-gray-500 font-medium">
            {search || filter !== 'all'
              ? 'Không tìm thấy tài xế nào phù hợp'
              : `Chưa có tài xế ${
                  activeTab === 'pickup' ? 'thu hồi' : 'vận chuyển'
                } nào`}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map((driver) => {
            const status = statusOptions[driver.status];
            const StatusIcon = status.icon;
            const isPickup = driver.driver_type === 'pickup';
            const currentVehicle = vehicles.find(
              (v) => v.id === driver.current_vehicle_id
            );

            return (
              <div
                key={driver.id}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-lg ${
                        isPickup
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-agro-dark text-agro-yellow'
                      }`}
                    >
                      {driver.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-agro-dark">
                        {driver.name}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {driver.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(driver)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-agro-dark transition-colors"
                      title="Sửa"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(driver)}
                      className="p-2 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Loại tài xế */}
                <div className="mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isPickup
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {isPickup ? '🚚 TX thu hồi' : '🚛 TX vận chuyển'}
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

                {/* Info */}
                <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                  {driver.license_number && (
                    <div className="flex items-center gap-2 text-xs">
                      <Award className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">
                        Bằng lái: {driver.license_number}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <Award className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600">
                      Kinh nghiệm: {driver.years_experience || 0} năm
                    </span>
                  </div>
                  {currentVehicle && driver.status === 'on_duty' && (
                    <div className="flex items-center gap-2 text-xs">
                      {isPickup ? (
                        <Recycle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <Truck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="text-gray-600">
                        Đang lái xe:{' '}
                        <strong>{currentVehicle.plate_number}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Favorite routes */}
                {driver.favorite_routes && driver.favorite_routes.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] text-gray-500 font-bold mb-1.5 flex items-center gap-1">
                      <Route className="w-3 h-3" />
                      TUYẾN QUEN THUỘC
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {driver.favorite_routes.slice(0, 3).map((route, i) => (
                        <span
                          key={i}
                          className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                            isPickup
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-green-50 text-agro-dark'
                          }`}
                        >
                          {route}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pt-3 border-t border-gray-100">
                  <span>🚛 {driver.total_trips || 0} chuyến</span>
                  <span>⭐ {driver.years_experience || 0} năm KN</span>
                </div>

                {/* Status change */}
                {driver.status !== 'on_duty' ? (
                  <select
                    value={driver.status}
                    onChange={(e) =>
                      handleStatusChange(driver, e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark"
                  >
                    <option value="available">🟢 Sẵn sàng</option>
                    <option value="off">⚫ Nghỉ</option>
                  </select>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-2 text-center">
                    <p className="text-xs text-yellow-700 font-semibold">
                      {isPickup ? '🚚 Đang thu hồi' : '🚛 Đang giao hàng'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* === MODAL THÊM/SỬA === */}
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
                    formData.driver_type === 'pickup'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-agro-yellow text-agro-dark'
                  }`}
                >
                  {formData.driver_type === 'pickup' ? (
                    <Recycle className="w-5 h-5" />
                  ) : (
                    <Users className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-agro-dark">
                    {editingDriver
                      ? 'Sửa thông tin tài xế'
                      : `Thêm ${
                          formData.driver_type === 'pickup'
                            ? 'TX thu hồi'
                            : 'TX vận chuyển'
                        }`}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {editingDriver
                      ? `Cập nhật ${editingDriver.name}`
                      : 'Điền thông tin tài xế mới'}
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
              {/* Loại tài xế */}
              {!editingDriver && (
                <div>
                  <label className="block text-sm font-bold text-agro-dark mb-2">
                    Loại tài xế
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          driver_type: 'delivery',
                        })
                      }
                      className={`p-3 rounded-xl border-2 text-left transition-colors ${
                        formData.driver_type === 'delivery'
                          ? 'border-agro-yellow bg-agro-yellow/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Truck className="w-5 h-5 text-agro-dark mb-1" />
                      <p className="font-bold text-xs">TX vận chuyển</p>
                      <p className="text-[10px] text-gray-500">
                        Lái xe giao hàng
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          driver_type: 'pickup',
                        })
                      }
                      className={`p-3 rounded-xl border-2 text-left transition-colors ${
                        formData.driver_type === 'pickup'
                          ? 'border-agro-yellow bg-agro-yellow/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Recycle className="w-5 h-5 text-blue-600 mb-1" />
                      <p className="font-bold text-xs">TX thu hồi</p>
                      <p className="text-[10px] text-gray-500">
                        Lái xe thu hồi thùng
                      </p>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  Tên tài xế <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="VD: 0905111111"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  Số bằng lái
                </label>
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={(e) =>
                    setFormData({ ...formData, license_number: e.target.value })
                  }
                  placeholder="VD: B2-123456"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-agro-dark mb-2">
                    Kinh nghiệm (năm)
                  </label>
                  <input
                    type="number"
                    value={formData.years_experience}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        years_experience: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
                  />
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
                    <option value="available">Sẵn sàng</option>
                    <option value="off">Nghỉ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-agro-dark mb-2">
                  Tuyến quen thuộc
                </label>
                <input
                  type="text"
                  value={formData.favorite_routes_text}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      favorite_routes_text: e.target.value,
                    })
                  }
                  placeholder={
                    formData.driver_type === 'pickup'
                      ? 'VD: Đà Nẵng → Kho, Đắk Lắk → Kho'
                      : 'VD: Đắk Lắk → TP.HCM, Đà Lạt → TP.HCM'
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Phân cách bằng dấu phẩy (,)
                </p>
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
                  placeholder="VD: Có kinh nghiệm lái xe đường dài..."
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
                  : editingDriver
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