import { supabase } from '../lib/supabaseClient';
import { calcBoxes, matchProduct } from '../lib/coldChain';

export const HUB_ADDRESS = 'Kho lạnh AgroCold - 123 Lê Duẩn, TP. Buôn Ma Thuột, Đắk Lắk';
export const HUB_COORDS = { lat: 12.6662, lng: 108.0382 };

export const createOrder = async (orderData, totalPrice, depositAmount) => {
  const weight = parseFloat(orderData.weight);
  const boxes = calcBoxes(weight);
  const product = matchProduct(orderData.product_type);
  const orderCode = `AC-${new Date().getFullYear()}-${Math.floor(
    10000 + Math.random() * 90000
  )}`;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([
      {
        ...orderData,
        weight: weight,
        boxes,
        order_code: orderCode,
        status: 'pending',
        temperature: product.minTemp,
        pickup_time: orderData.pickup_time || null,
        pickup_address: HUB_ADDRESS,
        pickup_lat: HUB_COORDS.lat,
        pickup_lng: HUB_COORDS.lng,
        delivery_lat: orderData.delivery_lat || null,
        delivery_lng: orderData.delivery_lng || null,
        total_price: totalPrice,
        deposit_amount: depositAmount,
        deposit_status: 'unpaid' // Mặc định là chưa cọc
      },
    ])
    .select()
    .single();

  if (orderError) throw orderError;

  const boxInserts = Array.from({ length: boxes }).map((_, i) => ({
    box_code: `${orderCode}-B${i + 1}`,
    order_id: order.id,
    product_type: orderData.product_type,
    target_temp: `${product.minTemp}-${product.maxTemp}°C`,
    current_temp: product.minTemp,
    status: 'delivered',
  }));

  const { error: boxError } = await supabase.from('boxes').insert(boxInserts);
  if (boxError) throw boxError;

  return order;
};

// Cập nhật trạng thái cọc
export const updateDepositStatus = async (orderId, status) => {
  const { error } = await supabase
    .from('orders')
    .update({ deposit_status: status })
    .eq('id', orderId);
  if (error) throw error;
};

// Xóa đơn hàng
export const deleteOrder = async (orderId) => {
  // Xóa các bảng liên quan trước khi xóa đơn (nếu có)
  await supabase.from('boxes').delete().eq('order_id', orderId);
  await supabase.from('order_assignments').delete().eq('order_id', orderId);
  
  const { error } = await supabase.from('orders').delete().eq('id', orderId);
  if (error) throw error;
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
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `order_code=eq.${orderCode}`,
      },
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