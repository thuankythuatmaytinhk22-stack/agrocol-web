// Logic dự báo đơn giản dựa trên dữ liệu lịch sử và mùa vụ
export const SEASONAL_DATA = {
  'Sầu riêng': { peakMonths: [4, 5, 6, 7], pcmPerBox: 2, boxesPerTruck: 30 },
  'Bơ': { peakMonths: [8, 9, 10, 11], pcmPerBox: 1.5, boxesPerTruck: 35 },
  'Dâu tây': { peakMonths: [12, 1, 2, 3], pcmPerBox: 1, boxesPerTruck: 40 },
  'Xoài': { peakMonths: [3, 4, 5], pcmPerBox: 1.5, boxesPerTruck: 35 },
};

export function analyzeForecast(orders) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

  // 1. Thống kê dữ liệu quá khứ
  let totalOrders = orders.length;
  let totalBoxes = orders.reduce((sum, o) => sum + (o.boxes || 0), 0);
  
  // Lọc đơn hàng của tháng hiện tại
  const currentMonthOrders = orders.filter(o => {
    if (!o.created_at) return false;
    const d = new Date(o.created_at);
    return (d.getMonth() + 1) === currentMonth;
  });

  const boxesThisMonth = currentMonthOrders.reduce((sum, o) => sum + (o.boxes || 0), 0);

  // 2. Dự báo dựa trên mùa vụ cho tháng tới
  const forecastProducts = [];
  let totalForecastedBoxes = 0;

  Object.keys(SEASONAL_DATA).forEach(product => {
    if (SEASONAL_DATA[product].peakMonths.includes(nextMonth)) {
      // Nếu tháng tới là mùa cao điểm của nông sản này
      // Giả sử dự báo tăng trưởng 20% so với tháng hiện tại (hoặc lấy mức trung bình)
      const historicalProductBoxes = orders
        .filter(o => o.product_type === product)
        .reduce((sum, o) => sum + (o.boxes || 0), 0);
      
      const avgBoxesPerOrder = historicalProductBoxes / (orders.filter(o => o.product_type === product).length || 1);
      const estimatedOrdersNextMonth = Math.max(5, Math.ceil(avgBoxesPerOrder * 1.2)); // Dự báo ít nhất 5 đơn
      const estimatedBoxes = estimatedOrdersNextMonth * avgBoxesPerOrder;
      
      totalForecastedBoxes += estimatedBoxes;

      forecastProducts.push({
        product,
        estimatedOrders: estimatedOrdersNextMonth,
        estimatedBoxes: Math.round(estimatedBoxes),
        pcmNeeded: Math.round(estimatedBoxes * SEASONAL_DATA[product].pcmPerBox),
        trucksNeeded: Math.ceil(estimatedBoxes / SEASONAL_DATA[product].boxesPerTruck),
      });
    }
  });

  // 3. Phân tích xu hướng ngắn hạn (7 ngày tới)
  // Tính trung bình số thùng đặt mỗi ngày trong 7 ngày qua
  const last7DaysOrders = orders.filter(o => {
    const d = new Date(o.created_at);
    const diffTime = Math.abs(now - d);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  });
  
  const boxesLast7Days = last7DaysOrders.reduce((sum, o) => sum + (o.boxes || 0), 0);
  const avgBoxesPerDay = boxesLast7Days / 7;
  
  // Dự báo 7 ngày tới (giả sử tăng nhẹ 10%)
  const next7DaysForecast = Math.round(avgBoxesPerDay * 7 * 1.1);
  const next7DaysTrucks = Math.ceil(next7DaysForecast / 30); // Giả sử 1 xe chở 30 thùng

  return {
    currentMonth,
    nextMonth,
    boxesThisMonth,
    totalOrders,
    totalBoxes,
    forecastProducts,
    next7DaysForecast,
    next7DaysTrucks,
    totalForecastedBoxes: Math.round(totalForecastedBoxes),
    totalTrucksNeeded: forecastProducts.reduce((sum, p) => sum + p.trucksNeeded, 0),
  };
}