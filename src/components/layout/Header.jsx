import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Leaf, LogOut } from 'lucide-react';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  const navItems = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Đặt thùng', path: '/booking' },
    { name: 'Chuyến hàng', path: '/tracking' },
    { name: 'Quản lý đơn', path: '/box-management' },
    { name: 'Quản trị viên', path: '/admin' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    navigate('/');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-agro-dark rounded-lg flex items-center justify-center">
              <Leaf className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-agro-dark">AgroCold</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-8">
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
            {isAdmin && (
              <button 
                onClick={handleLogout}
                className="flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Đăng xuất
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}