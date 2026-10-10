export const KG_PER_BOX = 250;
export const COST_PER_BOX = 250000;

export const PRODUCT_CATALOG = [
  {
    key: 'sau-rieng',
    name: 'Sầu riêng',
    aliases: ['sầu riêng', 'sau rieng', 'durian'],
    minTemp: 13,
    maxTemp: 15,
    shelfHours: 36,
    note: 'Nhạy cảm với nhiệt độ cao, ưu tiên giao sớm.',
  },
  {
    key: 'xoai',
    name: 'Xoài',
    aliases: ['xoài', 'xoai', 'mango'],
    minTemp: 10,
    maxTemp: 13,
    shelfHours: 48,
    note: 'Giữ mát ổn định, tránh sốc nhiệt.',
  },
  {
    key: 'thanh-long',
    name: 'Thanh long',
    aliases: ['thanh long'],
    minTemp: 8,
    maxTemp: 12,
    shelfHours: 60,
    note: 'Chịu lạnh tốt hơn sầu riêng.',
  },
  {
    key: 'rau',
    name: 'Rau lá',
    aliases: ['rau', 'rau lá', 'rau xanh', 'cải'],
    minTemp: 2,
    maxTemp: 6,
    shelfHours: 18,
    note: 'Rất dễ héo, cần ưu tiên tuyến đầu.',
  },
  {
    key: 'ca-chua',
    name: 'Cà chua',
    aliases: ['cà chua', 'ca chua', 'tomato'],
    minTemp: 10,
    maxTemp: 13,
    shelfHours: 40,
    note: 'Không để quá lạnh để tránh tổn thương lạnh.',
  },
  {
    key: 'nho',
    name: 'Nho',
    aliases: ['nho', 'grape'],
    minTemp: 0,
    maxTemp: 4,
    shelfHours: 72,
    note: 'Cần lạnh sâu và ổn định.',
  },
  {
    key: 'default',
    name: 'Nông sản',
    aliases: [],
    minTemp: 13,
    maxTemp: 15,
    shelfHours: 36,
    note: 'Áp dụng cấu hình AgroCold mặc định.',
  },
];

export function matchProduct(text = '') {
  const raw = text.toLowerCase().trim();
  if (!raw) return PRODUCT_CATALOG.find((p) => p.key === 'default');
  const found = PRODUCT_CATALOG.find((p) =>
    p.aliases.some((alias) => raw.includes(alias)) || raw.includes(p.name.toLowerCase())
  );
  return found || PRODUCT_CATALOG.find((p) => p.key === 'default');
}

export function calcBoxes(weightKg) {
  const weight = Number(weightKg);
  if (!weight || weight <= 0) return 0;
  return Math.ceil(weight / KG_PER_BOX);
}

export function calcCost(boxes) {
  return boxes * COST_PER_BOX;
}

export function formatVnd(n) {
  return `${Number(n || 0).toLocaleString('vi-VN')}đ`;
}

