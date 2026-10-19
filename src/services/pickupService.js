import { supabase } from '../lib/supabaseClient';

// === LẤY DANH SÁCH ĐIỂM CHỜ THU (CHỈ LẤY THÙNG CHƯA PHÂN CÔNG) ===
export const getOrdersNeedingPickup = async () => {
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'delivered') // Chỉ lấy đơn đã giao thành công
    .order('created_at', { ascending: false });
  if (orderError) throw orderError;
  if (!orders || orders.length === 0) return [];

  // Lấy thùng đang chờ (waiting_return hoặc delivered)
  const { data: boxes, error: boxError } = await supabase
    .from('boxes')
    .select('*')
    .in('status', ['delivered', 'waiting_return']); 
  if (boxError) throw boxError;

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
    // CHỈ GIỮ NHỮNG ĐƠN CÓ THÙNG CHỜ THU (LỌC BỎ 0 THÙNG)
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

  const { data: boxes, error: boxError } = await supabase
    .from('boxes')
    .select('*')
    .eq('status', 'ready'); // Thùng đã sẵn sàng
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

// ... (Các hàm getPickupVehicles, getAvailableDriversForPickup, createPickupTrip giữ nguyên như cũ)
export const getPickupVehicles = async () => {
  const { data, error } = await supabase.from('vehicles').select('*').eq('vehicle_type', 'pickup').order('plate_number');
  if (error) throw error;
  return data || [];
};

export const getAvailableDriversForPickup = async () => {
  const { data, error } = await supabase.from('drivers').select('*').eq('driver_type', 'pickup'); 
  if (error) throw error;
  return data || [];
};

export const createPickupTrip = async ({ vehicleId, driverId, points, notes }) => {
  const tripCode = `PT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const totalBoxes = points.reduce((sum, p) => sum + (p.boxes || 0), 0);
  const estimatedDurationMinutes = points.length * 30 + 60;

  const { data: trip, error: tripError } = await supabase.from('pickup_trips').insert([{ trip_code: tripCode, vehicle_id: vehicleId, driver_id: driverId, status: 'in_progress', total_boxes: totalBoxes, total_points: points.length, estimated_duration_minutes: estimatedDurationMinutes, notes: notes || '', started_at: new Date().toISOString() }]).select().single();
  if (tripError) throw tripError;

  const tripPoints = points.map((p, index) => ({ trip_id: trip.id, order_id: p.orderId, order_code: p.orderCode, pickup_lat: p.lat, pickup_lng: p.lng, pickup_address: p.address, boxes_to_pickup: p.boxes, status: 'pending', sequence: index + 1 }));
  const { error: pointsError } = await supabase.from('pickup_trip_points').insert(tripPoints);
  if (pointsError) throw pointsError;

  await supabase.from('vehicles').update({ status: 'in_transit', current_driver_id: driverId, current_route: `Thu hồi ${points.length} điểm`, departed_at: new Date().toISOString(), estimated_return_at: new Date(Date.now() + estimatedDurationMinutes * 60 * 1000).toISOString() }).eq('id', vehicleId);
  await supabase.from('drivers').update({ status: 'on_duty', current_vehicle_id: vehicleId }).eq('id', driverId);

  const boxIds = points.flatMap((p) => p.boxIds || []);
  if (boxIds.length > 0) {
    await supabase.from('boxes').update({ status: 'picking_up' }).in('id', boxIds);
  }

  return trip;
};