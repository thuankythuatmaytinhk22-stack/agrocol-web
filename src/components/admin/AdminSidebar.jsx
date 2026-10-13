import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  Route,
  Recycle,
  BarChart3,
  Settings,
  LogOut,
  Leaf,
  ChevronRight,
  Activity,
  Bell,
} from 'lucide-react';
import { countUnresolvedAlerts, subscribeToAlerts } from '../../services/iotService';

const menuGroups = [
  {
    title: 'TỔNG QUAN',
    items: [
      { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: 'QUẢN LÝ ĐƠN HÀNG',
    items: [
      { name: 'Tất cả đơn hàng', path: '/admin/orders', icon: Package },
      { name: 'Quản lý thùng', path: '/admin/boxes', icon: Recycle },
    ],
  },
  {
    title: 'QUẢN LÝ ĐỘI XE',
    items: [
      { name: 'Danh sách xe', path: '/admin/vehicles', icon: Truck },
      { name: 'Danh sách tài xế', path: '/admin/drivers', icon: Users },
      { name: 'Điều phối AI', path: '/admin/dispatch', icon: Route },
    ],
  },
  {
    title: 'GIÁM SÁT IoT',
    items: [
      { name: 'Nhiệt độ realtime', path: '/admin/iot', icon: Activity, badge: 'alerts' },
    ],
  },
  {
    title: 'BÁO CÁO',
    items: [
      { name: 'Thống kê', path: '/admin/reports', icon: BarChart3 },
      { name: 'Cài đặt', path: '/admin/settings', icon: Settings },
    ],
  },
];

export default function AdminSidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    // Đếm ban đầu
    countUnresolvedAlerts()
      .then(setAlertCount)
      .catch(() => setAlertCount(0));

    // Lắng nghe cảnh báo mới
    const channel = subscribeToAlerts(() => {
      setAlertCount((prev) => prev + 1);
    });

    return () => channel.unsubscribe();
  }, []);

  const handleLogout = () => {
    if (window.confirm('Bạn có chắc muốn đăng xuất?')) {
      localStorage.removeItem('isAdmin');
      navigate('/');
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 h-full w-64 bg-[#1a2332] text-white z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 bg-agro-yellow rounded-lg flex items-center justify-center flex-shrink-0">
            <Leaf className="w-6 h-6 text-agro-dark" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight">AGROCOLD</h1>
            <p className="text-[10px] text-white/60 tracking-wider">ADMIN PANEL</p>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="mb-4">
              <p className="px-5 py-2 text-[10px] font-bold text-white/40 tracking-wider">
                {group.title}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const showBadge = item.badge === 'alerts' && alertCount > 0;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors relative ${
                        isActive
                          ? 'bg-agro-yellow text-agro-dark border-l-4 border-white'
                          : 'text-white/70 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{item.name}</span>
                        {showBadge && (
                          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5">
                            {alertCount > 99 ? '99+' : alertCount}
                          </span>
                        )}
                        {isActive && !showBadge && <ChevronRight className="w-3 h-3" />}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-agro-green rounded-full flex items-center justify-center font-bold text-sm">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">Quản Trị Viên</p>
              <p className="text-[10px] text-white/50 truncate">admin@agrocold.vn</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-semibold py-2 rounded-lg text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}