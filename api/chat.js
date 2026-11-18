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

KIẾN THỨC CỐT LÕI:
- Định mức đóng thùng: 350kg/thùng. Giá cước: 400.000đ/thùng.
- AgroCold CHỈ HỖ TRỢ 4 loại nông sản: Sầu riêng, Bơ, Dâu tây, Xoài.

QUY TẮC TRẢ LỜI (CỰC KỲ QUAN TRỌNG):
1. KHÔNG TỰ TÍNH TOÁN số thùng hay số tiền.
2. BẠN PHẢI ĐỌC LỊCH SỬ CHAT ĐỂ NHỚ THÔNG TIN KHÁCH ĐÃ CUNG CẤP. TUYỆT ĐỐI KHÔNG HỎI LẠI thông tin đã có.
3. Bạn cần thu thập 5 thông tin: Tên, SĐT, Loại hàng, Khối lượng (kg) và Ngày/Giờ muốn giao.
4. TUYỆT ĐỐI KHÔNG HỎI ĐỊA CHỈ. Hãy nói với khách: "Địa chỉ bạn sẽ tự chọn trên bản đồ ở bước tiếp theo nhé".
5. Nếu khách cung cấp ngày giờ (VD: "3h chiều 19/11/2026"), hãy ghi nhận thành: "send_date": "2026-11-19", "pickup_time": "15:00".
6. KHI VÀ CHỈ KHI đã có đủ 5 thông tin (Tên, SĐT, Hàng, Cân, Ngày/Giờ), bạn BẮT BUỘC phải trả lời xác nhận: "Mình đã ghi nhận đủ thông tin. Vì cần tọa độ chính xác, bạn vui lòng chọn điểm giao trên bản đồ ở bước tiếp theo nhé!" VÀ chèn khối JSON ở cuối:
<<<ORDER_DATA>>>
{"is_ready": true, "customer_name": "Tên", "customer_phone": "SĐT", "product_type": "Sản phẩm", "weight": 300, "delivery_address": "", "send_date": "YYYY-MM-DD", "pickup_time": "HH:mm"}
<<<END_ORDER_DATA>>>
(Lưu ý: delivery_address luôn để trống "" vì khách sẽ tự pick bản đồ).

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
        temperature: 0.1,
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