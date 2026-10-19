import { supabase } from '../lib/supabaseClient';

// === LẤY DANH SÁCH ĐIỂM CHỜ THU ===
export const getOrdersNeedingPickup = async () => {
  // 1. Lấy các đơn đã giao thành công
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'delivered') 
    .order('created_at', { ascending: false });
    
  if (orderError) throw orderError;
  if (!orders || orders.length === 0) return [];

  // 2. Lấy thùng đang chờ thu (delivered hoặc waiting_return)
  const { data: boxes, error: boxError } = await supabase
    .from('boxes')
    .select('*')
    .in('status', ['delivered', 'waiting_return']); 
    
  if (boxError) throw boxError;

  // Log để debug nếu cần
  // console.log('Số thùng chờ thu tìm thấy:', boxes?.length);

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
        // Giả sử thời gian giao hàng là 5 tiếng
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
    // Chỉ giữ đơn có ít nhất 1 thùng chờ thu
    .filter((order) => order.waiting_count > 0);
};

// === LẤY DANH SÁCH ĐÃ THU HỒI (READY) ===
export const getOrdersPickedUp = async () => {
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'delivered')
    .order('created_at', { ascending: false });
  if (orderError) throw orderError;
  if (!orders || orders.length === 0) return [];

  // Lấy thùng đã sẵn sàng (ready) - tức là đã thu hồi về Hub
  const { data: boxes, error: boxError } = await supabase
    .from('boxes')
    .select('*')
    .eq('status', 'ready'); 
  if (boxError) throw boxError;

  const boxMap = {};
  (boxes || []).forEach((b) => {
    if (!boxMap[b.order_id]) boxMap[b.order_id] = [];
    boxMap[b.order_id].push(b);
  });

  return orders
    .map((order) => {
      const orderBoxes = boxMap[order.id] || [];
      return {
        ...order,
        ready_count: orderBoxes.length,
      };
    })
    .filter((order) => order.ready_count > 0);
};

// === LẤY XE THU HỒI ===
export const getPickupVehicles = async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('vehicle_type', 'pickup')
    .order('plate_number');
  if (error) throw error;
  return data || [];
};

// === LẤY TÀI XẾ THU HỒI ===
export const getAvailableDriversForPickup = async () => {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('driver_type', 'pickup'); 
  if (error) throw error;
  return data || [];
};

// === TẠO CHUYẾN THU HỒI MỚI ===
export const createPickupTrip = async ({ vehicleId, driverId, points, notes }) => {
  const tripCode = `PT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const totalBoxes = points.reduce((sum, p) => sum + (p.boxes || 0), 0);
  const estimatedDurationMinutes = points.length * 30 + 60;

  // 1. Tạo chuyến đi
  const { data: trip, error: tripError } = await supabase
    .from('pickup_trips')
    .insert([{ 
      trip_code: tripCode, 
      vehicle_id: vehicleId, 
      driver_id: driverId, 
      status: 'in_progress', 
      total_boxes: totalBoxes, 
      total_points: points.length, 
      estimated_duration_minutes: estimatedDurationMinutes, 
      notes: notes || '', 
      started_at: new Date().toISOString() 
    }])
    .select()
    .single();
  if (tripError) throw tripError;

  // 2. Tạo các điểm dừng
  const tripPoints = points.map((p, index) => ({ 
    trip_id: trip.id, 
    order_id: p.orderId, 
    order_code: p.orderCode, 
    pickup_lat: p.lat, 
    pickup_lng: p.lng, 
    pickup_address: p.address, 
    boxes_to_pickup: p.boxes, 
    status: 'pending', 
    sequence: index + 1 
  }));
  
  const { error: pointsError } = await supabase.from('pickup_trip_points').insert(tripPoints);
  if (pointsError) throw pointsError;

  // 3. Cập nhật trạng thái xe và tài xế
  await supabase.from('vehicles').update({ 
    status: 'in_transit', 
    current_driver_id: driverId, 
    current_route: `Thu hồi ${points.length} điểm`, 
    departed_at: new Date().toISOString(), 
    estimated_return_at: new Date(Date.now() + estimatedDurationMinutes * 60 * 1000).toISOString() 
  }).eq('id', vehicleId);
  
  await supabase.from('drivers').update({ 
    status: 'on_duty', 
    current_vehicle_id: vehicleId 
  }).eq('id', driverId);

  // 4. Chuyển trạng thái thùng sang picking_up (để hiển thị ở tab Đang thu hồi)
  const boxIds = points.flatMap((p) => p.boxIds || []);
  if (boxIds.length > 0) {
    await supabase.from('boxes').update({ status: 'picking_up' }).in('id', boxIds);
  }

  return trip;
};