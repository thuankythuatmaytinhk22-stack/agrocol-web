// api/trackasia-detail.js — Lấy chi tiết địa chỉ từ ref_id
const TRACKASIA_KEY = '1791638476f22480510a59e4bb27fbf3d1';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { refid } = req.query;
  if (!refid) return res.status(400).json({ error: 'Missing refid' });

  try {
    const response = await fetch(
      `https://maps.track-asia.com/api/v1/place?refid=${refid}`,
      {
        headers: {
          'X-API-KEY': TRACKASIA_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('TrackAsia detail error:', response.status, errText);
      return res.status(response.status).json({ error: 'TrackAsia detail error' });
    }

    const data = await response.json();
    return res.status(200).json({
      lat: data.lat,
      lng: data.lng,
      name: data.name,
      address: data.address,
      display: data.display,
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}