import { useState, useEffect } from 'react';
import { getBoxStats } from '../services/boxService';
import { QrCode, Recycle, CheckCircle, Clock, Home } from 'lucide-react';

export default function BoxManagementPage() {
  const [stats, setStats] = useState({ waitingReturn: 0, atHub: 0, ready: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getBoxStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleRequestReturn = () => {
    alert('Đã gửi yêu cầu thu hồi thùng thành công!');
  };

  const steps = [
    { id: 1, label: 'Đã giao', icon: CheckCircle, status: 'done' },
    { id: 2, label: 'Chờ thu hồi', icon: Clock, status: 'active' },
    { id: 3, label: 'Đã về Hub', icon: Home, status: 'pending' },
    { id: 4, label: 'Sẵn sàng tái sử dụng', icon: Recycle, status: 'pending' },
  ];

  if (loading) return <div className="text-center py-20">Đang tải...</div>;

  return (
    <div className="bg-agro-bg min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-agro-dark mb-8">Quản lý thùng</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* QR Freshness Passport */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-agro-dark" />
              </div>
              <h2 className="text-xl font-bold text-agro-dark">QR Freshness Passport</h2>
            </div>

            <div className="flex gap-6 items-start">
              <div className="w-32 h-32 border-4 border-agro-dark rounded-xl p-2 grid grid-cols-4 gap-1">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className={`bg-agro-dark ${Math.random() > 0.4 ? 'opacity-100' : 'opacity-0'}`}></div>
                ))}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-agro-dark mb-2">Thùng AGC-00125</h3>
                <p className="text-gray-600 mb-1">Sầu riêng</p>
                <p className="text-gray-600 mb-1">Nhiệt độ mục tiêu: 13-15°C</p>
                <p className="font-semibold text-agro-dark">Temperature Status: Within Range</p>
              </div>
            </div>

            <button className="w-full mt-6 bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 rounded-xl transition-colors">
              XEM FRESHNESS PASSPORT
            </button>
          </div>

          {/* Thu hồi thùng */}
          <div className="bg-agro-dark rounded-2xl p-6 shadow-sm text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Recycle className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold">Thu hồi thùng</h2>
            </div>

            <p className="text-agro-yellow font-bold text-lg mb-6">
              {stats.waitingReturn} thùng đang chờ thu hồi
            </p>

            <div className="flex justify-between items-center mb-8 relative">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-white/20 z-0"></div>
              <div className="absolute top-5 left-0 h-0.5 bg-agro-yellow z-0" style={{ width: '25%' }}></div>
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.id} className="flex flex-col items-center z-10 w-1/4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2
                      ${step.status === 'done' ? 'bg-agro-green text-white' : 
                        step.status === 'active' ? 'bg-agro-yellow text-agro-dark' : 
                        'bg-white/10 text-white/50'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-center text-gray-300">{step.label}</span>
                  </div>
                );
              })}
            </div>

            <button onClick={handleRequestReturn}
              className="w-full bg-white hover:bg-gray-100 text-agro-dark font-bold py-3 rounded-xl transition-colors">
              YÊU CẦU THU HỒI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}