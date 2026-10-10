// api/trackasia.js — Proxy TrackAsia Autocomplete
const TRACKASIA_KEY = '1791638476f22480510a59e4bb27fbf3d1';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { text } = req.query;
  if (!text) return res.status(400).json({ error: 'Missing query' });

  try {
    // TrackAsia yêu cầu key qua header X-API-KEY
    const response = await fetch(
      `https://maps.track-asia.com/api/v1/autocomplete?text=${encodeURIComponent(text)}&country=vn&limit=8`,
      {
        headers: {
          'X-API-KEY': TRACKASIA_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('TrackAsia error:', response.status, errText);
      return res.status(response.status).json({ error: 'TrackAsia error', detail: errText });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}