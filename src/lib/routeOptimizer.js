import { matchProduct } from './coldChain';

export const KNOWN_PLACES = [
  { keys: ['hub', 'buôn ma thuột', 'buon ma thuot', 'bmt'], name: 'Hub AgroCold Buôn Ma Thuột', lat: 12.6662, lng: 108.0382 },
  { keys: ['đắk lắk', 'dak lak', 'đak lak', 'nhà vườn đắk'], name: 'Nhà vườn Đắk Lắk', lat: 12.7105, lng: 108.2378 },
  { keys: ['lâm đồng', 'lam dong', 'đà lạt', 'da lat'], name: 'Nông trại Lâm Đồng', lat: 11.9404, lng: 108.4583 },
  { keys: ['bình điền', 'binh dien'], name: 'Chợ Bình Điền, TP.HCM', lat: 10.721, lng: 106.611 },
  { keys: ['hcm', 'tp.hcm', 'sài gòn', 'sai gon', 'hồ chí minh', 'ho chi minh', 'thủ đức'], name: 'Hub giao TP.HCM', lat: 10.7769, lng: 106.7009 },
  { keys: ['hà nội', 'ha noi', 'hanoi'], name: 'Điểm giao Hà Nội', lat: 21.0278, lng: 105.8342 },
  { keys: ['đà nẵng', 'da nang'], name: 'Điểm giao Đà Nẵng', lat: 16.0544, lng: 108.2022 },
  { keys: ['cần thơ', 'can tho'], name: 'Chợ đầu mối Cần Thơ', lat: 10.0452, lng: 105.7469 },
  { keys: ['nghệ an', 'nghe an', 'vinh'], name: 'Điểm giao Nghệ An', lat: 18.6796, lng: 105.6813 },
];

const HUB = KNOWN_PLACES[0];
const AVG_KMH = 42;

export function geocodeAddress(address = '') {
  const raw = address.toLowerCase();
  const found = KNOWN_PLACES.find((p) => p.keys.some((k) => raw.includes(k)));
  if (found) return { ...found, matched: true };
  const fallback = {
    name: address || 'Điểm chưa định vị',
    lat: 12.6662 + ((address.length % 9) - 4) * 0.35,
    lng: 108.0382 + ((address.length % 7) - 3) * 0.4,
    matched: false,
  };
  return fallback;
}

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
    const pickup = (order.pickup_lat && order.pickup_lng)
      ? { name: order.pickup_address || 'Điểm lấy hàng', lat: order.pickup_lat, lng: order.pickup_lng }
      : geocodeAddress(order.pickup_address);
    const delivery = (order.delivery_lat && order.delivery_lng)
      ? { name: order.delivery_address || 'Điểm giao hàng', lat: order.delivery_lat, lng: order.delivery_lng }
      : geocodeAddress(order.delivery_address);

    return [
      { id: `${order.id}-p`, order, kind: 'pickup', product, label: pickup.name, lat: pickup.lat, lng: pickup.lng, shelfHours: product.shelfHours },
      { id: `${order.id}-d`, order, kind: 'delivery', product, label: delivery.name, lat: delivery.lat, lng: delivery.lng, shelfHours: product.shelfHours },
    ];
  });
}

// Thuật toán Greedy đơn giản (giữ nguyên)
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

  // BƯỚC 1: Gom nhóm các đơn hàng theo điểm lấy (Pickup Address)
  // Những đơn nào cùng điểm lấy hàng thì gom vào 1 nhóm (1 xe)
  const groupMap = {};
  active.forEach((order) => {
    // Tạo key từ tọa độ hoặc địa chỉ pickup để gom nhóm
    const key = order.pickup_address || 'unknown';
    if (!groupMap[key]) groupMap[key] = [];
    groupMap[key].push(order);
  });

  const vehicles = [];
  let totalSavedKm = 0;
  let totalSavedMinutes = 0;

  // BƯỚC 2: Mỗi nhóm đơn hàng sẽ được tối ưu riêng
  Object.values(groupMap).forEach((groupOrders, index) => {
    const stops = buildStops(groupOrders);
    const oldPath = fifoRoute(stops);
    const greedyPath = greedyRoute(stops);
    const newPath = twoOptImprove(greedyPath);

    const oldStats = routeStats(oldPath);
    const newStats = routeStats(newPath);

    const savedKm = Math.max(0, oldStats.km - newStats.km);
    const savedMinutes = Math.max(0, oldStats.minutes - newStats.minutes);

    totalSavedKm += savedKm;
    totalSavedMinutes += savedMinutes;

    vehicles.push({
      id: `vehicle-${index + 1}`,
      vehicleName: `Xe ${index + 1}`, // Tên tạm, sẽ gán biển số sau
      orders: groupOrders,
      path: newPath,
      stats: newStats,
      savedKm,
      savedMinutes,
      // Màu cho từng tuyến đường
      color: [
        '#0F4C3A', // Xanh đậm
        '#FF6B9D', // Hồng
        '#4CAF50', // Xanh lá
        '#F4C542', // Vàng
        '#9C27B0', // Tím
        '#FF5722', // Cam
      ][index % 6],
    });
  });

  return {
    empty: false,
    count: active.length,
    vehicles: vehicles,
    totalSavedKm: Number(totalSavedKm.toFixed(1)),
    totalSavedMinutes: totalSavedMinutes,
  };
}

export function stopKindLabel(kind) {
  if (kind === 'hub') return 'Kho';
  if (kind === 'pickup') return 'Lấy hàng';
  return 'Giao hàng';
}