import { matchProduct } from './coldChain';

const HUB = { 
  name: 'Kho lạnh AgroCold - 123 Lê Duẩn, TP. Buôn Ma Thuột', 
  lat: 12.6662, 
  lng: 108.0382 
};
const AVG_KMH = 42;

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function routeStats(points) {
  let km = 0;
  for (let i = 1; i < points.length; i += 1) km += haversineKm(points[i - 1], points[i]);
  const minutes = (km / AVG_KMH) * 60;
  return { km: Number(km.toFixed(1)), minutes: Math.round(minutes) };
}

// Hàm tìm các đơn có thể ghép chuyến (Giữ nguyên)
function findMergeableOrders(orders) {
  const mergeNotes = [];
  for (let i = 0; i < orders.length; i++) {
    for (let j = i + 1; j < orders.length; j++) {
      const o1 = orders[i];
      const o2 = orders[j];
      
      const totalBoxes = (o1.boxes || 0) + (o2.boxes || 0);
      if (totalBoxes > 12) continue;

      if (o1.pickup_time && o2.pickup_time && o1.send_date === o2.send_date) {
        const t1 = new Date(`${o1.send_date}T${o1.pickup_time}`);
        const t2 = new Date(`${o2.send_date}T${o2.pickup_time}`);
        const diffHours = Math.abs(t1 - t2) / 36e5;
        if (diffHours > 4) continue;
      }

      if (o1.delivery_lat && o1.delivery_lng && o2.delivery_lat && o2.delivery_lng) {
        const dist = haversineKm(
          { lat: o1.delivery_lat, lng: o1.delivery_lng },
          { lat: o2.delivery_lat, lng: o2.delivery_lng }
        );
        if (dist > 50) continue;
      }

      mergeNotes.push({
        id: `merge-${o1.id}-${o2.id}`,
        order1: o1.order_code,
        order2: o2.order_code,
        totalBoxes,
        message: `Đơn ${o1.order_code} và ${o2.order_code} có thể ghép chung 1 xe. Tổng cộng ${totalBoxes} thùng.`
      });
    }
  }
  return mergeNotes;
}

export function filterOrdersByDate(orders, dateStr) {
  if (!dateStr) return orders;
  return orders.filter((o) => {
    if (!o.send_date) return false;
    const orderDate = o.send_date.split('T')[0];
    return orderDate === dateStr;
  });
}

export function optimizeRoutes(orders = [], filterDate = null) {
  const filtered = filterDate ? filterOrdersByDate(orders, filterDate) : orders;
  // Lấy các đơn đang chờ xử lý hoặc đang giao
  const active = filtered.filter((o) => ['pending', 'packed', 'shipping'].includes(o.status));

  if (!active.length) {
    return { empty: true, vehicles: [], totalSavedKm: 0, totalSavedMinutes: 0, mergeNotes: [] };
  }

  const mergeNotes = findMergeableOrders(active);

  // 1. TẠO LỘ TRÌNH: Bắt đầu từ HUB
  const path = [{ ...HUB, kind: 'hub', label: HUB.name, id: 'hub' }];
  
  // 2. TẤT CẢ CÁC ĐIỂM GIAO HÀNG
  const deliveryStops = active.map((order) => {
    const product = matchProduct(order.product_type);
    const delivery = (order.delivery_lat && order.delivery_lng)
      ? { name: order.delivery_address || 'Điểm giao hàng', lat: order.delivery_lat, lng: order.delivery_lng }
      : { name: order.delivery_address || 'Chưa xác định', lat: HUB.lat + 0.1, lng: HUB.lng + 0.1 };

    return { 
      id: `${order.id}-d`, 
      order, 
      kind: 'delivery', 
      product, 
      label: delivery.name, 
      lat: delivery.lat, 
      lng: delivery.lng, 
      shelfHours: product.shelfHours 
    };
  });

  // 3. SẮP XẾP CÁC ĐIỂM GIAO HÀNG (Thuật toán Greedy - Điểm nào gần nhất thì giao trước)
  let currentLocation = HUB;
  const remainingDeliveries = [...deliveryStops];
  const sortedPath = [...path];

  while (remainingDeliveries.length > 0) {
    // Tìm điểm giao hàng gần vị trí hiện tại nhất
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remainingDeliveries.length; i++) {
      const dist = haversineKm(currentLocation, remainingDeliveries[i]);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }

    // Thêm điểm gần nhất vào lộ trình
    const nextStop = remainingDeliveries.splice(nearestIndex, 1)[0];
    sortedPath.push(nextStop);
    currentLocation = nextStop;
  }

  // 4. TÍNH TOÁN QUÃNG ĐƯỜNG
  const newStats = routeStats(sortedPath);
  
  // Tính toán quãng đường cũ (FIFO - theo thứ tự đặt hàng)
  const fifoPath = [{ ...HUB, kind: 'hub', label: HUB.name, id: 'hub' }, ...deliveryStops];
  const oldStats = routeStats(fifoPath);

  const savedKm = Math.max(0, oldStats.km - newStats.km);
  const savedMinutes = Math.max(0, oldStats.minutes - newStats.minutes);

  // 5. TRẢ VỀ KẾT QUẢ
  const vehicles = [{
    id: `vehicle-1`,
    vehicleName: `Tuyến Xe Tải (${active.length} đơn)`,
    orders: active,
    path: sortedPath,
    stats: newStats,
    savedKm,
    savedMinutes,
    color: '#0F4C3A',
  }];

  return {
    empty: false,
    count: active.length,
    vehicles: vehicles,
    totalSavedKm: Number(savedKm.toFixed(1)),
    totalSavedMinutes: savedMinutes,
    mergeNotes 
  };
}

export function stopKindLabel(kind) {
  if (kind === 'hub') return 'Kho Hub (Lấy tất cả hàng)';
  if (kind === 'pickup') return 'Lấy hàng tại Hub';
  return 'Giao hàng';
}