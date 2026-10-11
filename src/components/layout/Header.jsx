import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Leaf, LogOut, Settings } from 'lucide-react';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  const navItems = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Đặt thùng', path: '/booking' },
    { name: 'Chuyến hàng', path: '/tracking' },
    { name: 'Quản lý đơn', path: '/box-management' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    navigate('/');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="AgroCold Logo"
              className="w-12 h-12 object-contain"
            />
            <span className="text-2xl font-bold text-agro-dark">AgroCold</span>
          </Link>
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
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 bg-agro-yellow hover:bg-yellow-500 text-agro-dark text-sm font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Đăng nhập Admin
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}