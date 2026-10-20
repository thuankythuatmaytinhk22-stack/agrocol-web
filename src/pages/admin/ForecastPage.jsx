import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { analyzeForecast } from '../../lib/forecastingAI';
import { Brain, TrendingUp, Package, Truck, Calendar, AlertCircle } from 'lucide-react';

export default function ForecastPage() {
  const [orders, setOrders] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .neq('status', 'cancelled');
        if (error) throw error;
        
        setOrders(data || []);
        if (data) {
          setForecast(analyzeForecast(data));
        }
      } catch (err) {
        console.error('Lỗi lấy dữ liệu dự báo:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-agro-yellow border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!forecast) return <div className="text-center p-10 text-gray-500">Không có dữ liệu để dự báo.</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 bg-agro-dark text-agro-yellow rounded-xl flex items-center justify-center shadow-lg">
          <Brain className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-agro-dark">AI Dự báo Khách hàng</h2>
          <p className="text-sm text-gray-500">Phân tích xu hướng và dự báo nhu cầu thùng, xe tải, PCM cho tháng tới.</p>
        </div>
      </div>

      {/* Cảnh báo mùa vụ */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
        <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-amber-800">Cảnh báo mùa vụ tháng {forecast.nextMonth}</h3>
          <p className="text-sm text-amber-700 mt-1">
            {forecast.forecastProducts.length > 0 
              ? `Tháng tới là mùa cao điểm của: ${forecast.forecastProducts.map(p => p.product).join(', ')}. Hệ thống dự báo bạn cần chuẩn bị khoảng ${forecast.totalTrucksNeeded} xe tải và ${forecast.totalForecastedBoxes} thùng PCM.`
              : 'Tháng tới không phải là mùa cao điểm của loại nông sản nào. Nhu cầu dự kiến sẽ ổn định.'}
          </p>
        </div>
      </div>

      {/* Các chỉ số dự báo */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5"><TrendingUp className="w-32 h-32 text-agro-dark" /></div>
          <p className="text-sm font-bold text-gray-500 mb-1">Dự báo 7 ngày tới</p>
          <p className="text-4xl font-extrabold text-agro-dark mb-2">{forecast.next7DaysForecast} <span className="text-lg text-gray-500">thùng</span></p>
          <p className="text-sm font-medium text-blue-600 flex items-center gap-1"><Truck className="w-4 h-4"/> Cần ~{forecast.next7DaysTrucks} chuyến xe</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5"><Package className="w-32 h-32 text-agro-dark" /></div>
          <p className="text-sm font-bold text-gray-500 mb-1">Đã đặt trong tháng {forecast.currentMonth}</p>
          <p className="text-4xl font-extrabold text-agro-dark mb-2">{forecast.boxesThisMonth} <span className="text-lg text-gray-500">thùng</span></p>
          <p className="text-sm font-medium text-gray-600">Tổng {forecast.totalOrders} đơn hàng toàn hệ thống</p>
        </div>

        <div className="bg-gradient-to-br from-agro-dark to-[#1a6b52] text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10"><Calendar className="w-32 h-32 text-white" /></div>
          <p className="text-sm font-bold text-white/70 mb-1">Dự báo tháng {forecast.nextMonth}</p>
          <p className="text-4xl font-extrabold text-agro-yellow mb-2">{forecast.totalForecastedBoxes} <span className="text-lg text-white/70">thùng</span></p>
          <p className="text-sm font-medium text-white/90">Cần ~{forecast.totalTrucksNeeded} xe vận chuyển</p>
        </div>
      </div>

      {/* Bảng chi tiết dự báo theo nông sản */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-agro-dark">Chi tiết dự báo nông sản (Tháng {forecast.nextMonth})</h3>
        </div>
        {forecast.forecastProducts.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">
            Không có mặt hàng nào vào mùa trong tháng tới.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-gray-100">
                <th className="px-5 py-3 text-xs font-bold text-gray-500">Nông sản</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500">Dự báo số đơn</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500">Dự báo số thùng</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500">Thùng PCM cần</th>
                <th className="px-5 py-3 text-xs font-bold text-gray-500">Xe tải cần</th>
              </tr>
            </thead>
            <tbody>
              {forecast.forecastProducts.map((p, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-4 font-bold text-agro-dark text-sm">{p.product}</td>
                  <td className="px-5 py-4 text-sm">{p.estimatedOrders} đơn</td>
                  <td className="px-5 py-4 font-semibold text-sm">{p.estimatedBoxes} thùng</td>
                  <td className="px-5 py-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-bold">{p.pcmNeeded} PCM</span></td>
                  <td className="px-5 py-4"><span className="bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs font-bold">{p.trucksNeeded} xe</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}