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
      `https://maps.track-asia.com/api/v1/autocomplete?key=${apiKey}&text=${encodeURIComponent(text)}&country=vn&limit=8`
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
    // TrackAsia trả về GeoJSON: { type: "FeatureCollection", features: [...] }
    // Chuyển thành mảng đơn giản cho frontend
    const results = (data.features || []).map((f) => ({
      name: f.properties?.name || f.properties?.address || '',
      address: f.properties?.address || '',
      lat: f.geometry?.coordinates?.[1] || null,
      lng: f.geometry?.coordinates?.[0] || null,
      ref_id: f.properties?.id || '',
      city: f.properties?.city || '',
      district: f.properties?.district || '',
    }));

    return res.status(200).json(results);
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}