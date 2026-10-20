// api/chat.js — Vercel Serverless Function
// Dùng Groq (miễn phí, nhanh, không cần thẻ tín dụng)

// DANH MỤC NÔNG SẢN MỚI (Chỉ hỗ trợ 4 loại)
const PRODUCT_CATALOG = [
  { name: 'Sầu riêng', minTemp: 13, maxTemp: 15, shelfHours: 48, note: 'Bảo quản lạnh sâu, tránh sốc nhiệt' },
  { name: 'Bơ', minTemp: 4, maxTemp: 13, shelfHours: 72, note: 'Bảo quản mát, tránh ánh sáng trực tiếp' },
  { name: 'Dâu tây', minTemp: -0.5, maxTemp: 1, shelfHours: 24, note: 'Cần độ ẩm cao, tránh dập nát' },
  { name: 'Xoài', minTemp: 10, maxTemp: 13, shelfHours: 60, note: 'Nhiệt độ phù hợp để xoài chín đều' },
];

const SYSTEM_PROMPT = `Bạn là trợ lý AI tư vấn của AgroCold - công ty logistics chuỗi lạnh chuyên vận chuyển nông sản Việt Nam.

NHIỆM VỤ:
- Tư vấn khách hàng về đặt thùng lạnh vận chuyển nông sản.
- Trả lời thân thiện, tự nhiên, xưng "mình" và gọi khách là "bạn".
- KHÔNG trả lời máy móc.

KIẾN THỨC CỐT LÕI (BẮT BUỘC TUÂN THỦ):
- Định mức đóng thùng: 350kg/thùng (Làm tròn lên. Ví dụ: 500kg = 2 thùng, 650kg = 2 thùng, 780kg = 3 thùng).
- Giá cước: 400.000đ/thùng.
- Địa chỉ Kho Hub duy nhất: "Kho lạnh AgroCold - 123 Lê Duẩn, TP. Buôn Ma Thuột, Đắk Lắk". Mọi nông sản đều phải tập kết về đây để đóng thùng PCM trước khi giao đi.
- AgroCold CHỈ HỖ TRỢ 4 loại nông sản: Sầu riêng, Bơ, Dâu tây, Xoài.
- Nhiệt độ bảo quản:
${PRODUCT_CATALOG.map(p => `  • ${p.name}: ${p.minTemp}-${p.maxTemp}°C, bảo quản ${p.shelfHours}h`).join('\n')}

CÁCH TRẢ LỜI:
- Khách chào: Chào lại thân thiện.
- Khách hỏi chung: Trả lời tự nhiên.
- Khách muốn đặt: Thu thập sản phẩm + khối lượng + tuyến giao hàng. Trả lời:
  "Với [X]kg [sản phẩm], bạn cần [N] thùng (350kg/thùng). Nhiệt độ [min]-[max]°C. Chi phí: [giá]đ. Bạn muốn đặt ngay không?"
- Khách hỏi loại chưa hỗ trợ (cà phê, hồ tiêu, rau...): Trả lời AgroCold hiện chỉ hỗ trợ Sầu riêng, Bơ, Dâu tây, Xoài.
- Khách hỏi đơn hàng: Dùng dữ liệu đơn hàng ở dưới (nếu có).
- Nếu khách hỏi gửi từ đâu: Nhắc họ mọi hàng đều phải gửi về Kho Hub ở Buôn Ma Thuột.

QUAN TRỌNG: Chỉ trả lời tiếng Việt, ngắn gọn 2-4 câu, tự nhiên.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [], orderContext = '' } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error('Missing GROQ_API_KEY');
    return res.status(500).json({ error: 'Server chưa cấu hình GROQ_API_KEY' });
  }

  try {
    const systemPromptWithOrder = orderContext
      ? `${SYSTEM_PROMPT}\n\nDỮ LIỆU ĐƠN HÀNG THỰC CỦA KHÁCH ĐANG TRA CỨU:\n${orderContext}`
      : SYSTEM_PROMPT;

    const messages = [
      { role: 'system', content: systemPromptWithOrder },
      ...history.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.parts?.[0]?.text || m.text || '',
      })),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b', // Model này rất thông minh
        messages,
        temperature: 0.6, // Giảm độ sáng tạo để AI bám sát thông số
        max_tokens: 300,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq API error:', response.status, JSON.stringify(data));
      return res.status(response.status).json({
        error: data.error?.message || `Lỗi Groq (${response.status})`,
      });
    }

    const aiText = data?.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text: aiText.trim() });
  } catch (error) {
    console.error('Server error:', error.message, error.stack);
    return res.status(500).json({ error: 'Lỗi kết nối: ' + error.message });
  }
}