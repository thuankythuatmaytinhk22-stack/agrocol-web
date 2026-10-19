import { supabase } from '../lib/supabaseClient';

// === LẤY DANH SÁCH ĐIỂM THU (CẢ ĐANG GIAO VÀ ĐÃ GIAO) ===
export const getOrdersNeedingPickup = async () => {
  // Lấy tất cả đơn đang giao (shipping) và đã giao (delivered)
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['shipping', 'delivered'])
    .order('created_at', { ascending: false });
  if (orderError) throw orderError;
  if (!orders || orders.length === 0) return [];

  // Lấy thùng tương ứng
  const { data: boxes, error: boxError } = await supabase
    .from('boxes')
    .select('*');
  if (boxError) throw boxError;

  const boxMap = {};
  (boxes || []).forEach((b) => {
    if (!boxMap[b.order_id]) boxMap[b.order_id] = [];
    boxMap[b.order_id].push(b);
  });

  return orders
    .map((order) => {
      const orderBoxes = boxMap[order.id] || [];
      
      // Phân loại thùng
      const waitingBoxes = orderBoxes.filter(b => ['delivered', 'waiting_return'].includes(b.status));
      const pickingBoxes = orderBoxes.filter(b => b.status === 'picking_up');
      const readyBoxes = orderBoxes.filter(b => ['ready', 'at_hub'].includes(b.status));

      // Tính giờ dự kiến đến (dựa vào ngày gửi + giờ đặt + 4 tiếng di chuyển + 1 tiếng chất hàng)
      let estimatedArrival = 'Chưa xác định';
      if (order.send_date && order.pickup_time) {
        const startDate = new Date(`${order.send_date}T${order.pickup_time}:00`);
        const arrivalDate = new Date(startDate.getTime() + 5 * 60 * 60 * 1000); // Cộng 5 tiếng
        estimatedArrival = arrivalDate.toLocaleString('vi-VN', {
          weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
      }

      return {
        ...order,
        waiting_count: waitingBoxes.length,
        picking_count: pickingBoxes.length,
        ready_count: readyBoxes.length,
        box_ids: waitingBoxes.map(b => b.id),
        estimated_arrival: estimatedArrival,
      };
    })
    // Chỉ giữ lại những đơn có thùng (dù đang giao hay đã giao)
    .filter((order) => order.waiting_count > 0 || order.picking_count > 0 || order.ready_count > 0);
};

// === LẤY XE THU HỒI ===
export const getPickupVehicles = async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('vehicle_type', 'pickup')
    .eq('status', 'idle'); // Chỉ lấy xe đang rảnh
  if (error) throw error;
  return data || [];
};

// === LẤY TÀI XẾ THU HỒI ===
export const getAvailableDriversForPickup = async () => {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('driver_type', 'pickup')
    .eq('status', 'available'); // Chỉ lấy tài xế đang rảnh
  if (error) throw error;
  return data || [];
};

// === TẠO CHUYẾN THU HỒI ===
export const createPickupTrip = async ({ vehicleId, driverId, points, notes }) => {
  const tripCode = `PT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const totalBoxes = points.reduce((sum, p) => sum + (p.boxes || 0), 0);

  // 1. Tạo trip
  const { data: trip, error: tripError } = await supabase
    .from('pickup_trips')
    .insert([{
      trip_code: tripCode, vehicle_id: vehicleId, driver_id: driverId,
      status: 'in_progress', total_boxes: totalBoxes, total_points: points.length,
      notes: notes || '', started_at: new Date().toISOString(),
    }])
    .select().single();
  if (tripError) throw tripError;

  // 2. Tạo các điểm trong trip
  const tripPoints = points.map((p, index) => ({
    trip_id: trip.id, order_id: p.orderId, order_code: p.orderCode,
    pickup_lat: p.lat, pickup_lng: p.lng, pickup_address: p.address,
    boxes_to_pickup: p.boxes, status: 'pending', sequence: index + 1,
  }));
  const { error: pointsError } = await supabase.from('pickup_trip_points').insert(tripPoints);
  if (pointsError) throw pointsError;

  // 3. Cập nhật trạng thái xe → in_transit
  await supabase.from('vehicles').update({
    status: 'in_transit', current_driver_id: driverId,
    current_route: `Thu hồi ${points.length} điểm`, departed_at: new Date().toISOString(),
  }).eq('id', vehicleId);

  // 4. Cập nhật trạng thái tài xế → on_duty
  await supabase.from('drivers').update({
    status: 'on_duty', current_vehicle_id: vehicleId,
  }).eq('id', driverId);

  // 5. Cập nhật các thùng → picking_up
  const boxIds = points.flatMap((p) => p.boxIds || []);
  if (boxIds.length > 0) {
    await supabase.from('boxes').update({ status: 'picking_up' }).in('id', boxIds);
  }

  return trip;
};