import { supabase } from '../lib/supabaseClient';

export const createOrder = async (orderData) => {
  // ÉP KIỂU SỐ CHO WEIGHT ĐỂ TRÁNH LỖI TÍNH TOÁN
  const weight = parseFloat(orderData.weight);
  const boxes = Math.ceil(weight / 250);
  const orderCode = `AC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      ...orderData,
      weight: weight, // Lưu số đã ép kiểu
      boxes,
      order_code: orderCode,
      status: 'pending',
      temperature: 15
    }])
    .select()
    .single();

  if (orderError) throw orderError;

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

export const getOrderByCode = async (code) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('order_code', code)
    .single();
  if (error) throw error;
  return data;
};

export const subscribeToOrder = (orderCode, callback) => {
  return supabase
    .channel(`order-${orderCode}`)
    .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `order_code=eq.${orderCode}` },
      (payload) => callback(payload.new)
    )
    .subscribe();
};

export const getOrdersByPhone = async (phone) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const cancelOrder = async (orderId) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId);
  if (error) throw error;
  return data;
};