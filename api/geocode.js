// api/geocode.js — Proxy Nominatim qua Vercel
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=vn`,
      {
        headers: {
          'User-Agent': 'AgroCold/1.0 (contact@agrocold.vn)',
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Nominatim error' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Geocode error:', error);
    return res.status(500).json({ error: error.message });
  }
}