import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Lock } from 'lucide-react';

// Mật khẩu cố định cho đối tác
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
    <div className="min-h-screen flex items-center justify-center bg-[#1a2332] px-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-agro-yellow rounded-2xl flex items-center justify-center">
            <Truck className="w-8 h-8 text-agro-dark" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-agro-dark mb-2">Đăng nhập Đối tác</h1>
        <p className="text-sm text-center text-gray-500 mb-6">Dành cho đối tác vận tải thu gom thùng</p>

        <div className="relative mb-6">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
            placeholder="Nhập mật khẩu đối tác"
            className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-agro-dark" 
          />
        </div>
        
        <button type="submit"
          className="w-full bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 rounded-xl transition-colors">
          ĐĂNG NHẬP
        </button>
        
        <p className="text-center text-xs text-gray-400 mt-4">
          Mật khẩu mẫu: doitac123
        </p>
      </form>
    </div>
  );
}