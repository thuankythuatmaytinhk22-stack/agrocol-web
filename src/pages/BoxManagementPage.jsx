import { useState } from 'react';
import { getOrdersByPhone, cancelOrder } from '../services/orderService';
import { Search, XCircle, CheckCircle, Package, QrCode, Recycle, Clock, Home, Truck, MapPin } from 'lucide-react';

export default function BoxManagementPage() {
  const [searchPhone, setSearchPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const data = await getOrdersByPhone(searchPhone);
      setOrders(data);
      if (data.length > 0) setCustomerName(data[0].customer_name);
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này? Thao tác này không thể hoàn tác.')) return;
    try {
      await cancelOrder(orderId);
      alert('Đã hủy đơn hàng thành công!');
      const data = await getOrdersByPhone(searchPhone);
      setOrders(data);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const getStatusColor = (status) => {
    const map = {
      'pending': 'bg-gray-100 text-gray-700',
      'packed': 'bg-blue-100 text-blue-700',
      'shipping': 'bg-yellow-100 text-yellow-700',
      'delivered': 'bg-green-100 text-green-700',
      'cancelled': 'bg-red-100 text-red-700',
    };
    return map[status] || map['pending'];
  };

  const getStatusLabel = (status) => {
    const map = {
      'pending': 'Đã đặt',
      'packed': 'Đã đóng hàng',
      'shipping': 'Đang vận chuyển',
      'delivered': 'Đã giao',
      'cancelled': 'Đã hủy',
    };
    return map[status] || 'Đã đặt';
  };

  return (
    <div className="bg-agro-bg min-h-screen py-12 font-sans">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-agro-dark mb-2">Quản lý đơn hàng</h1>
        <p className="text-gray-500 mb-8 font-medium">Nhập số điện thoại đã dùng khi đặt hàng để tra cứu.</p>

        {/* FORM TÌM KIẾM */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <input 
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="Nhập số điện thoại (VD: 0905xxxxxx)"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
              required
            />
            <button type="submit" className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-8 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
              <Search className="w-5 h-5" /> TÌM KIẾM
            </button>
          </form>
        </div>

        {/* KẾT QUẢ */}
        {loading && <p className="text-center py-10 text-agro-dark font-semibold">Đang tìm kiếm...</p>}
        
        {searched && !loading && orders.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500 font-medium">Không tìm thấy đơn hàng nào với SĐT này.</p>
          </div>
        )}

        {orders.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-agro-dark mb-6">
              Xin chào, {customerName}! Bạn có {orders.length} đơn hàng.
            </h2>
            
            {/* MỖI ĐƠN HÀNG LÀ MỘT CẶP THẺ */}
            <div className="space-y-8">
              {orders.map((order) => (
                <div key={order.id} className="grid lg:grid-cols-2 gap-6">
                  
                  {/* === THẺ BÊN TRÁI: QR FRESHNESS PASSPORT === */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                          <QrCode className="w-5 h-5 text-agro-dark" />
                        </div>
                        <h3 className="text-lg font-bold text-agro-dark">QR Freshness Passport</h3>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="flex gap-5 items-start">
                      {/* QR Code giả lập */}
                      <div className="w-28 h-28 border-4 border-agro-dark rounded-xl p-2 grid grid-cols-4 gap-1 flex-shrink-0">
                        {[...Array(16)].map((_, i) => (
                          <div key={i} className={`bg-agro-dark ${Math.random() > 0.4 ? 'opacity-100' : 'opacity-0'}`}></div>
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-bold text-agro-dark mb-1 truncate">Thùng {order.order_code}</h4>
                        <p className="text-gray-600 text-sm mb-1 font-medium">Sầu riêng</p>
                        <p className="text-gray-600 text-sm mb-1 font-medium">Nhiệt độ mục tiêu: 13-15°C</p>
                        <p className="text-sm font-bold text-agro-dark">
                          Temperature Status: Within Range
                        </p>
                      </div>
                    </div>

                    <button className="w-full mt-5 bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 rounded-xl transition-colors">
                      XEM FRESHNESS PASSPORT
                    </button>
                  </div>

                  {/* === THẺ BÊN PHẢI: THU HỒI THÙNG === */}
                  <div className="bg-agro-dark rounded-2xl p-6 shadow-sm text-white">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                        <Recycle className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold">Thu hồi thùng</h3>
                    </div>

                    <p className="text-agro-yellow font-bold text-lg mb-5">
                      {order.boxes} thùng đang chờ thu hồi
                    </p>

                    {/* Timeline */}
                    <div className="flex justify-between items-center mb-6 relative">
                      <div className="absolute top-5 left-0 right-0 h-0.5 bg-white/20 z-0"></div>
                      <div className="absolute top-5 left-0 h-0.5 bg-agro-yellow z-0" style={{ width: '50%' }}></div>
                      
                      {[
                        { id: 1, label: 'Đã giao', icon: CheckCircle, status: 'done' },
                        { id: 2, label: 'Chờ thu hồi', icon: Clock, status: 'active' },
                        { id: 3, label: 'Đã về Hub', icon: Home, status: 'pending' },
                        { id: 4, label: 'Sẵn sàng tái sử dụng', icon: Recycle, status: 'pending' },
                      ].map((step) => {
                        const Icon = step.icon;
                        return (
                          <div key={step.id} className="flex flex-col items-center z-10 w-1/4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2
                              ${step.status === 'done' ? 'bg-agro-green text-white' : 
                                step.status === 'active' ? 'bg-agro-yellow text-agro-dark' : 
                                'bg-white/10 text-white/50'}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className={`text-xs text-center font-medium ${step.status === 'pending' ? 'text-gray-400' : 'text-white'}`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Nút hành động */}
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <button 
                        onClick={() => handleCancelOrder(order.id)}
                        className="w-full bg-white hover:bg-gray-100 text-red-600 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" /> HỦY ĐƠN HÀNG
                      </button>
                    )}
                    {order.status === 'cancelled' && (
                      <div className="w-full bg-red-500/20 text-red-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-red-500/30">
                        <XCircle className="w-5 h-5" /> ĐÃ HỦY
                      </div>
                    )}
                    {order.status === 'delivered' && (
                      <div className="w-full bg-green-500/20 text-green-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-green-500/30">
                        <CheckCircle className="w-5 h-5" /> ĐÃ GIAO THÀNH CÔNG
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}