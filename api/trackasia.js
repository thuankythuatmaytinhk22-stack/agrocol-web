// api/trackasia.js — Proxy TrackAsia Autocomplete
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { text } = req.query;
  if (!text) return res.status(400).json({ error: 'Missing query' });

  const apiKey = '1791638476f22480510a59e4bb27fbf3d1';

  try {
    const response = await fetch(
      `https://maps.track-asia.com/api/v1/autocomplete?key=${apiKey}&text=${encodeURIComponent(text)}&new_admin=true&limit=8`
    );

    const rawText = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'TrackAsia error',
        status: response.status,
        detail: rawText,
      });
    }

    const data = JSON.parse(rawText);
    const results = (data.features || []).map((f) => {
      const p = f.properties || {};
      const geo = f.geometry || {};
      return {
        // Tên ngắn (VD: "43 Diên Hồng")
        name: p.name || p.street || '',
        // Địa chỉ đầy đủ (VD: "43 Diên Hồng, Phường Hòa Xuân, Quận Cẩm Lệ, Thành phố Đà Nẵng")
        label: p.label || p.name || '',
        // Tọa độ
        lat: geo.coordinates?.[1] || null,
        lng: geo.coordinates?.[0] || null,
        // Thông tin hành chính
        city: p.region || '',
        district: p.county || '',
        ward: p.locality || '',
        country: p.country || '',
        ref_id: p.id || '',
      };
    });

    return res.status(200).json(results);
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}