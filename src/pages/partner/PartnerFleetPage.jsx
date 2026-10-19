import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Truck, Users, LogOut, Plus, Search, Edit, Trash2, X, CheckCircle, Wrench, Route, Clock, Phone, Award, Coffee, UserCheck } from 'lucide-react';

export default function PartnerFleetPage() {
  const [activeTab, setActiveTab] = useState('vehicles'); // 'vehicles' hoặc 'drivers'
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State (Dùng chung cho cả Xe và Tài xế)
  const [formData, setFormData] = useState({
    plate_number: '',
    capacity_boxes: 30,
    status: 'idle',
    name: '',
    phone: '',
    license_number: '',
    years_experience: 0,
    favorite_routes_text: '',
    notes: '',
  });

  useEffect(() => {
    if (localStorage.getItem('isPartner') !== 'true') {
      navigate('/partner/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Lấy xe thu hồi
      const { data: vData } = await supabase.from('vehicles').select('*').eq('vehicle_type', 'pickup');
      setVehicles(vData || []);

      // Lấy tài xế thu hồi
      const { data: dData } = await supabase.from('drivers').select('*').eq('driver_type', 'pickup');
      setDrivers(dData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isPartner');
    navigate('/partner/login');
  };

  // Mở Modal Thêm
  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      plate_number: '', capacity_boxes: 30, status: 'idle', notes: '',
      name: '', phone: '', license_number: '', years_experience: 0, favorite_routes_text: '',
    });
    setShowModal(true);
  };

  // Mở Modal Sửa
  const openEditModal = (item) => {
    setEditingItem(item);
    if (activeTab === 'vehicles') {
      setFormData({
        plate_number: item.plate_number, capacity_boxes: item.capacity_boxes, status: item.status, notes: item.notes || '',
        name: '', phone: '', license_number: '', years_experience: 0, favorite_routes_text: '',
      });
    } else {
      setFormData({
        plate_number: '', capacity_boxes: 30, status: 'idle', notes: item.notes || '',
        name: item.name, phone: item.phone, license_number: item.license_number || '', years_experience: item.years_experience || 0, favorite_routes_text: (item.favorite_routes || []).join(', '),
      });
    }
    setShowModal(true);
  };

  // Lưu (Thêm hoặc Sửa)
  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === 'vehicles') {
        const payload = {
          plate_number: formData.plate_number.toUpperCase(),
          capacity_boxes: formData.capacity_boxes,
          max_boxes: formData.capacity_boxes,
          status: formData.status,
          vehicle_type: 'pickup',
          notes: formData.notes,
        };
        if (editingItem) {
          await supabase.from('vehicles').update(payload).eq('id', editingItem.id);
        } else {
          await supabase.from('vehicles').insert([payload]);
        }
      } else {
        const payload = {
          name: formData.name,
          phone: formData.phone,
          license_number: formData.license_number,
          years_experience: parseInt(formData.years_experience) || 0,
          favorite_routes: formData.favorite_routes_text.split(',').map(r => r.trim()).filter(Boolean),
          status: formData.status,
          driver_type: 'pickup',
          notes: formData.notes,
        };
        if (editingItem) {
          await supabase.from('drivers').update(payload).eq('id', editingItem.id);
        } else {
          await supabase.from('drivers').insert([payload]);
        }
      }
      alert('Lưu thành công!');
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Xóa
  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa?')) return;
    try {
      if (activeTab === 'vehicles') {
        await supabase.from('vehicles').delete().eq('id', id);
      } else {
        await supabase.from('drivers').delete().eq('id', id);
      }
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  if (loading) return <div className="p-20 text-center">Đang tải...</div>;

  return (
    <div className="bg-gray-50 min-h-screen py-8 font-sans">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-agro-dark flex items-center gap-2">
              <Truck className="w-6 h-6" /> Quản lý Đội xe & Tài xế (Thu hồi)
            </h1>
            <p className="text-gray-500 text-sm mt-1">Quản lý xe và tài xế của đối tác</p>
          </div>
          <div className="flex gap-3">
            <button onClick={openAddModal} className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-4 py-2 rounded-xl flex items-center gap-2">
              <Plus className="w-5 h-5" /> Thêm mới
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-600 font-bold hover:text-red-800 px-4 py-2 rounded-lg hover:bg-red-50">
              <LogOut className="w-5 h-5" /> Đăng xuất
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm flex gap-2">
          <button onClick={() => setActiveTab('vehicles')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm ${activeTab === 'vehicles' ? 'bg-agro-dark text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Truck className="w-4 h-4" /> Xe thu hồi ({vehicles.length})
          </button>
          <button onClick={() => setActiveTab('drivers')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm ${activeTab === 'drivers' ? 'bg-agro-dark text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Users className="w-4 h-4" /> Tài xế thu hồi ({drivers.length})
          </button>
        </div>

        {/* Nội dung: Danh sách Xe */}
        {activeTab === 'vehicles' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map(v => (
              <div key={v.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><Truck className="w-5 h-5" /></div>
                    <div>
                      <h3 className="font-bold text-agro-dark">{v.plate_number}</h3>
                      <p className="text-xs text-gray-500">Sức chứa: {v.max_boxes || v.capacity_boxes} thùng</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(v)} className="p-1 text-gray-400 hover:text-agro-dark"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(v.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="mb-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${v.status === 'idle' ? 'bg-green-100 text-green-700' : v.status === 'in_transit' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {v.status === 'idle' ? 'Rảnh' : v.status === 'in_transit' ? 'Đang chạy' : 'Bảo trì'}
                  </span>
                </div>
                {v.notes && <p className="text-xs text-gray-500 italic mt-2">💬 {v.notes}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Nội dung: Danh sách Tài xế */}
        {activeTab === 'drivers' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map(d => (
              <div key={d.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-agro-dark text-agro-yellow rounded-xl flex items-center justify-center font-bold">{d.name.charAt(0)}</div>
                    <div>
                      <h3 className="font-bold text-agro-dark">{d.name}</h3>
                      <p className="text-xs text-gray-500">{d.phone}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditModal(d)} className="p-1 text-gray-400 hover:text-agro-dark"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(d.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="mb-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${d.status === 'available' ? 'bg-green-100 text-green-700' : d.status === 'on_duty' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                    {d.status === 'available' ? 'Sẵn sàng' : d.status === 'on_duty' ? 'Đang làm' : 'Nghỉ'}
                  </span>
                </div>
                {d.favorite_routes && d.favorite_routes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {d.favorite_routes.map((r, i) => <span key={i} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">{r}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MODAL THÊM/SỬA */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-agro-dark">{editingItem ? 'Sửa' : 'Thêm'} {activeTab === 'vehicles' ? 'Xe thu hồi' : 'Tài xế thu hồi'}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
              </div>
              
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {activeTab === 'vehicles' ? (
                  <>
                    <div>
                      <label className="block text-sm font-bold mb-1">Biển số xe</label>
                      <input type="text" value={formData.plate_number} onChange={e => setFormData({...formData, plate_number: e.target.value.toUpperCase()})} className="w-full border rounded-lg p-3" placeholder="VD: 51C-99999" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Sức chứa (thùng)</label>
                      <input type="number" value={formData.capacity_boxes} onChange={e => setFormData({...formData, capacity_boxes: parseInt(e.target.value) || 30})} className="w-full border rounded-lg p-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Trạng thái</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border rounded-lg p-3">
                        <option value="idle">Rảnh</option>
                        <option value="maintenance">Bảo trì</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-bold mb-1">Tên tài xế</label>
                      <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg p-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Số điện thoại</label>
                      <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border rounded-lg p-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Bằng lái</label>
                      <input type="text" value={formData.license_number} onChange={e => setFormData({...formData, license_number: e.target.value})} className="w-full border rounded-lg p-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Kinh nghiệm (năm)</label>
                      <input type="number" value={formData.years_experience} onChange={e => setFormData({...formData, years_experience: e.target.value})} className="w-full border rounded-lg p-3" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1">Trạng thái</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border rounded-lg p-3">
                        <option value="available">Sẵn sàng</option>
                        <option value="off">Nghỉ</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-bold mb-1">Ghi chú</label>
                  <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows="2" className="w-full border rounded-lg p-3" />
                </div>
              </div>

              <div className="p-5 border-t bg-gray-50 flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 font-bold py-2.5 rounded-xl hover:bg-white">Hủy</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-agro-yellow font-bold py-2.5 rounded-xl hover:bg-yellow-500 disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}