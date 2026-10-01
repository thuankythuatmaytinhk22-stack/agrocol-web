import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

const ADMIN_PASSWORD = 'agrocold2026';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('isAdmin', 'true');
      navigate('/admin');
    } else {
      alert('Sai mật khẩu!');
    }
  };

  return (
    <div className="bg-agro-bg min-h-screen flex items-center justify-center px-4 font-sans">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md border border-gray-100">
        <div className="flex justify-center mb-6">
          <img src="/logo.jpg" alt="AgroCold Logo" className="w-24 h-24 object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-agro-dark mb-2 text-center">Đăng nhập Admin</h1>
        <p className="text-sm text-gray-500 text-center mb-6 font-medium">Chỉ dành cho quản trị viên AgroCold</p>
        
        <div className="relative mb-6">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
            required
          />
        </div>
        
        <button type="submit" className="w-full bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 rounded-xl transition-colors text-lg">
          ĐĂNG NHẬP
        </button>
      </form>
    </div>
  );
}