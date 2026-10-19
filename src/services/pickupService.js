export const getOrdersNeedingPickup = async () => {
  // 1. Lấy TẤT CẢ các thùng đang chờ thu (bỏ qua trạng thái của Đơn hàng)
  const { data: boxes, error: boxError } = await supabase
    .from('boxes')
    .select('*')
    .in('status', ['delivered', 'waiting_return', 'waiting', 'in_use', 'delivering']); 
    
  if (boxError) throw boxError;
  if (!boxes || boxes.length === 0) return [];

  // 2. Lấy danh sách ID của các đơn hàng từ những thùng này
  const orderIds = [...new Set(boxes.map(b => b.order_id))];

  // 3. Lấy thông tin các Đơn hàng đó (Không ép buộc status phải là 'delivered' nữa)
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .in('id', orderIds);
    
  if (orderError) throw orderError;
  if (!orders || orders.length === 0) return [];

  const boxMap = {};
  (boxes || []).forEach((b) => {
    if (!boxMap[b.order_id]) boxMap[b.order_id] = [];
    boxMap[b.order_id].push(b);
  });

  return orders
    .map((order) => {
      const orderBoxes = boxMap[order.id] || [];
      
      let estimatedArrival = 'Chưa xác định';
      if (order.send_date && order.pickup_time) {
        const startDate = new Date(`${order.send_date}T${order.pickup_time}:00`);
        const arrivalDate = new Date(startDate.getTime() + 5 * 60 * 60 * 1000);
        estimatedArrival = arrivalDate.toLocaleString('vi-VN', {
          weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
      }

      return {
        ...order,
        waiting_count: orderBoxes.length,
        box_ids: orderBoxes.map(b => b.id),
        estimated_arrival: estimatedArrival,
      };
    })
    .filter((order) => order.waiting_count > 0); // Chỉ lấy đơn có thùng
};