function hashSeed(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

/** Mô hình nhiệt đơn giản: T tiến về nhiệt ngoài trời, tau phụ thuộc tốc độ & làm lạnh. */
export function predictTemp({ currentTemp, outdoorTemp, speedKmh, minutesAhead, coolingOn = true }) {
  const jamFactor = speedKmh < 18 ? 0.55 : speedKmh < 35 ? 0.8 : 1;
  const coolingFactor = coolingOn ? 1.4 : 0.7;
  const tau = 90 * jamFactor * coolingFactor;
  const t = minutesAhead;
  return outdoorTemp - (outdoorTemp - currentTemp) * Math.exp(-t / tau);
}

export function spoilageProbability({ temp, product, minutesToBreach }) {
  const { minTemp, maxTemp } = product;
  if (temp >= maxTemp + 4) return 0.82;
  if (temp >= maxTemp + 2) return 0.58;
  if (temp > maxTemp) return 0.36;
  if (temp < minTemp - 2) return 0.22;
  if (minutesToBreach !== null && minutesToBreach <= 20) return 0.41;
  if (temp > maxTemp - 1) return 0.18;
  return 0.06;
}

export function minutesUntilBreach({ currentTemp, outdoorTemp, speedKmh, maxTemp, coolingOn = true }) {
  if (currentTemp >= maxTemp) return 0;
  for (let m = 1; m <= 90; m += 1) {
    const t = predictTemp({ currentTemp, outdoorTemp, speedKmh, minutesAhead: m, coolingOn });
    if (t >= maxTemp) return m;
  }
  return null;
}

export function simulateColdTelemetry(order) {
  const product = matchProduct(order?.product_type);
  const seed = hashSeed(order?.order_code || order?.id || 'ac');
  const elapsedMin = ((Date.now() / 1000) % 900) / 60;
  const inTransit = order?.status === 'shipping' || order?.status === 'packed';
  const startTemp = Number(((product.minTemp + product.maxTemp) / 2).toFixed(1));
  const rangeLabel = `${product.minTemp}–${product.maxTemp}°C`;

  if (!inTransit) {
    const forecast = [];
    for (let m = -20; m <= 30; m += 5) forecast.push({ minute: m, temp: startTemp });
    return {
      product,
      currentTemp: startTemp,
      predicted30: startTemp,
      outdoorTemp: 30,
      speedKmh: 0,
      isJam: false,
      coolingOn: true,
      forecast,
      breachIn: null,
      risk: 0.05,
      inRange: true,
      level: 'ok',
      title: 'Nhiệt độ trong ngưỡng',
      advice: `Thùng đang ${order?.status === 'delivered' ? 'sau giao' : 'chờ xuất'} · giữ dải ${rangeLabel}.`,
      rangeLabel,
    };
  }

  const isJam = seed % 3 === 0 || /hà nội|ha noi/i.test(order?.delivery_address || '');
  const speedKmh = isJam ? 8 + (seed % 7) : 38 + (seed % 12);
  const outdoorTemp = 32 + (seed % 8) + (isJam ? 2 : 0);
  const coolingOn = seed % 5 !== 0;
  const currentTemp = Number(
    predictTemp({
      currentTemp: startTemp,
      outdoorTemp,
      speedKmh,
      minutesAhead: 8 + elapsedMin * (isJam ? 1.6 : 0.7),
      coolingOn,
    }).toFixed(1)
  );

  const forecast = [];
  for (let m = -20; m <= 30; m += 5) {
    const temp =
      m <= 0
        ? predictTemp({
            currentTemp: startTemp,
            outdoorTemp,
            speedKmh,
            minutesAhead: 8 + elapsedMin * (isJam ? 1.6 : 0.7) + m,
            coolingOn,
          })
        : predictTemp({ currentTemp, outdoorTemp, speedKmh, minutesAhead: m, coolingOn });
    forecast.push({ minute: m, temp: Number(temp.toFixed(1)) });
  }

  const predicted30 = forecast.find((p) => p.minute === 30)?.temp ?? currentTemp;
  const breachIn = minutesUntilBreach({
    currentTemp,
    outdoorTemp,
    speedKmh,
    maxTemp: product.maxTemp,
    coolingOn,
  });
  const risk = spoilageProbability({ temp: predicted30, product, minutesToBreach: breachIn });
  const inRange = currentTemp >= product.minTemp && currentTemp <= product.maxTemp;
  const rising = predicted30 - currentTemp > 0.8;

  let level = 'ok';
  let title = 'Nhiệt độ trong ngưỡng';
  let advice = `Duy trì dải ${product.minTemp}–${product.maxTemp}°C cho ${product.name}.`;

  if (!inRange || risk >= 0.35 || (breachIn !== null && breachIn <= 25 && rising)) {
    level = risk >= 0.5 ? 'critical' : 'warning';
    title =
      level === 'critical'
        ? `Cảnh báo: ${order?.order_code || 'thùng'} có nguy cơ hư hỏng`
        : `Cảnh báo: nhiệt độ có xu hướng tăng`;
    const reason = isJam
      ? `xe đang kẹt tuyến, nhiệt ngoài trời ${outdoorTemp}°C, tốc độ ~${speedKmh} km/h`
      : `nhiệt ngoài trời ${outdoorTemp}°C và làm lạnh ${coolingOn ? 'đang yếu dần' : 'chưa ổn định'}`;
    advice = `Nhiệt độ dự kiến ${predicted30}°C trong 30 phút tới. Nguyên nhân: ${reason}. Đề xuất: bật chế độ làm lạnh khẩn cấp và ưu tiên giao lô này.`;
  }

  return {
    product,
    currentTemp,
    predicted30,
    outdoorTemp,
    speedKmh,
    isJam,
    coolingOn,
    forecast,
    breachIn,
    risk,
    inRange,
    level,
    title,
    advice,
    rangeLabel: `${product.minTemp}–${product.maxTemp}°C`,
  };
}
