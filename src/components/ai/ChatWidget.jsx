import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Send, X, Sparkles } from 'lucide-react';
import { answerChat } from '../../lib/chatbotEngine';

const WELCOME =
  'Chào bạn, mình là trợ lý đặt thùng AgroCold. Hãy mô tả nhu cầu, ví dụ: "Tôi muốn gửi 500kg sầu riêng từ Đắk Lắk đi Hà Nội, cần mấy thùng?"';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [slots, setSlots] = useState({});
  const [quote, setQuote] = useState(null);
  const [messages, setMessages] = useState([{ role: 'bot', text: WELCOME }]);
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text) => {
    const value = (text || input).trim();
    if (!value || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: value }]);
    setBusy(true);
    try {
      const result = await answerChat(value, slots);
      setSlots(result.slots);
      setQuote(result.quote?.complete ? result.quote : null);
      setMessages((m) => [...m, { role: 'bot', text: result.text, quote: result.quote }]);
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: 'Có lỗi khi tư vấn. Bạn thử nhập lại giúp mình nhé.' }]);
    } finally {
      setBusy(false);
    }
  };

  const bookNow = (q) => {
    if (!q?.complete) return;
    sessionStorage.setItem('agrocold_booking_draft', JSON.stringify({
      product_type: q.product_type,
      weight: String(q.weight),
      pickup_address: q.pickup_address,
      delivery_address: q.delivery_address,
      customer_name: q.customer_name,
      customer_phone: q.customer_phone,
    }));
    setOpen(false);
    navigate('/booking');
  };

  return (
    <div className="fixed bottom-5 right-5 z-[60] font-sans">
      {open && (
        <div className="mb-3 w-[min(100vw-2rem,380px)] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="bg-agro-dark text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-agro-yellow text-agro-dark flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Tư vấn đặt thùng</p>
                <p className="text-[11px] text-white/70">AgroCold AI · Nhiệt độ & chi phí</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-agro-bg">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-agro-dark text-white rounded-br-md'
                      : 'bg-white text-agro-dark border border-gray-100 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.text}
                  {msg.quote?.complete && (
                    <button
                      onClick={() => bookNow(msg.quote)}
                      className="mt-3 w-full bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-2 rounded-xl text-xs"
                    >
                      ĐẶT NGAY
                    </button>
                  )}
                </div>
              </div>
            ))}
            {busy && <p className="text-xs text-gray-400 font-medium">Đang tính toán thùng & nhiệt độ...</p>}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex flex-wrap gap-2 mb-2">
              {['500kg sầu riêng từ Đắk Lắk đi Hà Nội', '300kg rau từ Đà Lạt đi TP.HCM'].map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[10px] font-semibold bg-green-50 text-agro-dark px-2 py-1 rounded-lg hover:bg-green-100"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập nhu cầu vận chuyển..."
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
              />
              <button
                type="submit"
                disabled={busy}
                className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-agro-yellow hover:bg-yellow-500 text-agro-dark shadow-lg flex items-center justify-center"
        aria-label="Mở chatbot"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
      {quote?.complete && !open && (
        <span className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
      )}
    </div>
  );
}
