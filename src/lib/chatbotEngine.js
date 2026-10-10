import { calcBoxes, calcCost, formatVnd, matchProduct } from './coldChain';

const KG_RE = /(\d+(?:[.,]\d+)?)\s*(kg|kí|ki|ký|kilogram)?/i;
const TON_RE = /(\d+(?:[.,]\d+)?)\s*(tấn|tan)/i;
const FROM_TO_RE = /từ\s+(.+?)\s+(?:đi|đến|tới|ra|vào)\s+(.+?)(?:[.,!?]|$)/i;
const CITY_RE =
  /(đắk lắk|dak lak|đà lạt|da lat|lâm đồng|hà nội|ha noi|tp\.?hcm|hồ chí minh|sài gòn|bình điền|đà nẵng|cần thơ|nghệ an)/i;

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
  const loose = text.match(
    new RegExp(`${CITY_RE.source}\\s*(?:đi|đến|tới)\\s*${CITY_RE.source}`, 'i')
  );
  if (loose) return { pickup: loose[1], delivery: loose[2] };
  return { pickup: '', delivery: '' };
}

function localExtract(text) {
  const product = matchProduct(text);
  const weight = parseWeight(text);
  const { pickup, delivery } = parseRoute(text);
  return {
    product_type: product.key === 'default' && !/nông sản|hàng/i.test(text) ? '' : product.name,
    weight,
    pickup_address: pickup,
    delivery_address: delivery,
  };
}

async function geminiExtract(text) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Trích xuất JSON thuần (không markdown) từ yêu cầu đặt thùng lạnh nông sản.
Keys: product_type, weight (số kg), pickup_address, delivery_address, customer_name, customer_phone.
Nếu thiếu trường thì để "".
Câu: ${text}`,
                },
              ],
            },
          ],
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const json = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(json);
  } catch {
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
  if (!quote.complete) {
    return (
      missingHint ||
      'Bạn cho mình biết loại nông sản, khối lượng (kg) và tuyến (ví dụ: từ Đắk Lắk đi Hà Nội) nhé.'
    );
  }
  const route =
    quote.pickup_address && quote.delivery_address
      ? ` Tuyến ${quote.pickup_address} → ${quote.delivery_address}.`
      : '';
  return `Với ${quote.weight}kg ${quote.product.name.toLowerCase()}, bạn cần ${quote.boxes} thùng (định mức 250kg/thùng). Nhiệt độ khuyến nghị là ${quote.product.minTemp}–${quote.product.maxTemp}°C.${route} Chi phí dự kiến: ${formatVnd(quote.cost)}. Bạn có muốn đặt ngay không?`;
}

export async function answerChat(userText, prevSlots = {}) {
  const local = localExtract(userText);
  const ai = await geminiExtract(userText);
  const merged = {
    product_type: ai?.product_type || local.product_type || prevSlots.product_type || '',
    weight: ai?.weight || local.weight || prevSlots.weight || '',
    pickup_address: ai?.pickup_address || local.pickup_address || prevSlots.pickup_address || '',
    delivery_address: ai?.delivery_address || local.delivery_address || prevSlots.delivery_address || '',
    customer_name: ai?.customer_name || prevSlots.customer_name || '',
    customer_phone: ai?.customer_phone || prevSlots.customer_phone || '',
  };

  const lower = userText.toLowerCase();
  if (/xin chào|hello|hi\b|chào/.test(lower) && !merged.weight) {
    return {
      slots: merged,
      quote: null,
      text: 'Mình là trợ lý AgroCold. Bạn muốn gửi nông sản nào, bao nhiêu kg, từ đâu đến đâu?',
    };
  }

  const quote = quoteFromSlots(merged);
  let missing = '';
  if (!merged.product_type) missing = 'Bạn đang gửi loại nông sản nào ạ? (ví dụ sầu riêng, xoài, rau lá)';
  else if (!merged.weight) missing = `Mình đã nhận ${merged.product_type}. Khối lượng khoảng bao nhiêu kg?`;
  return { slots: merged, quote, text: replyFromQuote(quote, missing) };
}
