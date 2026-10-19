import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { AlertTriangle, X } from 'lucide-react';
import { resolveAlert } from '../../services/iotService';

export default function GlobalAlertPopup() {
  const [popupAlert, setPopupAlert] = useState(null);

  useEffect(() => {
    // Lắng nghe cảnh báo mới từ Supabase Realtime
    const channel = supabase
      .channel('global-iot-alerts-popup')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'iot_alerts' },
        (payload) => {
          const newAlert = payload.new;
          setPopupAlert(newAlert);
          // Tự động đóng popup sau 8 giây
          setTimeout(() => setPopupAlert(null), 8000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleResolve = async () => {
    if (!popupAlert) return;
    try {
      await resolveAlert(popupAlert.id, 'admin');
      setPopupAlert(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (!popupAlert) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] animate-slide-in">
      <div
        className={`w-96 p-5 rounded-2xl shadow-2xl border-l-8 ${
          popupAlert.severity === 'critical'
            ? 'bg-red-50 border-red-600'
            : 'bg-amber-50 border-amber-500'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                popupAlert.severity === 'critical' ? 'bg-red-100' : 'bg-amber-100'
              }`}
            >
              <AlertTriangle
                className={`w-6 h-6 ${
                  popupAlert.severity === 'critical'
                    ? 'text-red-600'
                    : 'text-amber-600'
                }`}
              />
            </div>
            <div>
              <h4
                className={`font-bold ${
                  popupAlert.severity === 'critical'
                    ? 'text-red-800'
                    : 'text-amber-800'
                }`}
              >
                {popupAlert.severity === 'critical'
                  ? 'CẢNH BÁO NGHIÊM TRỌNG'
                  : 'CẢNH BÁO NHIỆT ĐỘ'}
              </h4>
              <p className="text-sm text-gray-700 mt-1 font-medium">
                {popupAlert.message}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Nhiệt độ hiện tại:{' '}
                <strong>{popupAlert.temperature?.toFixed(1)}°C</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setPopupAlert(null)}
            className="text-gray-400 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleResolve}
            className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold py-2 rounded-lg"
          >
            Đã xử lý
          </button>
          <Link
            to="/admin/iot"
            onClick={() => setPopupAlert(null)}
            className={`flex-1 text-center text-xs font-bold py-2 rounded-lg text-white ${
              popupAlert.severity === 'critical'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            Xem chi tiết
          </Link>
        </div>
      </div>
    </div>
  );
}