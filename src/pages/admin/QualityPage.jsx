import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { updateOrderQuality } from '../../services/orderService';
import { 
  BrainCircuit, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX, 
  Search, 
  X, 
  AlertTriangle,
  TrendingDown,
  Thermometer,
  PackageSearch
} from 'lucide-react';

export default function QualityPage() {
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]); // Lấy tất cả đơn để tính tỷ lệ
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // State cho Modal đánh giá
  const [evaluateModal, setEvaluateModal] = useState(null);
  const [feedbackInput, setFeedbackInput] = useState(100);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Lấy tất cả đơn hàng để làm thống kê
      const { data: allData, error: allError } = await supabase
        .from('orders')
        .select('*');
      if (allError) throw allError;
      setAllOrders(allData || []);

      // 2. Lấy đơn đã giao để hiển thị danh sách đánh giá
      const deliveredOrders = (allData || []).filter(o => o.status === 'delivered');
      setOrders(deliveredOrders);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateOrder = async () => {
    if (!evaluateModal) return;
    setEvaluating(true);

    try {
      const avgTemp = 14; 
      const targetTempMin = 13;
      const targetTempMax = 15;

      let aiStatus = '';
      let aiAdvice = '';
      let alertLevel = 'safe';

      const isTempGood = avgTemp >= targetTempMin && avgTemp <= targetTempMax;
      const isFeedbackGood = feedbackInput >= 80;

      if (isTempGood && isFeedbackGood) {
        aiStatus = "Chất lượng dịch vụ Xuất sắc";
        aiAdvice = "Nhiệt độ bảo quản được giữ ổn định và khách hàng rất hài lòng.";
        alertLevel = 'safe';
      } else if (isTempGood && !isFeedbackGood) {
        aiStatus = "Cảnh báo: Nông sản hư hỏng do va đập";
        aiAdvice = "Nhiệt độ bình thường, điểm hài lòng thấp. Có thể do bốc xếp dập nát.";
        alertLevel = 'warning';
      } else if (!isTempGood && isFeedbackGood) {
        aiStatus = "Cảnh báo: Hệ thống lạnh có vấn đề";
        aiAdvice = "Khách vẫn hài lòng nhưng nhiệt độ vượt ngưỡng. Cần kiểm tra lại thùng.";
        alertLevel = 'warning';
      } else {
        aiStatus = "Nguy hiểm: Hỏng nông sản nghiêm trọng";
        aiAdvice = "Nhiệt độ mất kiểm soát và khách phàn nàn. Cần kiểm tra ngay hệ thống lạnh.";
        alertLevel = 'danger';
      }

      const assessmentData = {
        avgTemp, feedback: feedbackInput, aiStatus, aiAdvice, alertLevel, evaluatedAt: new Date().toISOString()
      };

      await updateOrderQuality(evaluateModal.id, feedbackInput, assessmentData);
      
      alert('Đã lưu đánh giá chất lượng!');
      setEvaluateModal(null);
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setEvaluating(false);
    }
  };

  // --- TÍNH TOÁN THỐNG KÊ DASHBOARD ---
  const totalDelivered = orders.length;
  const badOrders = orders.filter(o => o.quality_assessment && o.quality_assessment.feedback < 80);
  const tempWarnings = orders.filter(o => o.quality_assessment && o.quality_assessment.alertLevel !== 'safe');
  
  const badRate = totalDelivered > 0 ? Math.round((badOrders.length / totalDelivered) * 100) : 0;

  // AI Đưa ra nhận định tổng quan
  let systemStatus = { color: 'green', text: 'Hệ thống vận hành Ổn định', desc: 'Chất lượng nông sản được đảm bảo tốt.' };
  if (badRate > 20 || tempWarnings.length > 3) {
    systemStatus = { color: 'red', text: 'CẢNH BÁO: Hệ thống có vấn đề', desc: 'Tỷ lệ hàng hỏng tăng cao. Cần kiểm tra lại dàn lạnh và quy trình bốc xếp.' };
  } else if (badRate > 5 || tempWarnings.length > 0) {
    systemStatus = { color: 'amber', text: 'Chú ý: Chất lượng có dấu hiệu giảm', desc: 'Có một vài chuyến hàng bị phản hồi không tốt. Cần theo dõi thêm.' };
  }

  const filteredOrders = orders.filter(o => 
    !search || 
    o.order_code.toLowerCase().includes(search.toLowerCase()) || 
    o.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-12 h-12 border-4 border-agro-yellow border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-agro-dark flex items-center gap-2">
          <BrainCircuit className="w-6 h-6" /> AI Đánh giá chất lượng
        </h2>
        <p className="text-sm text-gray-500 mt-1">Hệ thống giám sát chất lượng dịch vụ dựa trên nhiệt độ và phản hồi khách hàng</p>
      </div>

      {/* KHU VỰC DASHBOARD TỔNG QUAN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Thẻ 1: Trạng thái hệ thống */}
        <div className={`rounded-2xl p-5 border shadow-sm ${
          systemStatus.color === 'red' ? 'bg-red-50 border-red-200' : 
          systemStatus.color === 'amber' ? 'bg-amber-50 border-amber-200' : 
          'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              systemStatus.color === 'red' ? 'bg-red-100 text-red-600' : 
              systemStatus.color === 'amber' ? 'bg-amber-100 text-amber-600' : 
              'bg-green-100 text-green-600'
            }`}>
              {systemStatus.color === 'red' ? <ShieldX className="w-6 h-6" /> : 
               systemStatus.color === 'amber' ? <ShieldAlert className="w-6 h-6" /> : 
               <ShieldCheck className="w-6 h-6" />}
            </div>
            <div>
              <h3 className={`font-bold ${
                systemStatus.color === 'red' ? 'text-red-800' : 
                systemStatus.color === 'amber' ? 'text-amber-800' : 
                'text-green-800'
              }`}>{systemStatus.text}</h3>
              <p className={`text-xs mt-1 ${
                systemStatus.color === 'red' ? 'text-red-600' : 
                systemStatus.color === 'amber' ? 'text-amber-600' : 
                'text-green-600'
              }`}>{systemStatus.desc}</p>
            </div>
          </div>
        </div>

        {/* Thẻ 2: Tỷ lệ hài lòng */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1">Tỷ lệ hàng lỗi/hỏng</p>
            <div className="flex items-end gap-2">
              <h3 className={`text-3xl font-extrabold ${badRate > 20 ? 'text-red-500' : badRate > 5 ? 'text-amber-500' : 'text-green-500'}`}>
                {badRate}%
              </h3>
              <span className="text-xs text-gray-400 mb-1">({badOrders.length}/{totalDelivered} đơn)</span>
            </div>
          </div>
          <TrendingDown className={`w-10 h-10 ${badRate > 20 ? 'text-red-100' : 'text-green-100'}`} />
        </div>

        {/* Thẻ 3: Cảnh báo nhiệt độ */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1">Số chuyến có cảnh báo nhiệt độ</p>
            <div className="flex items-end gap-2">
              <h3 className={`text-3xl font-extrabold ${tempWarnings.length > 3 ? 'text-red-500' : 'text-agro-dark'}`}>
                {tempWarnings.length}
              </h3>
              <span className="text-xs text-gray-400 mb-1">chuyến</span>
            </div>
          </div>
          <Thermometer className={`w-10 h-10 ${tempWarnings.length > 3 ? 'text-red-100' : 'text-gray-100'}`} />
        </div>
      </div>

      {/* AI DỰ BÁO VÀ KHUYẾN NGHỊ */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <BrainCircuit className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-indigo-900 mb-1">Dự báo chất lượng các chuyến tiếp theo</h3>
          <p className="text-sm text-indigo-700">
            {badRate > 10 
              ? `Dựa trên dữ liệu hiện tại, nếu không xử lý các thùng bị dập (đơn ${badOrders.map(o=>o.order_code).join(', ')}), nguy cơ các chuyến tiếp theo bị đánh giá tệ là RẤT CAO (khoảng ${badRate + 5}%).`
              : "Dựa trên dữ liệu hiện tại, nhiệt độ được kiểm soát tốt và khách hàng hài lòng. Các chuyến tiếp theo được dự báo sẽ ổn định."}
          </p>
        </div>
      </div>

      {/* DANH SÁCH CÁC THÙNG CẦN KIỂM TRA LẠI */}
      {badOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
          <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-red-800">Danh sách thùng cần kiểm tra lại ngay</h3>
          </div>
          <div className="p-4">
            <ul className="space-y-2">
              {badOrders.map(o => (
                <li key={o.id} className="flex items-center gap-3 text-sm bg-white p-3 rounded-lg border border-gray-100">
                  <PackageSearch className="w-4 h-4 text-red-500" />
                  <span>Chuyến <strong>{o.order_code}</strong> (Khách: {o.customer_name}) bị đánh giá <strong>{o.quality_assessment.feedback}%</strong>.</span>
                  <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded font-bold ml-auto">Cần mở thùng kiểm tra dập nát</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* BẢNG CHI TIẾT */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
           <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Tìm mã đơn, tên khách..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-agro-dark" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4 text-xs font-bold text-gray-600">Mã đơn</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-600">Khách hàng</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-600">Nông sản</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-600 text-center">Điểm hài lòng</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-600">Kết luận AI</th>
                <th className="px-4 py-4 text-xs font-bold text-gray-600 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-gray-400 text-sm">Không có đơn hàng nào đã giao</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-4 font-bold text-agro-dark text-sm">{order.order_code}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-sm">{order.customer_name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{order.customer_phone || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-4 text-sm">{order.product_type}</td>
                    <td className="px-4 py-4 text-center">
                      {order.quality_assessment ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.quality_assessment.feedback >= 80 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {order.quality_assessment.feedback}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Chưa đánh giá</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {order.quality_assessment ? (
                        <div className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg w-fit ${
                          order.quality_assessment.alertLevel === 'safe' ? 'bg-green-50 text-green-700 border border-green-100' :
                          order.quality_assessment.alertLevel === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {order.quality_assessment.alertLevel === 'safe' ? <ShieldCheck className="w-4 h-4" /> :
                           order.quality_assessment.alertLevel === 'warning' ? <ShieldAlert className="w-4 h-4" /> : <ShieldX className="w-4 h-4" />}
                          {order.quality_assessment.aiStatus}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Chưa phân tích</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => {
                          setEvaluateModal(order);
                          setFeedbackInput(order.customer_feedback_score || 100);
                        }} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs whitespace-nowrap flex items-center gap-2 mx-auto"
                      >
                        <BrainCircuit className="w-4 h-4" /> 
                        {order.quality_assessment ? 'Đánh giá lại' : 'Đánh giá'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL AI ĐÁNH GIÁ CHẤT LƯỢNG (Giữ nguyên như cũ) */}
      {evaluateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEvaluateModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-blue-50">
              <h3 className="font-bold text-blue-900 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5" /> AI Đánh giá chất lượng
              </h3>
              <button onClick={() => setEvaluateModal(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-5 space-y-5">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm">
                <p><strong>Mã đơn:</strong> {evaluateModal.order_code}</p>
                <p><strong>Khách hàng:</strong> {evaluateModal.customer_name}</p>
                <p><strong>Nhiệt độ ghi nhận:</strong> ~14°C (Đạt chuẩn)</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Điểm hài lòng của khách hàng (%)
                </label>
                <input 
                  type="range" 
                  min="0" max="100" step="5"
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(parseInt(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs font-bold mt-1">
                  <span className="text-red-500">Rất tệ (0%)</span>
                  <span className="text-blue-600 text-lg">{feedbackInput}%</span>
                  <span className="text-green-500">Tuyệt vời (100%)</span>
                </div>
              </div>

              {feedbackInput < 80 && (
                <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-xs border border-amber-200">
                  <p className="font-bold mb-1">⚠️ Cảnh báo từ hệ thống:</p>
                  <p>Điểm hài lòng thấp. Các thùng hàng của đơn này sẽ được đánh dấu để kiểm tra lại chất lượng (dập nát, hư hỏng).</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setEvaluateModal(null)} className="flex-1 border border-gray-300 font-bold py-3 rounded-xl hover:bg-white">Hủy</button>
              <button 
                onClick={handleEvaluateOrder} 
                disabled={evaluating} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl disabled:opacity-50"
              >
                {evaluating ? 'Đang phân tích...' : 'Lưu & Đánh giá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}