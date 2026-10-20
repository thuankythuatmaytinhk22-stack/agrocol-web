import { calcBoxes, calcCost, formatVnd, matchProduct } from './coldChain';
import { supabase } from './supabaseClient';

const KG_RE = /(\d+(?:[.,]\d+)?)\s*(kg|kí|ki|ký|kilogram)?/i;
const TON_RE = /(\d+(?:[.,]\d+)?)\s*(tấn|tan)/i;
const FROM_TO_RE = /từ\s+(.+?)\s+(?:đi|đến|tới|ra|vào)\s+(.+?)(?:[.,!?]|$)/i;
const CITY_RE = /(đắk lắk|dak lak|đà lạt|da lat|lâm đồng|hà nội|ha noi|tp\.?hcm|hồ chí minh|sài gòn|bình điền|đà nẵng|cần thơ|nghệ an|huế|hải phòng|quảng ninh|buôn ma thuột)/i;
const PHONE_RE = /(0\d{9,10})/;

// QUY CÁCH MỚI: 350kg/thùng, giá 400.000đ/thùng
const PRICE_PER_BOX = 400000;
const WEIGHT_PER_BOX = 350;

function parseWeight(text) {
  const ton = text.match(TON_RE);
  if (ton) return parseFloat(ton[1].replace(',', '.')) * 1000;
  const kg = text.match(KG_RE);
  if (kg) return parseFloat(kg[1].replace(',', '.'));
  return null;
}

function parseRoute(text) {
  const m = text.match(FROM_TO_RE);
  if (m) return { pickup: m[1].trim(), delivery: m[2].trim().replace(/\s+cần.*$/i, '') };
  const loose = text.match(new RegExp(`${CITY_RE.source}\\s*(?:đi|đến|tới)\\s*${CITY_RE.source}`, 'i'));
  if (loose) return { pickup: loose[1], delivery: loose[2] };
  return { pickup: '', delivery: '' };
}

function localExtract(text) {
  const product = matchProduct(text);
  const weight = parseWeight(text);
  const { pickup, delivery } = parseRoute(text);
  const phoneMatch = text.match(PHONE_RE);
  return {
    product_type: product.key === 'default' && !/nông sản|hàng/i.test(text) ? '' : product.name,
    weight,
    pickup_address: pickup,
    delivery_address: delivery,
    customer_phone: phoneMatch ? phoneMatch[1] : '',
    customer_name: '',
  };
}

/**
 * Gọi API Route nội bộ /api/chat (Vercel Serverless Function)
 * -> Server gọi Groq AI, key không bị lộ ra frontend
 */
async function callAI(userText, prevSlots, chatHistory = []) {
  // Tra cứu đơn hàng nếu user hỏi về đơn
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

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('API Route error:', res.status, errData);
      return null;
    }

    const data = await res.json();
    return data.text || null;
  } catch (e) {
    console.error('Fetch error:', e);
    return null;
  }
}

export function quoteFromSlots(slots) {
  const product = matchProduct(slots.product_type || '');
  const weight = Number(slots.weight);
  const boxes = calcBoxes(weight);
  const cost = calcCost(boxes);
  const complete = Boolean(product && weight > 0);
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
  };
}

export function replyFromQuote(quote, missingHint) {
  if (!quote.complete) return missingHint || 'Bạn cho mình biết loại nông sản, khối lượng (kg) và tuyến nhé.';
  const route = quote.pickup_address && quote.delivery_address
    ? ` Tuyến ${quote.pickup_address} → ${quote.delivery_address}.`
    : '';
  return `Với ${quote.weight}kg ${quote.product.name.toLowerCase()}, bạn cần ${quote.boxes} thùng (350kg/thùng). Nhiệt độ khuyến nghị ${quote.product.minTemp}–${quote.product.maxTemp}°C.${route} Chi phí: ${formatVnd(quote.cost)}. Bạn muốn đặt ngay không?`;
}

export async function answerChat(userText, prevSlots = {}, chatHistory = []) {
  // 1. Trích xuất slots bằng local
  const local = localExtract(userText);
  const merged = {
    product_type: local.product_type || prevSlots.product_type || '',
    weight: local.weight || prevSlots.weight || '',
    pickup_address: local.pickup_address || prevSlots.pickup_address || '',
    delivery_address: local.delivery_address || prevSlots.delivery_address || '',
    customer_name: local.customer_name || prevSlots.customer_name || '',
    customer_phone: local.customer_phone || prevSlots.customer_phone || '',
  };

  // 2. Gọi AI qua API Route (ưu tiên)
  const aiText = await callAI(userText, merged, chatHistory);
  if (aiText) {
    const quote = quoteFromSlots(merged);
    return {
      slots: merged,
      quote: quote.complete ? quote : null,
      text: aiText,
      fromAI: true,
    };
  }

  // 3. Fallback local (chỉ khi AI fail)
  console.warn('AI không phản hồi, dùng fallback local');
  const lower = userText.toLowerCase();

  if (/xin chào|hello|hi\b|chào|bạn là ai|giới thiệu/i.test(lower) && !merged.weight) {
    return {
      slots: merged,
      quote: null,
      text: 'Chào bạn! Mình là trợ lý AI của AgroCold. Mình có thể giúp bạn tính số thùng, chi phí và nhiệt độ bảo quản cho nông sản. Bạn muốn gửi loại nào, bao nhiêu kg?',
      fromAI: false,
    };
  }

  const quote = quoteFromSlots(merged);
  let missing = '';
  if (!merged.product_type) missing = 'Bạn đang gửi loại nông sản nào ạ? (VD: sầu riêng, xoài, rau lá...)';
  else if (!merged.weight) missing = `Mình đã ghi nhận ${merged.product_type}. Khối lượng khoảng bao nhiêu kg?`;
  else if (!merged.pickup_address || !merged.delivery_address) missing = `Đã có ${merged.weight}kg ${merged.product_type}. Bạn gửi từ đâu đến đâu?`;

  return { slots: merged, quote, text: replyFromQuote(quote, missing), fromAI: false };
}