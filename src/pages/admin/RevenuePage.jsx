import { useState, useEffect } from 'react';
import {
  getTodayRevenue,
  getWeekRevenue,
  getMonthRevenue,
  getTotalRevenue,
  getDailyRevenue,
  getTopProducts,
  getTopCustomers,
  formatVND,
  formatVNDFull,
  exportToCSV,
  PRICE_PER_BOX,
} from '../../services/revenueService';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Package,
  Award,
  Download,
  Users,
  RefreshCw,
} from 'lucide-react';

export default function RevenuePage() {
  const [today, setToday] = useState(null);
  const [week, setWeek] = useState(null);
  const [month, setMonth] = useState(null);
  const [total, setTotal] = useState(null);
  const [daily, setDaily] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Lấy tháng và năm hiện tại
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [t, w, m, tt, d, tp, tc] = await Promise.all([
        getTodayRevenue(),
        getWeekRevenue(),
        getMonthRevenue(),
        getTotalRevenue(),
        getDailyRevenue(currentMonth, currentYear), // Sửa thành lấy theo tháng hiện tại
        getTopProducts(5, 30),
        getTopCustomers(5, 30),
      ]);
      setToday(t);
      setWeek(w);
      setMonth(m);
      setTotal(tt);
      setDaily(d);
      setTopProducts(tp);
      setTopCustomers(tc);
    } catch (err) {
      console.error('Lỗi fetch revenue:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleExport = () => {
    if (!week?.orders || week.orders.length === 0) {
      alert('Không có đơn hàng nào để xuất!');
      return;
    }
    exportToCSV(week.orders);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-agro-yellow border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const maxDaily = Math.max(...daily.map((d) => d.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-agro-dark flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Báo cáo Doanh thu
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Thống kê doanh thu · {formatVNDFull(PRICE_PER_BOX)}/thùng
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-white hover:bg-gray-50 text-agro-dark font-bold px-4 py-2.5 rounded-xl border border-gray-200 text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={handleExport}
            className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Xuất CSV
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-agro-dark to-[#1a6b52] text-white rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-agro-yellow" />
            <span className="text-xs font-semibold opacity-80">Hôm nay</span>
          </div>
          <p className="text-3xl font-extrabold text-agro-yellow">
            {formatVND(today?.totalRevenue || 0)}
          </p>
          <p className="text-xs opacity-70 mt-1">
            {today?.totalOrders || 0} đơn · {today?.totalBoxes || 0} thùng
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-gray-500">
              7 ngày qua
            </span>
          </div>
          <p className="text-3xl font-extrabold text-agro-dark">
            {formatVND(week?.totalRevenue || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {week?.totalOrders || 0} đơn · {week?.totalBoxes || 0} thùng
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold text-gray-500">
              30 ngày qua
            </span>
          </div>
          <p className="text-3xl font-extrabold text-agro-dark">
            {formatVND(month?.totalRevenue || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {month?.totalOrders || 0} đơn · {month?.totalBoxes || 0} thùng
          </p>
        </div>

        <div className="bg-green-50 rounded-2xl p-5 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-green-600" />
            <span className="text-xs font-semibold text-green-700">
              Tổng cộng
            </span>
          </div>
          <p className="text-3xl font-extrabold text-green-700">
            {formatVND(total?.totalRevenue || 0)}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {total?.totalOrders || 0} đơn · {total?.totalBoxes || 0} thùng
          </p>
        </div>
      </div>

      {/* Biểu đồ Tháng */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-agro-dark text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Doanh thu Tháng {currentMonth}/{currentYear}
          </h3>
          <span className="text-xs text-gray-500 font-medium">Đơn vị: VNĐ</span>
        </div>

        {daily.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Chưa có dữ liệu
          </div>
        ) : (
          <div className="flex items-end justify-between gap-1 h-64 mt-4 border-b border-gray-100 pb-2">
            {daily.map((d, i) => {
              const height = (d.revenue / maxDaily) * 100;
              
              // Dùng hàm split để lấy ngày, tránh lỗi Invalid Date
              const dateParts = d.date.split('-');
              const dayNum = parseInt(dateParts[2], 10);
              
              // Chỉ hiện nhãn ngày 1, 5, 10, 15, 20, 25, 30
              const showLabel = dayNum === 1 || dayNum % 5 === 0 || dayNum === daily.length;
              
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end gap-2 group relative min-w-[15px] h-full"
                >
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-agro-dark text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap">
                      Ngày {dayNum}/{currentMonth}: {formatVNDFull(d.revenue)}
                      <br />
                      {d.orders} đơn
                    </div>
                  </div>

                  {/* Nếu có doanh thu mới vẽ cột, không thì ẩn đi */}
                  {d.revenue > 0 ? (
                    <div
                      className="w-full bg-gradient-to-t from-agro-dark to-agro-green rounded-t-md transition-all duration-500 hover:opacity-80 cursor-pointer"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    ></div>
                  ) : (
                    <div className="w-full h-0"></div>
                  )}
                  
                  <span className={`text-[9px] font-semibold ${showLabel ? 'text-gray-600' : 'text-transparent'}`}>
                    {dayNum}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top nông sản + Top khách hàng */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-agro-dark text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Top nông sản
            </h3>
            <span className="text-[10px] text-gray-500 font-medium">
              30 ngày
            </span>
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => {
                const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i] || `${i + 1}.`;
                const percent =
                  topProducts[0].revenue > 0
                    ? (p.revenue / topProducts[0].revenue) * 100
                    : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg flex-shrink-0">{medal}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-agro-dark truncate">
                          {p.product}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {p.orders} đơn · {p.boxes} thùng
                        </p>
                      </div>
                      <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                        {formatVND(p.revenue)}
                      </span>
                    </div>
                    <div className="ml-8 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="bg-agro-green h-full rounded-full"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-agro-dark text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Top khách hàng
            </h3>
            <span className="text-[10px] text-gray-500 font-medium">
              30 ngày
            </span>
          </div>

          {topCustomers.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Chưa có dữ liệu
            </div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => {
                const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i] || `${i + 1}.`;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg flex-shrink-0">{medal}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-agro-dark truncate">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {c.phone} · {c.orders} đơn · {c.boxes} thùng
                      </p>
                    </div>
                    <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                      {formatVND(c.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bảng chi tiết */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-agro-dark text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Chi tiết đơn hàng 7 ngày qua ({week?.orders?.length || 0} đơn)
          </h3>
        </div>

        {!week?.orders || week.orders.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Chưa có đơn hàng nào trong 7 ngày qua
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-xs font-bold text-gray-600">
                    Mã đơn
                  </th>
                  <th className="px-3 py-2 text-xs font-bold text-gray-600">
                    Khách hàng
                  </th>
                  <th className="px-3 py-2 text-xs font-bold text-gray-600">
                    Nông sản
                  </th>
                  <th className="px-3 py-2 text-xs font-bold text-gray-600 text-center">
                    Số thùng
                  </th>
                  <th className="px-3 py-2 text-xs font-bold text-gray-600 text-right">
                    Doanh thu
                  </th>
                  <th className="px-3 py-2 text-xs font-bold text-gray-600">
                    Ngày
                  </th>
                </tr>
              </thead>
              <tbody>
                {week.orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-50 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 text-xs font-bold text-agro-dark">
                      {order.order_code}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {order.customer_name || 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {order.product_type}
                    </td>
                    <td className="px-3 py-2 text-xs text-center font-semibold">
                      {order.boxes}
                    </td>
                    <td className="px-3 py-2 text-xs text-right font-bold text-green-600">
                      {formatVNDFull((order.boxes || 0) * PRICE_PER_BOX)}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}