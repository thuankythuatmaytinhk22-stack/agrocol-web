import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getVehicleStats } from '../../services/vehicleService';
import { getDriverStats } from '../../services/driverService';
import StatCard from '../../components/admin/StatCard';
import RevenueSection from '../../components/admin/RevenueSection';
import {
  Package,
  Truck,
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Recycle,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    shipping: 0,
    delivered: 0,
    cancelled: 0,
    revenue: 0,
  });
  const [vehicleStats, setVehicleStats] = useState({
    total: 0,
    idle: 0,
    inTransit: 0,
    maintenance: 0,
  });
  const [driverStats, setDriverStats] = useState({
    total: 0,
    available: 0,
    onDuty: 0,
    off: 0,
  });
  const [boxStats, setBoxStats] = useState({
    total: 0,
    delivered: 0,
    waitingReturn: 0,
    atHub: 0,
    ready: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      // 1. Lấy đơn hàng
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (orders) {
        const totalRevenue = orders
          .filter((o) => o.status !== 'cancelled')
          .reduce((sum, o) => sum + (o.boxes || 0) * 250000, 0);

        setOrderStats({
          total: orders.length,
          pending: orders.filter((o) => o.status === 'pending').length,
          shipping: orders.filter((o) => o.status === 'shipping').length,
          delivered: orders.filter((o) => o.status === 'delivered').length,
          cancelled: orders.filter((o) => o.status === 'cancelled').length,
          revenue: totalRevenue,
        });

        setRecentOrders(orders.slice(0, 5));

        // Biểu đồ 7 ngày
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dayOrders = orders.filter((o) =>
            o.created_at?.startsWith(dateStr)
          );
          last7Days.push({
            date: dateStr,
            day: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
            count: dayOrders.length,
          });
        }
        setChartData(last7Days);
      }

      // 2. Lấy thống kê xe
      try {
        const vStats = await getVehicleStats();
        setVehicleStats(vStats);
      } catch (e) {
        console.error('Lỗi lấy stats xe:', e);
      }

      // 3. Lấy thống kê tài xế
      try {
        const dStats = await getDriverStats();
        setDriverStats(dStats);
      } catch (e) {
        console.error('Lỗi lấy stats tài xế:', e);
      }

      // 4. Lấy thống kê thùng
      const { data: boxes } = await supabase.from('boxes').select('status');
      if (boxes) {
        setBoxStats({
          total: boxes.length,
          delivered: boxes.filter((b) => b.status === 'delivered').length,
          waitingReturn: boxes.filter((b) => b.status === 'waiting_return').length,
          atHub: boxes.filter((b) => b.status === 'at_hub').length,
          ready: boxes.filter((b) => b.status === 'ready').length,
        });
      }

      // 5. Tạo cảnh báo
      const newAlerts = [];
      if (orders) {
        const pendingOrders = orders.filter((o) => o.status === 'pending');
        if (pendingOrders.length > 0) {
          newAlerts.push({
            type: 'warning',
            icon: Clock,
            title: `${pendingOrders.length} đơn hàng đang chờ xử lý`,
            description: 'Cần phân công xe và tài xế',
            link: '/admin/orders',
          });
        }
      }
      if (vehicleStats.maintenance > 0) {
        newAlerts.push({
          type: 'danger',
          icon: AlertTriangle,
          title: `${vehicleStats.maintenance} xe đang bảo trì`,
          description: 'Kiểm tra tiến độ bảo trì',
          link: '/admin/vehicles',
        });
      }
      if (boxStats.waitingReturn > 10) {
        newAlerts.push({
          type: 'warning',
          icon: Recycle,
          title: `${boxStats.waitingReturn} thùng chờ thu hồi`,
          description: 'Cần điều phối thu hồi',
          link: '/admin/boxes',
        });
      }
      setAlerts(newAlerts);

      setLoading(false);
    } catch (err) {
      console.error('Lỗi fetch data:', err);
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const maxChartValue = Math.max(...chartData.map((d) => d.count), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-agro-yellow border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-agro-dark to-[#1a6b52] rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl font-extrabold mb-1">👋 Chào mừng trở lại!</h2>
        <p className="text-white/80 text-sm">
          Đây là bảng điều khiển tổng quan của hệ thống AgroCold. Theo dõi đơn hàng, đội xe và tài xế trong thời gian thực.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          value={orderStats.total}
          label="Tổng đơn hàng"
          color="blue"
        />
        <StatCard
          icon={Truck}
          value={`${vehicleStats.idle}/${vehicleStats.total}`}
          label="Xe rảnh / Tổng"
          color="green"
        />
        <StatCard
          icon={Users}
          value={driverStats.total}
          label="Tài xế"
          color="purple"
        />
        <StatCard
          icon={DollarSign}
          value={formatCurrency(orderStats.revenue)}
          label="Doanh thu dự kiến"
          color="dark"
        />
      </div>

      {/* Row 2: Order + Vehicle stats */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Order breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-agro-dark text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Trạng thái đơn hàng
            </h3>
            <Link
              to="/admin/orders"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-500 font-semibold">Chờ xử lý</span>
              </div>
              <p className="text-2xl font-extrabold text-agro-dark">{orderStats.pending}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="w-4 h-4 text-yellow-600" />
                <span className="text-xs text-yellow-700 font-semibold">Đang vận chuyển</span>
              </div>
              <p className="text-2xl font-extrabold text-yellow-700">{orderStats.shipping}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700 font-semibold">Đã giao</span>
              </div>
              <p className="text-2xl font-extrabold text-green-700">{orderStats.delivered}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-700 font-semibold">Đã hủy</span>
              </div>
              <p className="text-2xl font-extrabold text-red-700">{orderStats.cancelled}</p>
            </div>
          </div>
        </div>

        {/* Vehicle status */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-agro-dark text-lg flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Trạng thái đội xe
            </h3>
            <Link
              to="/admin/vehicles"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="font-semibold text-sm text-green-800">Xe rảnh</span>
              </div>
              <span className="text-2xl font-extrabold text-green-700">
                {vehicleStats.idle}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="font-semibold text-sm text-yellow-800">Đang vận chuyển</span>
              </div>
              <span className="text-2xl font-extrabold text-yellow-700">
                {vehicleStats.inTransit}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="font-semibold text-sm text-red-800">Đang bảo trì</span>
              </div>
              <span className="text-2xl font-extrabold text-red-700">
                {vehicleStats.maintenance}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Chart + Alerts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart 7 days */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-agro-dark text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Đơn hàng 7 ngày qua
            </h3>
          </div>
          <div className="flex items-end justify-between gap-2 h-48">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-agro-dark">
                  {d.count}
                </span>
                <div
                  className="w-full bg-gradient-to-t from-agro-dark to-agro-green rounded-t-lg transition-all duration-500 hover:opacity-80"
                  style={{
                    height: `${(d.count / maxChartValue) * 100}%`,
                    minHeight: d.count > 0 ? '8px' : '4px',
                  }}
                ></div>
                <span className="text-[10px] text-gray-500 font-semibold uppercase">
                  {d.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-agro-dark text-lg flex items-center gap-2 mb-5">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Cảnh báo
          </h3>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">
                Không có cảnh báo nào. Mọi thứ ổn!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, i) => {
                const Icon = alert.icon;
                const colorMap = {
                  warning: 'bg-amber-50 border-amber-100 text-amber-700',
                  danger: 'bg-red-50 border-red-100 text-red-700',
                };
                return (
                  <Link
                    key={i}
                    to={alert.link}
                    className={`block p-3 rounded-xl border ${colorMap[alert.type]} hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">{alert.title}</p>
                        <p className="text-xs opacity-80 mt-0.5">{alert.description}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Recent orders + Box stats */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-agro-dark text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Đơn hàng gần đây
            </h3>
            <Link
              to="/admin/orders"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentOrders.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-sm">
                Chưa có đơn hàng nào
              </p>
            ) : (
              recentOrders.map((order) => {
                const statusMap = {
                  pending: 'bg-gray-100 text-gray-700',
                  packed: 'bg-blue-100 text-blue-700',
                  shipping: 'bg-yellow-100 text-yellow-700',
                  delivered: 'bg-green-100 text-green-700',
                  cancelled: 'bg-red-100 text-red-700',
                };
                const statusLabel = {
                  pending: 'Chờ xử lý',
                  packed: 'Đã đóng',
                  shipping: 'Đang giao',
                  delivered: 'Đã giao',
                  cancelled: 'Đã hủy',
                };
                return (
                  <div
                    key={order.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 bg-agro-bg rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-agro-dark" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-agro-dark truncate">
                        {order.order_code}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {order.customer_name} · {order.product_type} · {order.boxes} thùng
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${statusMap[order.status]}`}
                    >
                      {statusLabel[order.status]}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Box stats */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-agro-dark text-lg flex items-center gap-2">
              <Recycle className="w-5 h-5" />
              Thùng lạnh
            </h3>
            <Link
              to="/admin/boxes"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              Chi tiết <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 font-medium">Tổng thùng</span>
              <span className="font-bold text-agro-dark">{boxStats.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 font-medium">Đã giao</span>
              <span className="font-bold text-green-600">{boxStats.delivered}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 font-medium">Chờ thu hồi</span>
              <span className="font-bold text-yellow-600">{boxStats.waitingReturn}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 font-medium">Đã về Hub</span>
              <span className="font-bold text-blue-600">{boxStats.atHub}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 font-medium">Sẵn sàng</span>
              <span className="font-bold text-purple-600">{boxStats.ready}</span>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-agro-green h-full transition-all duration-500"
                  style={{
                    width: `${
                      boxStats.total > 0
                        ? (boxStats.ready / boxStats.total) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center font-medium">
                {boxStats.total > 0
                  ? `${Math.round((boxStats.ready / boxStats.total) * 100)}% sẵn sàng tái sử dụng`
                  : 'Chưa có dữ liệu'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* === SECTION DOANH THU === */}
      <div className="mt-6">
        <RevenueSection />
      </div>
    </div>
  );
}