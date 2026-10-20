import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Settings, Truck, BrainCircuit } from 'lucide-react';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const isPartner = localStorage.getItem('isPartner') === 'true';

  // Đã thêm mục AI Phân loại
  const navItems = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Đặt thùng', path: '/booking' },
    { name: 'Chuyến hàng', path: '/tracking' },
    { name: 'Quản lý đơn', path: '/box-management' },
    { name: 'AI Phân loại hàng', path: '/fruit-scan' }, 
  ];

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isPartner');
    navigate('/');
  };

  const goToPartner = () => {
    localStorage.clear();
    navigate('/partner/login');
  };

  const goToAdmin = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="AgroCold Logo" className="w-12 h-12 object-contain" />
            <span className="text-2xl font-bold text-agro-dark">AgroCold</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  location.pathname === item.path
                    ? 'text-agro-dark border-b-2 border-agro-yellow pb-1'
                    : 'text-gray-600 hover:text-agro-dark'
                }`}
              >
                {/* Thêm icon bộ não cho mục AI cho nổi bật */}
                {item.name === 'AI Phân loại hàng' && <BrainCircuit className="w-4 h-4 text-agro-dark" />}
                {item.name}
              </Link>
            ))}

            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              {isPartner ? (
                <>
                  <Link to="/partner/pickup" className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-lg">
                    <Truck className="w-4 h-4" /> Đối tác Thu hồi
                  </Link>
                  <button onClick={handleLogout} className="text-red-500 hover:text-red-700" title="Đăng xuất">
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button onClick={goToPartner} className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg">
                  <Truck className="w-4 h-4" /> Đăng nhập Đối tác
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              {isAdmin ? (
                <>
                  <Link to="/admin" className="flex items-center gap-1.5 bg-agro-dark text-white text-sm font-bold px-4 py-2 rounded-lg">
                    <Settings className="w-4 h-4" /> Admin Panel
                  </Link>
                  <button onClick={handleLogout} className="text-red-500 hover:text-red-700" title="Đăng xuất">
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button onClick={goToAdmin} className="flex items-center gap-1.5 bg-agro-yellow hover:bg-yellow-500 text-agro-dark text-sm font-bold px-4 py-2 rounded-lg">
                  Đăng nhập Admin
                </button>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}