import { supabase } from '../lib/supabaseClient';

// === LẤY DANH SÁCH ĐƠN CẦN THU HỒI THÙNG ===
// Điều kiện: đơn đã giao (delivered), có thùng ở trạng thái "delivered" (chờ thu hồi)
export const getOrdersNeedingPickup = async () => {
  // Lấy các đơn đã giao
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'delivered')
    .order('created_at', { ascending: false });
  if (orderError) throw orderError;
  if (!orders || orders.length === 0) return [];

  // Lấy tất cả thùng chờ thu hồi
  const { data: boxes, error: boxError } = await supabase
    .from('boxes')
    .select('*')
    .in('status', ['delivered', 'waiting_return']);
  if (boxError) throw boxError;

  // Gom nhóm thùng theo order_id
  const boxMap = {};
  (boxes || []).forEach((b) => {
    if (!boxMap[b.order_id]) boxMap[b.order_id] = [];
    boxMap[b.order_id].push(b);
  });

  // Gắn số thùng cần thu hồi vào mỗi đơn
  return orders
    .map((order) => {
      const orderBoxes = boxMap[order.id] || [];
      return {
        ...order,
        boxes_to_pickup: orderBoxes.length,
        box_ids: orderBoxes.map((b) => b.id),
      };
    })
    .filter((order) => order.boxes_to_pickup > 0);
};

// === LẤY DANH SÁCH XE THU HỒI ===
export const getPickupVehicles = async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('vehicle_type', 'pickup')
    .order('plate_number');
  if (error) throw error;
  return data || [];
};

// === LẤY DANH SÁCH TÀI XẾ AVAILABLE ===
export const getAvailableDriversForPickup = async () => {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('status', 'available');
  if (error) throw error;
  return data || [];
};

// === TẠO CHUYẾN THU HỒI MỚI ===
export const createPickupTrip = async ({
  vehicleId,
  driverId,
  scheduledDate,
  scheduledTime,
  points, // [{ orderId, orderCode, lat, lng, address, boxes }]
  notes,
}) => {
  const tripCode = `PT-${new Date().getFullYear()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  const totalBoxes = points.reduce((sum, p) => sum + (p.boxes || 0), 0);

  // Ước tính thời gian: 30 phút/điểm + thời gian di chuyển
  const estimatedDurationMinutes = points.length * 30 + 60;

  // 1. Tạo trip
  const { data: trip, error: tripError } = await supabase
    .from('pickup_trips')
    .insert([
      {
        trip_code: tripCode,
        vehicle_id: vehicleId,
        driver_id: driverId,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        status: 'scheduled',
        total_boxes: totalBoxes,
        total_points: points.length,
        estimated_duration_minutes: estimatedDurationMinutes,
        notes: notes || '',
      },
    ])
    .select()
    .single();
  if (tripError) throw tripError;

  // 2. Tạo các điểm trong trip
  const tripPoints = points.map((p, index) => ({
    trip_id: trip.id,
    order_id: p.orderId,
    order_code: p.orderCode,
    pickup_lat: p.lat,
    pickup_lng: p.lng,
    pickup_address: p.address,
    boxes_to_pickup: p.boxes,
    status: 'pending',
    sequence: index + 1,
  }));

  const { error: pointsError } = await supabase
    .from('pickup_trip_points')
    .insert(tripPoints);
  if (pointsError) throw pointsError;

  // 3. Cập nhật trạng thái xe → in_transit
  await supabase
    .from('vehicles')
    .update({
      status: 'in_transit',
      current_driver_id: driverId,
      current_route: `Thu hồi ${points.length} điểm`,
      departed_at: new Date().toISOString(),
      estimated_return_at: new Date(
        Date.now() + estimatedDurationMinutes * 60 * 1000
      ).toISOString(),
    })
    .eq('id', vehicleId);

  // 4. Cập nhật trạng thái tài xế → on_duty
  await supabase
    .from('drivers')
    .update({
      status: 'on_duty',
      current_vehicle_id: vehicleId,
    })
    .eq('id', driverId);

  // 5. Cập nhật các thùng → waiting_return
  const boxIds = points.flatMap((p) => p.boxIds || []);
  if (boxIds.length > 0) {
    await supabase
      .from('boxes')
      .update({ status: 'waiting_return' })
      .in('id', boxIds);
  }

  return trip;
};

// === LẤY DANH SÁCH CHUYẾN THU HỒI ===
export const getAllPickupTrips = async () => {
  const { data, error } = await supabase
    .from('pickup_trips')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

// === LẤY CHI TIẾT CHUYẾN THU HỒI ===
export const getPickupTripDetails = async (tripId) => {
  const { data: trip, error: tripError } = await supabase
    .from('pickup_trips')
    .select('*')
    .eq('id', tripId)
    .single();
  if (tripError) throw tripError;

  const { data: points, error: pointsError } = await supabase
    .from('pickup_trip_points')
    .select('*')
    .eq('trip_id', tripId)
    .order('sequence');
  if (pointsError) throw pointsError;

  return { trip, points: points || [] };
};

// === CẬP NHẬT TRẠNG THÁI CHUYẾN ===
export const updateTripStatus = async (tripId, status) => {
  const updates = { status };
  if (status === 'in_progress') updates.started_at = new Date().toISOString();
  if (status === 'completed') updates.completed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('pickup_trips')
    .update(updates)
    .eq('id', tripId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// === ĐÁNH DẤU ĐIỂM ĐÃ THU HỒI ===
export const markPointPickedUp = async (pointId, tripId) => {
  // Cập nhật điểm
  const { error: pointError } = await supabase
    .from('pickup_trip_points')
    .update({
      status: 'picked_up',
      picked_up_at: new Date().toISOString(),
    })
    .eq('id', pointId);
  if (pointError) throw pointError;

  // Lấy order_id của điểm này
  const { data: point } = await supabase
    .from('pickup_trip_points')
    .select('order_id')
    .eq('id', pointId)
    .single();

  if (point?.order_id) {
    // Cập nhật các thùng của đơn này → at_hub
    await supabase
      .from('boxes')
      .update({ status: 'at_hub' })
      .eq('order_id', point.order_id)
      .in('status', ['waiting_return', 'delivered']);
  }

  // Kiểm tra xem còn điểm nào pending không
  const { data: remaining } = await supabase
    .from('pickup_trip_points')
    .select('id')
    .eq('trip_id', tripId)
    .eq('status', 'pending');

  // Nếu hết điểm → trip completed
  if (!remaining || remaining.length === 0) {
    await updateTripStatus(tripId, 'completed');

    // Lấy trip để reset xe + tài xế
    const { data: trip } = await supabase
      .from('pickup_trips')
      .select('vehicle_id, driver_id')
      .eq('id', tripId)
      .single();

    if (trip?.vehicle_id) {
      await supabase
        .from('vehicles')
        .update({
          status: 'idle',
          current_driver_id: null,
          current_route: null,
          departed_at: null,
          estimated_return_at: null,
        })
        .eq('id', trip.vehicle_id);
    }
    if (trip?.driver_id) {
      await supabase
        .from('drivers')
        .update({ status: 'available', current_vehicle_id: null })
        .eq('id', trip.driver_id);
    }
  }
};

// === ĐÁNH DẤU ĐÃ VỆ SINH THÙNG ===
export const markBoxesReady = async (boxIds) => {
  const { error } = await supabase
    .from('boxes')
    .update({ status: 'ready' })
    .in('id', boxIds);
  if (error) throw error;
};