import { useState } from 'react';
import { getOrdersByPhone, cancelOrder } from '../services/orderService';
import { Search, Package, XCircle, CheckCircle } from 'lucide-react';

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
      // Tải lại danh sách
      const data = await getOrdersByPhone(searchPhone);
      setOrders(data);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { label: 'Đã đặt', color: 'bg-gray-100 text-gray-700' },
      'packed': { label: 'Đã đóng hàng', color: 'bg-blue-100 text-blue-700' },
      'shipping': { label: 'Đang vận chuyển', color: 'bg-yellow-100 text-yellow-700' },
      'delivered': { label: 'Đã giao', color: 'bg-green-100 text-green-700' },
      'cancelled': { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
    };
    const s = statusMap[status] || statusMap['pending'];
    return <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.color}`}>{s.label}</span>;
  };

  return (
    <div className="bg-agro-bg min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-agro-dark mb-2">Quản lý đơn hàng</h1>
        <p className="text-gray-500 mb-8">Nhập số điện thoại đã dùng khi đặt hàng để tra cứu.</p>

        {/* FORM TÌM KIẾM */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <input 
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="Nhập số điện thoại (VD: 0905xxxxxx)"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-agro-dark"
              required
            />
            <button type="submit" className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-8 py-3 rounded-xl flex items-center justify-center gap-2">
              <Search className="w-5 h-5" /> TÌM KIẾM
            </button>
          </form>
        </div>

        {/* KẾT QUẢ */}
        {loading && <p className="text-center py-10 text-agro-dark font-semibold">Đang tìm kiếm...</p>}
        
        {searched && !loading && orders.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500">Không tìm thấy đơn hàng nào với SĐT này.</p>
          </div>
        )}

        {orders.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-agro-dark mb-4">
              Xin chào, {customerName}! Bạn có {orders.length} đơn hàng.
            </h2>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Package className="w-5 h-5 text-agro-dark" />
                        <p className="font-bold text-agro-dark text-lg">{order.order_code}</p>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-semibold">Nông sản:</span> {order.product_type}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-semibold">Khối lượng:</span> {order.weight} kg ({order.boxes} thùng)
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Lộ trình:</span> {order.pickup_address} → {order.delivery_address}
                      </p>
                    </div>
                    
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <button 
                        onClick={() => handleCancelOrder(order.id)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-colors"
                      >
                        <XCircle className="w-5 h-5" /> HỦY ĐƠN
                      </button>
                    )}
                    {order.status === 'cancelled' && (
                      <div className="flex items-center gap-2 text-red-600 font-semibold">
                        <XCircle className="w-5 h-5" /> Đã hủy
                      </div>
                    )}
                    {order.status === 'delivered' && (
                      <div className="flex items-center gap-2 text-green-600 font-semibold">
                        <CheckCircle className="w-5 h-5" /> Đã giao thành công
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