// api/chat.js — Vercel Serverless Function

const PRODUCT_CATALOG = [
  { name: 'Sầu riêng', minTemp: 13, maxTemp: 15, shelfHours: 48, note: 'Bảo quản lạnh sâu, tránh sốc nhiệt' },
  { name: 'Bơ', minTemp: 4, maxTemp: 13, shelfHours: 72, note: 'Bảo quản mát, tránh ánh sáng trực tiếp' },
  { name: 'Dâu tây', minTemp: -0.5, maxTemp: 1, shelfHours: 24, note: 'Cần độ ẩm cao, tránh dập nát' },
  { name: 'Xoài', minTemp: 10, maxTemp: 13, shelfHours: 60, note: 'Nhiệt độ phù hợp để xoài chín đều' },
];

const SYSTEM_PROMPT = `Bạn là trợ lý AI tư vấn của AgroCold.

NHIỆM VỤ:
- Tư vấn đặt thùng lạnh vận chuyển nông sản. Xưng "mình", gọi khách là "bạn".
- Hỗ trợ 4 loại: Sầu riêng, Bơ, Dâu tây, Xoài.

QUY TẮC BẮT BUỘC:
1. KHÔNG TỰ TÍNH TOÁN số thùng hay số tiền. Frontend sẽ tự tính.
2. Bạn cần thu thập 5 thông tin: Tên, SĐT, Loại hàng, Khối lượng (kg), Điểm đến.
3. Nếu khách đã cung cấp đủ 5 thông tin trên (dù chưa có ngày giờ), BẠN PHẢI TRẢ LỜI XÁC NHẬN (VD: "Mình đã ghi nhận đủ thông tin, bạn kiểm tra lại nhé") VÀ BẮT BUỘC chèn khối JSON ở cuối cùng như sau:
<<<ORDER_DATA>>>
{"is_ready": true, "customer_name": "Tên", "customer_phone": "SĐT", "product_type": "Sản phẩm", "weight": 300, "delivery_address": "Địa chỉ"}
<<<END_ORDER_DATA>>>
4. Nếu khách cung cấp thêm ngày giờ (VD: "8h sáng 19/11/2026"), hãy thêm "send_date": "2026-11-19", "pickup_time": "08:00" vào trong JSON trên.
5. TUYỆT ĐỐI KHÔNG hỏi lại những thông tin mà khách đã cung cấp. Hãy nhìn vào lịch sử chat để ghi nhớ.

QUAN TRỌNG: Chỉ trả lời tiếng Việt, ngắn gọn 1-2 câu.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [], orderContext = '' } = req.body;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'Server chưa cấu hình GROQ_API_KEY' });

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
        temperature: 0.3, // Hạ nhiệt độ xuống để AI bám sát luật, ít bịa
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message });

    const aiText = data?.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text: aiText.trim() });
  } catch (error) {
    return res.status(500).json({ error: 'Lỗi kết nối: ' + error.message });
  }
}