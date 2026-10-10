// api/chat.js — Vercel Serverless Function
// Dùng Gemini 2.5 Flash với key AQ. qua header

const PRODUCT_CATALOG = [
  { name: 'Sầu riêng', minTemp: 13, maxTemp: 15, shelfHours: 36, note: 'Nhạy cảm với nhiệt độ cao' },
  { name: 'Xoài', minTemp: 10, maxTemp: 13, shelfHours: 48, note: 'Tránh sốc nhiệt' },
  { name: 'Thanh long', minTemp: 8, maxTemp: 12, shelfHours: 60, note: 'Chịu lạnh tốt' },
  { name: 'Rau lá', minTemp: 2, maxTemp: 6, shelfHours: 18, note: 'Rất dễ héo' },
  { name: 'Cà chua', minTemp: 10, maxTemp: 13, shelfHours: 40, note: 'Không để quá lạnh' },
  { name: 'Nho', minTemp: 0, maxTemp: 4, shelfHours: 72, note: 'Cần lạnh sâu' },
];

const SYSTEM_PROMPT = `Bạn là trợ lý AI tư vấn của AgroCold - công ty logistics chuỗi lạnh chuyên vận chuyển nông sản Việt Nam.

NHIỆM VỤ:
- Tư vấn khách hàng về đặt thùng lạnh vận chuyển nông sản.
- Trả lời thân thiện, tự nhiên, xưng "mình" và gọi khách là "bạn".
- KHÔNG trả lời máy móc.

KIẾN THỨC:
- Định mức: 250kg/thùng. Ví dụ: 500kg = 2 thùng, 650kg = 3 thùng.
- Giá: 250.000đ/thùng.
- Nhiệt độ bảo quản:
${PRODUCT_CATALOG.map(p => `  • ${p.name}: ${p.minTemp}-${p.maxTemp}°C, bảo quản ${p.shelfHours}h`).join('\n')}
- Tuyến phổ biến: Đắk Lắk → Hà Nội, Đà Lạt → TP.HCM.

CÁCH TRẢ LỜI:
- Khách chào: Chào lại thân thiện.
- Khách hỏi chung: Trả lời tự nhiên.
- Khách muốn đặt: Thu thập sản phẩm + khối lượng + tuyến. Trả lời:
  "Với [X]kg [sản phẩm], bạn cần [N] thùng. Nhiệt độ [min]-[max]°C. Chi phí: [giá]đ. Bạn muốn đặt ngay không?"
- Khách hỏi loại chưa hỗ trợ (cà phê, hồ tiêu): Trả lời AgroCold chưa hỗ trợ.
- Khách hỏi đơn hàng: Dùng dữ liệu đơn hàng ở dưới (nếu có).

QUAN TRỌNG: Chỉ trả lời tiếng Việt, ngắn gọn 2-4 câu, tự nhiên.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [], orderContext = '' } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY');
    return res.status(500).json({ error: 'Server chưa cấu hình GEMINI_API_KEY' });
  }

  try {
    const systemPromptWithOrder = orderContext
      ? `${SYSTEM_PROMPT}\n\nDỮ LIỆU ĐƠN HÀNG THỰC:\n${orderContext}`
      : SYSTEM_PROMPT;

    // Format cho Gemini API
    const contents = [
      ...history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.parts?.[0]?.text || m.text || '' }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    // DÙNG HEADER x-goog-api-key THAY VÌ ?key=
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,  // <-- QUAN TRỌNG: Dùng header, không dùng query string
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPromptWithOrder }],
          },
          contents,
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 300,
            topP: 0.95,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', response.status, JSON.stringify(data));
      return res.status(response.status).json({
        error: data.error?.message || `Lỗi Gemini API (${response.status})`,
      });
    }

    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ text: aiText.trim() });
  } catch (error) {
    console.error('Server error:', error.message, error.stack);
    return res.status(500).json({ error: 'Lỗi kết nối Gemini: ' + error.message });
  }
}