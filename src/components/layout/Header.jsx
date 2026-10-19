import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Leaf, LogOut, Settings, Truck, User } from 'lucide-react';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Kiểm tra trạng thái đăng nhập
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const isPartner = localStorage.getItem('isPartner') === 'true';

  // Tự động dọn dẹp nếu phát hiện đăng nhập cả 2
  useEffect(() => {
    if (isAdmin && isPartner) {
      // Nếu đang ở trang của bên nào thì ưu tiên giữ bên đó, xóa bên kia
      if (location.pathname.includes('/partner')) {
        localStorage.removeItem('isAdmin');
      } else if (location.pathname.includes('/admin')) {
        localStorage.removeItem('isPartner');
      } else {
        // Nếu ở trang chủ mà có cả 2, xóa đối tác (ưu tiên admin)
        localStorage.removeItem('isPartner');
      }
    }
  }, [location.pathname, isAdmin, isPartner]);

  const navItems = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Đặt thùng', path: '/booking' },
    { name: 'Chuyến hàng', path: '/tracking' },
    { name: 'Quản lý đơn', path: '/box-management' },
  ];

  // Hàm đăng xuất chung: Xóa sạch cả 2 quyền
  const handleLogoutAll = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isPartner');
    navigate('/');
  };

  // Hàm chuyển sang trang Đăng nhập Đối tác (xóa quyền Admin trước)
  const handleGoToPartnerLogin = () => {
    localStorage.removeItem('isAdmin');
    navigate('/partner/login');
  };

  // Hàm chuyển sang trang Đăng nhập Admin (xóa quyền Đối tác trước)
  const handleGoToAdminLogin = () => {
    localStorage.removeItem('isPartner');
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="AgroCold Logo" className="w-12 h-12 object-contain" />
            <span className="text-2xl font-bold text-agro-dark">AgroCold</span>
          </Link>

          {/* Menu chính */}
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-semibold transition-colors ${
                  location.pathname === item.path
                    ? 'text-agro-dark border-b-2 border-agro-yellow pb-1'
                    : 'text-gray-600 hover:text-agro-dark'
                }`}
              >
                {item.name}
              </Link>
            ))}

            {/* Nút Đối tác */}
            {isPartner ? (
              <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                <Link
                  to="/partner/pickup"
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  <Truck className="w-4 h-4" />
                  Đối tác Thu hồi
                </Link>
                {/* Chỉ hiện nút đăng xuất chung ở đây nếu không phải admin */}
                {!isAdmin && (
                  <button
                    onClick={handleLogoutAll}
                    className="flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleGoToPartnerLogin}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
              >
                <Truck className="w-4 h-4" />
                Đăng nhập Đối tác
              </button>
            )}

            {/* Nút Admin */}
            {isAdmin ? (
              <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 bg-agro-dark hover:bg-agro-dark/90 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Admin Panel
                </Link>
                {/* Nút đăng xuất chung */}
                <button
                  onClick={handleLogoutAll}
                  className="flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoToAdminLogin}
                className="flex items-center gap-1.5 bg-agro-yellow hover:bg-yellow-500 text-agro-dark text-sm font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Đăng nhập Admin
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}