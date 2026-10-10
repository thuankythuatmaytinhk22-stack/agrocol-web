// api/chat.js — Vercel Serverless Function
// File này chạy trên server, không lộ API key ra trình duyệt

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
- KHÔNG trả lời máy móc. Nếu khách hỏi xã giao, hãy trả lời tự nhiên.

KIẾN THỨC:
- Định mức: 250kg/thùng. Ví dụ: 500kg = 2 thùng, 650kg = 3 thùng.
- Giá: 250.000đ/thùng.
- Nhiệt độ bảo quản theo loại nông sản:
${PRODUCT_CATALOG.map(p => `  • ${p.name}: ${p.minTemp}-${p.maxTemp}°C, bảo quản ${p.shelfHours}h. ${p.note}`).join('\n')}
- Tuyến phổ biến: Đắk Lắk → Hà Nội (~1.200km), Đà Lạt → TP.HCM (~300km).

CÁCH TRẢ LỜI:
- Nếu khách chào hỏi: Chào lại thân thiện, giới thiệu ngắn về AgroCold.
- Nếu khách hỏi thông tin chung: Trả lời tự nhiên, không bắt buộc phải có sản phẩm/khối lượng.
- Nếu khách muốn đặt hàng: Thu thập đủ 3 thông tin: loại nông sản, khối lượng (kg), tuyến (điểm lấy → điểm giao). Sau đó tính toán và trả lời theo format:
  "Với [khối lượng]kg [loại nông sản], bạn cần [số thùng] thùng. Nhiệt độ khuyến nghị [min]-[max]°C. Tuyến [A] → [B]. Chi phí dự kiến: [giá]đ. Bạn có muốn đặt ngay không?"
- Nếu khách hỏi loại nông sản chưa có trong danh sách (như cà phê, hồ tiêu): Trả lời rằng AgroCold đang mở rộng, hiện chưa hỗ trợ loại này, đề xuất liên hệ hotline.
- Nếu khách hỏi về đơn hàng cũ: Dùng dữ liệu đơn hàng thực ở dưới (nếu có).

QUAN TRỌNG: Chỉ trả lời bằng tiếng Việt, ngắn gọn (2-4 câu), tự nhiên, không lan man.`;

export default async function handler(req, res) {
  // Cho phép CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history = [], orderContext = '' } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server chưa cấu hình GEMINI_API_KEY' });
  }

  try {
    const systemPromptWithOrder = orderContext
      ? `${SYSTEM_PROMPT}\n\nDỮ LIỆU ĐƠN HÀNG THỰC CỦA KHÁCH:\n${orderContext}`
      : SYSTEM_PROMPT;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPromptWithOrder }],
          },
          contents: [
            ...history,
            { role: 'user', parts: [{ text: message }] },
          ],
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
      console.error('Gemini API error:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'Lỗi Gemini API',
      });
    }

    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ text: aiText.trim() });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Lỗi kết nối Gemini' });
  }
}