import { supabase } from '../lib/supabaseClient';

// Giá mỗi thùng (250.000đ)
export const PRICE_PER_BOX = 250000;

// === LẤY DOANH THU THEO KHOẢNG THỜI GIAN ===
export const getRevenueByDateRange = async (startDate, endDate) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });
  if (error) throw error;

  const orders = data || [];
  const totalRevenue = orders.reduce(
    (sum, o) => sum + (o.boxes || 0) * PRICE_PER_BOX,
    0
  );

  return {
    orders,
    totalRevenue,
    totalOrders: orders.length,
    totalBoxes: orders.reduce((sum, o) => sum + (o.boxes || 0), 0),
    averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
  };
};

// === LẤY DOANH THU HÔM NAY ===
export const getTodayRevenue = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return getRevenueByDateRange(today.toISOString(), tomorrow.toISOString());
};

// === LẤY DOANH THU 7 NGÀY QUA ===
export const getWeekRevenue = async () => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);

  return getRevenueByDateRange(start.toISOString(), new Date().toISOString());
};

// === LẤY DOANH THU 30 NGÀY QUA ===
export const getMonthRevenue = async () => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);

  return getRevenueByDateRange(start.toISOString(), new Date().toISOString());
};

// === LẤY TỔNG DOANH THU TẤT CẢ ===
export const getTotalRevenue = async () => {
  const { data, error } = await supabase
    .from('orders')
    .select('boxes, status')
    .neq('status', 'cancelled');
  if (error) throw error;

  const orders = data || [];
  return {
    totalRevenue: orders.reduce(
      (sum, o) => sum + (o.boxes || 0) * PRICE_PER_BOX,
      0
    ),
    totalOrders: orders.length,
    totalBoxes: orders.reduce((sum, o) => sum + (o.boxes || 0), 0),
  };
};

// === LẤY DOANH THU THEO NGÀY (cho biểu đồ) ===
export const getDailyRevenue = async (days = 30) => {
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('orders')
    .select('boxes, created_at, status')
    .gte('created_at', start.toISOString())
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true });
  if (error) throw error;

  const dailyMap = {};
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { date: key, revenue: 0, orders: 0 };
  }

  (data || []).forEach((order) => {
    const key = order.created_at.split('T')[0];
    if (dailyMap[key]) {
      dailyMap[key].revenue += (order.boxes || 0) * PRICE_PER_BOX;
      dailyMap[key].orders += 1;
    }
  });

  return Object.values(dailyMap);
};

// === LẤY TOP SẢN PHẨM BÁN CHẠY ===
export const getTopProducts = async (limit = 5, days = 30) => {
  const start = new Date();
  start.setDate(start.getDate() - days);

  const { data, error } = await supabase
    .from('orders')
    .select('product_type, boxes, weight')
    .gte('created_at', start.toISOString())
    .neq('status', 'cancelled');
  if (error) throw error;

  const productMap = {};
  (data || []).forEach((order) => {
    const key = order.product_type || 'Khác';
    if (!productMap[key]) {
      productMap[key] = { product: key, boxes: 0, orders: 0, revenue: 0 };
    }
    productMap[key].boxes += order.boxes || 0;
    productMap[key].orders += 1;
    productMap[key].revenue += (order.boxes || 0) * PRICE_PER_BOX;
  });

  return Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
};

// === LẤY TOP KHÁCH HÀNG ===
export const getTopCustomers = async (limit = 5, days = 30) => {
  const start = new Date();
  start.setDate(start.getDate() - days);

  const { data, error } = await supabase
    .from('orders')
    .select('customer_name, customer_phone, boxes')
    .gte('created_at', start.toISOString())
    .neq('status', 'cancelled');
  if (error) throw error;

  const customerMap = {};
  (data || []).forEach((order) => {
    const key = order.customer_phone || order.customer_name || 'Khách lẻ';
    if (!customerMap[key]) {
      customerMap[key] = {
        name: order.customer_name || 'Khách lẻ',
        phone: order.customer_phone || '--',
        boxes: 0,
        orders: 0,
        revenue: 0,
      };
    }
    customerMap[key].boxes += order.boxes || 0;
    customerMap[key].orders += 1;
    customerMap[key].revenue += (order.boxes || 0) * PRICE_PER_BOX;
  });

  return Object.values(customerMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
};

// === FORMAT TIỀN ===
export const formatVND = (value) => {
  if (!value) return '0đ';
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return `${value.toLocaleString('vi-VN')}đ`;
};

export const formatVNDFull = (value) => {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
};

// === EXPORT CSV ===
export const exportToCSV = (orders) => {
  const headers = [
    'Mã đơn',
    'Khách hàng',
    'SĐT',
    'Nông sản',
    'Số thùng',
    'Doanh thu',
    'Trạng thái',
    'Ngày tạo',
  ];
  const rows = orders.map((o) => [
    o.order_code,
    o.customer_name || '',
    o.customer_phone || '',
    o.product_type || '',
    o.boxes || 0,
    (o.boxes || 0) * PRICE_PER_BOX,
    o.status || '',
    new Date(o.created_at).toLocaleString('vi-VN'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `doanh-thu-agrocold-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};