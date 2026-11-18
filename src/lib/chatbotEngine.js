import { calcBoxes, calcCost, formatVnd, matchProduct } from './coldChain';
import { supabase } from './supabaseClient';

const KG_RE = /(\d+(?:[.,]\d+)?)\s*(kg|kí|ki|ký|kilogram)/i; 
const TON_RE = /(\d+(?:[.,]\d+)?)\s*(tấn|tan)/i;
const FROM_TO_RE = /từ\s+(.+?)\s+(?:đi|đến|tới|ra|vào)\s+(.+?)(?:[.,!?]|$)/i;
const CITY_RE = /(đắk lắk|dak lak|đà lạt|da lat|lâm đồng|hà nội|ha noi|tp\.?hcm|hồ chí minh|sài gòn|bình điền|đà nẵng|cần thơ|nghệ an|huế|hải phòng|quảng ninh|buôn ma thuột)/i;
const PHONE_RE = /(0\d{9,10})/;
// Bắt địa chỉ nếu có chữ "địa chỉ", "giao đến", "số nhà"
const ADDRESS_RE = /(?:địa chỉ|giao đến|giao tại|số nhà)\s*(?:là|:)?\s*([^,\.]+)/i;

function parseWeight(text) {
  const ton = text.match(TON_RE);
  if (ton) return parseFloat(ton[1].replace(',', '.')) * 1000;
  const kg = text.match(KG_RE);
  if (kg) return parseFloat(kg[1].replace(',', '.'));
  return null;
}

function localExtract(text) {
  const product = matchProduct(text);
  const weight = parseWeight(text);
  const phoneMatch = text.match(PHONE_RE);
  const nameMatch = text.match(/(?:tên|tôi|mình)\s*(?:là|:)?\s*([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+)*)/i);
  const addressMatch = text.match(ADDRESS_RE) || text.match(/[0-9]+\s+[^,]+(?:đường|phố|quận|huyện|thành phố)/i);
  
  return {
    product_type: product.key === 'default' && !/nông sản|hàng/i.test(text) ? '' : product.name,
    weight,
    pickup_address: '',
    delivery_address: addressMatch ? addressMatch[1].trim() : '',
    customer_phone: phoneMatch ? phoneMatch[1] : '',
    customer_name: nameMatch ? nameMatch[1].trim() : '',
  };
}

