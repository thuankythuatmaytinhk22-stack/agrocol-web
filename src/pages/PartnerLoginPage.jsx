import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

const PARTNER_PASSWORD = 'doitac123';

export default function PartnerLoginPage() {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === PARTNER_PASSWORD) {
      localStorage.setItem('isPartner', 'true');
      navigate('/partner/pickup');
    } else {
      alert('Sai mật khẩu đối tác!');
    }
  };

  return (
    <div className="bg-agro-bg min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <form onSubmit={handleLogin} className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-md border border-gray-100">
        <div className="flex justify-center mb-6">
          <img src="/logo.jpg" alt="AgroCold Logo" className="w-24 h-24 object-contain" />
        </div>

        <h1 className="text-2xl font-bold text-agro-dark mb-2 text-center">
          Đăng nhập Đối tác
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8 font-medium">
          Dành riêng cho đối tác vận tải thu gom thùng
        </p>
        
        <div className="relative mb-6">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu đối tác"
            className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="w-full bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 rounded-xl transition-colors text-lg"
        >
          ĐĂNG NHẬP
        </button>

        <p className="text-xs text-gray-400 text-center mt-6">
          Mật khẩu mẫu: <span className="font-bold text-gray-500">doitac123</span>
        </p>
      </form>
    </div>
  );
}