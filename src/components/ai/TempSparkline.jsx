export default function TempSparkline({ points = [], minTemp, maxTemp }) {
  if (!points.length) return null;
  const temps = points.map((p) => p.temp);
  const lo = Math.min(minTemp - 2, ...temps);
  const hi = Math.max(maxTemp + 3, ...temps);
  const w = 320;
  const h = 88;
  const pad = 8;
  const x = (i) => pad + (i / (points.length - 1)) * (w - pad * 2);
  const y = (t) => pad + ((hi - t) / (hi - lo)) * (h - pad * 2);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.temp)}`).join(' ');
  const nowIndex = points.findIndex((p) => p.minute === 0);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24">
      <rect
        x={pad}
        y={y(maxTemp)}
        width={w - pad * 2}
        height={Math.max(2, y(minTemp) - y(maxTemp))}
        fill="#4CAF50"
        opacity="0.12"
      />
      <path d={d} fill="none" stroke="#0F4C3A" strokeWidth="2.5" />
      {nowIndex >= 0 && (
        <circle cx={x(nowIndex)} cy={y(points[nowIndex].temp)} r="4" fill="#F4C542" stroke="#0F4C3A" strokeWidth="1.5" />
      )}
    </svg>
  );
}
