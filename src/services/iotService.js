import { supabase } from '../lib/supabaseClient';

// Ngưỡng nhiệt độ
export const TEMP_MIN = 13.0;
export const TEMP_MAX = 15.0;

// === LẤY DỮ LIỆU MỚI NHẤT CỦA 1 THIẾT BỊ ===
export const getLatestReading = async (deviceId = 'esp32-c3-01') => {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
};

// === LẤY LỊCH SỬ N GIỜ GẦN NHẤT ===
export const getReadingsHistory = async (hours = 6, deviceId = 'esp32-c3-01') => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('device_id', deviceId)
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

// === LẤY DANH SÁCH ĐƠN ĐANG VẬN CHUYỂN KÈM NHIỆT ĐỘ MỚI NHẤT ===
export const getShippingOrdersWithTemp = async () => {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'shipping')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!orders || orders.length === 0) return [];

  // Lấy nhiệt độ mới nhất
  const { data: latestSensor } = await supabase
    .from('sensor_readings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Gắn nhiệt độ vào mỗi đơn
  return orders.map((order) => ({
    ...order,
    latest_temp: latestSensor?.temperature ?? null,
    temp_status: latestSensor?.status ?? null,
    temp_updated_at: latestSensor?.created_at ?? null,
    device_id: latestSensor?.device_id ?? null,
  }));
};

// === LẤY LỊCH SỬ NHIỆT ĐỘ THEO ĐƠN HÀNG ===
// (Dùng chung sensor, nên lấy từ lúc đơn bắt đầu giao)
export const getOrderTemperatureHistory = async (orderId) => {
  // Lấy thời gian bắt đầu giao (khi status chuyển sang shipping)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('created_at, send_date')
    .eq('id', orderId)
    .single();
  if (orderError) throw orderError;

  // Lấy từ lúc bắt đầu đơn hàng
  const startTime = order.send_date
    ? new Date(order.send_date).toISOString()
    : new Date(order.created_at).toISOString();

  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .gte('created_at', startTime)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

// === LẮNG NGHE REALTIME ===
export const subscribeToSensor = (deviceId, callback) => {
  return supabase
    .channel(`sensor-${deviceId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sensor_readings',
        filter: `device_id=eq.${deviceId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();
};

// === LẤY DANH SÁCH CẢNH BÁO CHƯA XỬ LÝ ===
export const getUnresolvedAlerts = async () => {
  const { data, error } = await supabase
    .from('iot_alerts')
    .select('*')
    .eq('is_resolved', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

// === ĐẾM CẢNH BÁO CHƯA XỬ LÝ ===
export const countUnresolvedAlerts = async () => {
  const { count, error } = await supabase
    .from('iot_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('is_resolved', false);
  if (error) throw error;
  return count || 0;
};

// === TẠO CẢNH BÁO MỚI (CÓ GẮN MÃ ĐƠN HÀNG) ===
export const createAlert = async ({
  deviceId,
  temperature,
  alertType,
  severity = 'warning',
  message,
  orderCode = null,
  orderId = null,
}) => {
  const { data, error } = await supabase
    .from('iot_alerts')
    .insert([
      {
        device_id: deviceId,
        temperature,
        alert_type: alertType,
        severity,
        message,
        order_code: orderCode,
        order_id: orderId,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
};

// === ĐÁNH DẤU CẢNH BÁO ĐÃ XỬ LÝ ===
export const resolveAlert = async (alertId, resolvedBy = 'admin') => {
  const { data, error } = await supabase
    .from('iot_alerts')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedBy,
    })
    .eq('id', alertId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// === LẮNG NGHE CẢNH BÁO REALTIME ===
export const subscribeToAlerts = (callback) => {
  return supabase
    .channel('iot-alerts')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'iot_alerts' },
      (payload) => callback(payload.new)
    )
    .subscribe();
};

// === XÁC ĐỊNH TRẠNG THÁI TỪ NHIỆT ĐỘ ===
export const getTemperatureStatus = (temp) => {
  if (temp >= TEMP_MIN && temp <= TEMP_MAX) {
    return { level: 'ideal', label: 'An toàn', color: 'green', icon: '✓' };
  }
  if (temp > TEMP_MAX) {
    return { level: 'too_high', label: 'Quá cao', color: 'red', icon: '⚠' };
  }
  return { level: 'too_low', label: 'Quá thấp', color: 'blue', icon: '❄' };
};

// === FORMAT THỜI GIAN TƯƠNG ĐỐI ===
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 10) return 'vừa xong';
  if (diff < 60) return `${diff} giây trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
};

// === FORMAT NHIỆT ĐỘ ===
export const formatTemp = (temp) => {
  if (temp === null || temp === undefined) return '--';
  return `${Number(temp).toFixed(1)}°C`;
};