import { supabase } from '../lib/supabaseClient';

// Lấy thông tin thùng dựa theo mã đơn hàng
export const getBoxesByOrderCode = async (orderCode) => {
  const { data: order } = await supabase.from('orders').select('id').eq('order_code', orderCode).single();
  if (!order) return [];

  const { data, error } = await supabase
    .from('boxes')
    .select('*')
    .eq('order_id', order.id);
  if (error) throw error;
  return data;
};

// Cập nhật trạng thái thùng
export const updateBoxStatus = async (boxCode, newStatus) => {
  const { data, error } = await supabase
    .from('boxes')
    .update({ status: newStatus })
    .eq('box_code', boxCode);
  if (error) throw error;
  return data;
};

// Lấy toàn bộ danh sách thùng
export const getAllBoxes = async () => {
  const { data, error } = await supabase
    .from('boxes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

// Lấy thống kê số lượng thùng theo trạng thái
export const getBoxStats = async () => {
  const { data, error } = await supabase.from('boxes').select('status');
  if (error) throw error;
  
  return {
    waitingReturn: data.filter(b => b.status === 'delivered' || b.status === 'waiting_return').length,
    atHub: data.filter(b => b.status === 'at_hub').length,
    ready: data.filter(b => b.status === 'ready').length,
  };
};