// api/chat.js — Vercel Serverless Function

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

KIẾN THỨC CỐT LÕI (BẮT BUỘC TUÂN THỦ):
- Định mức đóng thùng: 350kg/thùng.
- Giá cước: 400.000đ/thùng.
- Địa chỉ Kho Hub duy nhất: "Kho lạnh AgroCold - 123 Lê Duẩn, TP. Buôn Ma Thuột, Đắk Lắk".
- AgroCold CHỈ HỖ TRỢ 4 loại nông sản: Sầu riêng, Bơ, Dâu tây, Xoài.
- Nhiệt độ bảo quản:
${PRODUCT_CATALOG.map(p => `  • ${p.name}: ${p.minTemp}-${p.maxTemp}°C, bảo quản ${p.shelfHours}h`).join('\n')}

QUY TẮC TRẢ LỜI (CỰC KỲ QUAN TRỌNG):
1. KHÔNG TỰ TÍNH TOÁN số thùng hay số tiền. Hệ thống Frontend sẽ tự tính và hiển thị cho khách. Bạn chỉ cần trả lời xác nhận.
2. KHÔNG TỰ BỊA số liệu nếu khách không cung cấp. Nếu khách cung cấp thông tin gì (Tên, SĐT, Cân nặng...), hãy xác nhận lại.
3. Nếu khách đổi ý hoặc hỏi thêm (ví dụ: "10h sáng mai giao được không"), hãy trả lời xác nhận.
4. KHI VÀ CHỈ KHI khách đã cung cấp ĐỦ 5 thông tin (Loại hàng, Khối lượng, Điểm đến, Tên, SĐT), bạn mới được chèn khối JSON ở cuối cùng:
<<<ORDER_DATA>>>
{"is_ready": true, "customer_name": "Tên khách", "customer_phone": "SĐT", "product_type": "Tên sản phẩm", "weight": 500, "delivery_address": "Địa chỉ khách muốn giao"}
<<<END_ORDER_DATA>>>

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
        model: 'openai/gpt-oss-120b',
        messages,
        temperature: 0.6,
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