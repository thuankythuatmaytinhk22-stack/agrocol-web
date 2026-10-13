export default function TempSparkline({ data = [], minTemp = 13, maxTemp = 15 }) {
  if (!data || data.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
        Chưa đủ dữ liệu để vẽ biểu đồ
      </div>
    );
  }

  const temps = data.map((d) => d.temperature);
  const lo = Math.min(minTemp - 2, ...temps);
  const hi = Math.max(maxTemp + 3, ...temps);
  const w = 800;
  const h = 200;
  const pad = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const x = (i) => pad.left + (i / (data.length - 1)) * chartW;
  const y = (t) => pad.top + ((hi - t) / (hi - lo)) * chartH;

  // Vẽ đường line
  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.temperature)}`)
    .join(' ');

  // Vẽ vùng fill bên dưới
  const areaPath = `${linePath} L ${x(data.length - 1)} ${pad.top + chartH} L ${x(0)} ${
    pad.top + chartH
  } Z`;

  // Vùng an toàn (13-15°C)
  const safeY1 = y(maxTemp);
  const safeY2 = y(minTemp);
  const safeHeight = safeY2 - safeY1;

  // Điểm cuối cùng (nhiệt độ hiện tại)
  const lastPoint = data[data.length - 1];
  const lastX = x(data.length - 1);
  const lastY = y(lastPoint.temperature);
  const isSafe = lastPoint.temperature >= minTemp && lastPoint.temperature <= maxTemp;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48">
        {/* Vùng an toàn */}
        <rect
          x={pad.left}
          y={safeY1}
          width={chartW}
          height={safeHeight}
          fill="#4CAF50"
          opacity="0.08"
        />
        <line
          x1={pad.left}
          y1={safeY1}
          x2={w - pad.right}
          y2={safeY1}
          stroke="#4CAF50"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.5"
        />
        <line
          x1={pad.left}
          y1={safeY2}
          x2={w - pad.right}
          y2={safeY2}
          stroke="#4CAF50"
          strokeWidth="1"
          strokeDasharray="4 4"
          opacity="0.5"
        />

        {/* Grid lines ngang */}
        {[lo, (lo + hi) / 2, hi].map((t, i) => (
          <g key={i}>
            <line
              x1={pad.left}
              y1={y(t)}
              x2={w - pad.right}
              y2={y(t)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={y(t) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#9ca3af"
              fontWeight="600"
            >
              {t.toFixed(0)}°
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#tempGradient)" opacity="0.3" />
        <defs>
          <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F4C3A" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0F4C3A" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#0F4C3A"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Điểm cuối */}
        <circle
          cx={lastX}
          cy={lastY}
          r="6"
          fill={isSafe ? '#4CAF50' : '#EF4444'}
          stroke="#fff"
          strokeWidth="3"
        />

        {/* Trục X labels - giờ */}
        {data.length > 1 &&
          [0, Math.floor(data.length / 2), data.length - 1].map((i) => (
            <text
              key={i}
              x={x(i)}
              y={h - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#9ca3af"
              fontWeight="600"
            >
              {new Date(data[i].created_at).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </text>
          ))}
      </svg>
    </div>
  );
}