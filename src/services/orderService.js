import { supabase } from '../lib/supabaseClient';

// Hàm tạo đơn hàng mới
export const createOrder = async (orderData) => {
  const boxes = Math.ceil(orderData.weight / 250);
  const orderCode = `AC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      ...orderData,
      boxes,
      order_code: orderCode,
      status: 'pending',
      temperature: 15
    }])
    .select()
    .single();

  if (orderError) throw orderError;

  // Tự động tạo các thùng tương ứng
  const boxInserts = Array.from({ length: boxes }).map((_, i) => ({
    box_code: `${orderCode}-B${i + 1}`,
    order_id: order.id,
    product_type: orderData.product_type,
    target_temp: '13-15°C',
    current_temp: 15,
    status: 'delivered'
  }));

  const { error: boxError } = await supabase.from('boxes').insert(boxInserts);
  if (boxError) throw boxError;

  return order;
};

// Hàm lấy đơn hàng theo mã
export const getOrderByCode = async (code) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_code', code)
    .single();
  if (error) throw error;
  return data;
};

// Hàm lắng nghe sự thay đổi của đơn hàng (Realtime)
export const subscribeToOrder = (orderCode, callback) => {
  return supabase
    .channel(`order-${orderCode}`)
    .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `order_code=eq.${orderCode}` },
      (payload) => callback(payload.new)
    )
    .subscribe();
};

// Hàm lấy đơn hàng theo số điện thoại (cho User tra cứu)
export const getOrdersByPhone = async (phone) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

// Hàm hủy đơn hàng
export const cancelOrder = async (orderId) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId);
  if (error) throw error;
  return data;
};