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

function buildStops(orders) {
  return orders.flatMap((order) => {
    const product = matchProduct(order.product_type);
    
    // BỎ QUA ĐỊA CHỈ PICKUP CŨ, LUÔN DÙNG HUB CỐ ĐỊNH
    const pickup = { 
      name: HUB.name, 
      lat: HUB.lat, 
      lng: HUB.lng 
    };
    
    const delivery = (order.delivery_lat && order.delivery_lng)
      ? { name: order.delivery_address || 'Điểm giao hàng', lat: order.delivery_lat, lng: order.delivery_lng }
      : { name: order.delivery_address || 'Chưa xác định', lat: HUB.lat + 0.1, lng: HUB.lng + 0.1 }; // Fallback nếu thiếu tọa độ

    return [
      { id: `${order.id}-p`, order, kind: 'pickup', product, label: pickup.name, lat: pickup.lat, lng: pickup.lng, shelfHours: product.shelfHours },
      { id: `${order.id}-d`, order, kind: 'delivery', product, label: delivery.name, lat: delivery.lat, lng: delivery.lng, shelfHours: product.shelfHours },
    ];
  });
}

// Thuật toán Greedy
function greedyRoute(stops) {
  const picked = new Set();
  const remaining = [...stops];
  const path = [{ ...HUB, kind: 'hub', label: HUB.name, id: 'hub' }];
  let current = HUB;

  while (remaining.length) {
    const feasible = remaining.filter((s) => s.kind === 'pickup' || picked.has(s.order.id));
    feasible.sort((a, b) => {
      const da = haversineKm(current, a);
      const db = haversineKm(current, b);
      const perishA = a.kind === 'delivery' ? (80 - a.shelfHours) * 0.35 : 0;
      const perishB = b.kind === 'delivery' ? (80 - b.shelfHours) * 0.35 : 0;
      return da - perishA - (db - perishB);
    });
    const next = feasible[0] || remaining[0];
    path.push(next);
    current = next;
    if (next.kind === 'pickup') picked.add(next.order.id);
    const idx = remaining.findIndex((s) => s.id === next.id);
    remaining.splice(idx, 1);
  }
  return path;
}

// Tối ưu 2-opt
function twoOptImprove(path) {
  let improved = true;
  let bestPath = [...path];
  let bestDist = routeStats(bestPath).km;

  while (improved) {
    improved = false;
    for (let i = 1; i < bestPath.length - 2; i++) {
      for (let j = i + 1; j < bestPath.length - 1; j++) {
        const newPath = [
          ...bestPath.slice(0, i),
          ...bestPath.slice(i, j + 1).reverse(),
          ...bestPath.slice(j + 1),
        ];
        const newDist = routeStats(newPath).km;
        if (newDist < bestDist) {
          bestPath = newPath;
          bestDist = newDist;
          improved = true;
        }
      }
    }
  }
  return bestPath;
}

// FIFO (để so sánh)
function fifoRoute(stops) {
  const path = [{ ...HUB, kind: 'hub', label: HUB.name, id: 'hub' }];
  const byOrder = [];
  stops.forEach((s) => {
    const g = byOrder.find((x) => x[0]?.order.id === s.order.id);
    if (g) g.push(s);
    else byOrder.push([s]);
  });
  byOrder.forEach((pair) => {
    const pickup = pair.find((p) => p.kind === 'pickup');
    const delivery = pair.find((p) => p.kind === 'delivery');
    if (pickup) path.push(pickup);
    if (delivery) path.push(delivery);
  });
  return path;
}

export function filterOrdersByDate(orders, dateStr) {
  if (!dateStr) return orders;
  return orders.filter((o) => {
    if (!o.send_date) return false;
    const orderDate = o.send_date.split('T')[0];
    return orderDate === dateStr;
  });
}

// Hàm chính: Tối ưu và chia thành nhiều tuyến xe
export function optimizeRoutes(orders = [], filterDate = null) {
  const filtered = filterDate ? filterOrdersByDate(orders, filterDate) : orders;
  const active = filtered.filter((o) => ['pending', 'packed', 'shipping'].includes(o.status));

  if (!active.length) {
    return { 
      empty: true, 
      vehicles: [], 
      totalSavedKm: 0, 
      totalSavedMinutes: 0 
    };
  }

  // VÌ TẤT CẢ ĐỀU XUẤT PHÁT TỪ HUB, GOM CHUNG VÀO 1 NHÓM XE
  // (Nếu muốn chia nhiều xe, có thể chia theo số lượng đơn, nhưng hiện tại gom chung)
  const groupOrders = active; 

  const stops = buildStops(groupOrders);
  const oldPath = fifoRoute(stops);
  const greedyPath = greedyRoute(stops);
  const newPath = twoOptImprove(greedyPath);

  const oldStats = routeStats(oldPath);
  const newStats = routeStats(newPath);

  const savedKm = Math.max(0, oldStats.km - newStats.km);
  const savedMinutes = Math.max(0, oldStats.minutes - newStats.minutes);

  const vehicles = [{
    id: `vehicle-1`,
    vehicleName: `Xe Tải 1`,
    orders: groupOrders,
    path: newPath,
    stats: newStats,
    savedKm,
    savedMinutes,
    color: '#0F4C3A', // Màu xanh đậm cho Hub
  }];

  return {
    empty: false,
    count: active.length,
    vehicles: vehicles,
    totalSavedKm: Number(savedKm.toFixed(1)),
    totalSavedMinutes: savedMinutes,
  };
}

export function stopKindLabel(kind) {
  if (kind === 'hub') return 'Kho Hub';
  if (kind === 'pickup') return 'Lấy hàng tại Hub';
  return 'Giao hàng';
}