async function callAI(userText, prevSlots, chatHistory = []) {
  let orderContext = '';
  const phoneInText = userText.match(PHONE_RE);
  if (phoneInText || (prevSlots.customer_phone && /đơn|hàng|kiểm tra|xem|tra cứu/i.test(userText))) {
    const phone = phoneInText ? phoneInText[1] : prevSlots.customer_phone;
    try {
      const { data } = await supabase
        .from('orders')
        .select('order_code, product_type, weight, boxes, status, pickup_address, delivery_address')
        .eq('customer_phone', phone)
        .order('created_at', { ascending: false })
        .limit(3);
      if (data && data.length > 0) {
        orderContext = data.map(o =>
          `- Mã ${o.order_code}: ${o.product_type}, ${o.weight}kg (${o.boxes} thùng), trạng thái "${o.status}", từ ${o.pickup_address} đến ${o.delivery_address}`
        ).join('\n');
      }
    } catch (e) {
      console.error('Lỗi tra cứu đơn:', e);
    }
  }

  try {
    const res = await fetch(`${window.location.origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        history: chatHistory.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        })),
        orderContext,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.text || null;
  } catch (e) {
    return null;
  }
}

export function quoteFromSlots(slots) {
  const product = matchProduct(slots.product_type || '');
  const weight = Number(slots.weight);
  const boxes = calcBoxes(weight);
  const cost = calcCost(boxes);
  
  // Nếu đã có đủ Tên, SĐT, Cân nặng, Điểm đến -> Coi như complete = true
  const complete = Boolean(product && weight > 0 && slots.customer_name && slots.customer_phone && slots.delivery_address);

  return {
    complete,
    product,
    product_type: slots.product_type || product.name,
    weight: weight || '',
    boxes,
    cost,
    pickup_address: slots.pickup_address || '',
    delivery_address: slots.delivery_address || '',
    customer_name: slots.customer_name || '',
    customer_phone: slots.customer_phone || '',
    send_date: slots.send_date || '',
    pickup_time: slots.pickup_time || '',
  };
}

export async function answerChat(userText, prevSlots = {}, chatHistory = []) {
  const local = localExtract(userText);
  
  // Gộp dữ liệu: Nếu câu mới có thì lấy, không thì lấy từ bộ nhớ
  const merged = {
    product_type: local.product_type || prevSlots.product_type || '',
    weight: local.weight || prevSlots.weight || '',
    pickup_address: local.pickup_address || prevSlots.pickup_address || '',
    delivery_address: local.delivery_address || prevSlots.delivery_address || '',
    customer_name: local.customer_name || prevSlots.customer_name || '',
    customer_phone: local.customer_phone || prevSlots.customer_phone || '',
    send_date: prevSlots.send_date || '',
    pickup_time: prevSlots.pickup_time || '',
  };

  // Nếu chưa có địa chỉ, thử dùng Regex để bắt cả câu (ví dụ: "43 diên hồng")
  if (!merged.delivery_address && userText.length > 5 && !userText.includes('?')) {
    // Nếu câu chat có số nhà và chữ đường/phố/quận
    const roughAddr = userText.match(/(\d+[^,]+(?:đường|phố|quận|huyện|thành phố|phường|xã))/i);
    if (roughAddr) merged.delivery_address = roughAddr[0].trim();
  }

  let aiText = await callAI(userText, merged, chatHistory);
  
  if (aiText && aiText.includes('<<<ORDER_DATA>>>')) {
    const parts = aiText.split('<<<ORDER_DATA>>>');
    aiText = parts[0].trim();
    
    try {
      const jsonStr = parts[1].split('<<<END_ORDER_DATA>>>')[0].trim();
      const parsedData = JSON.parse(jsonStr);
      if (parsedData.is_ready) {
        if (parsedData.customer_name) merged.customer_name = parsedData.customer_name;
        if (parsedData.customer_phone) merged.customer_phone = parsedData.customer_phone;
        if (parsedData.product_type) merged.product_type = parsedData.product_type;
        if (parsedData.weight) merged.weight = parsedData.weight;
        if (parsedData.delivery_address) merged.delivery_address = parsedData.delivery_address;
        if (parsedData.send_date) merged.send_date = parsedData.send_date;
        if (parsedData.pickup_time) merged.pickup_time = parsedData.pickup_time;
      }
    } catch (e) {
      console.error("Lỗi parse JSON:", e);
    }
  }

  // Tự động bắt ngày giờ bằng Regex nếu AI không làm
  if (userText.match(/(\d{1,2})[h:]\s*(\d{1,2})?\s*(sáng|chiều|tối)?/i)) {
    const timeMatch = userText.match(/(\d{1,2})[h:]\s*(\d{1,2})?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      if (userText.toLowerCase().includes('chiều') && hour < 12) hour += 12;
      merged.pickup_time = `${hour.toString().padStart(2, '0')}:00`;
    }
  }
  
  const dateMatch = userText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dateMatch) {
    merged.send_date = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
  }

  const quote = quoteFromSlots(merged);
  
  // NẾU ĐÃ ĐỦ THÔNG TIN -> Ép hiển thị nút ĐẶT NGAY dù AI có nhả JSON hay không
  if (quote.complete && !aiText.includes('ĐẶT NGAY')) {
    aiText += "\n\nBạn có thể bấm nút bên dưới để chuyển sang trang đặt hàng nhé!";
  }

  if (aiText) {
    return {
      slots: merged,
      quote: quote.complete ? quote : null,
      text: aiText,
      fromAI: true,
    };
  }

  // Fallback nếu AI sập
  return { 
    slots: merged, 
    quote: quote.complete ? quote : null, 
    text: quote.complete ? "Mình đã ghi nhận đủ thông tin, bạn bấm ĐẶT NGAY nhé!" : "Bạn vui lòng cung cấp thêm thông tin giúp mình.", 
    fromAI: false 
  };
}