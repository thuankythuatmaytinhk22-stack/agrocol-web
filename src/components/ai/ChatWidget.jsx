import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Send, X, Sparkles, Bot } from 'lucide-react';
import { answerChat } from '../../lib/chatbotEngine';

const WELCOME =
  'Chào bạn! Mình là trợ lý AI của AgroCold 🌱. Mình có thể giúp bạn:\n• Tính số thùng & chi phí vận chuyển\n• Tư vấn nhiệt độ bảo quản nông sản\n• Tra cứu đơn hàng của bạn\n\nBạn cứ hỏi tự nhiên nhé!';

const QUICK_SUGGESTIONS = [
  '500kg sầu riêng từ Đắk Lắk đi Hà Nội',
  '300kg rau từ Đà Lạt đi TP.HCM',
  'Xoài bảo quản ở nhiệt độ nào?',
  'Tra cứu đơn hàng SĐT 0905123457',
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [slots, setSlots] = useState({});
  const [quote, setQuote] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'bot', text: WELCOME, fromAI: true },
  ]);
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (text) => {
    const value = (text || input).trim();
    if (!value || busy) return;
    setInput('');

    const newUserMsg = { role: 'user', text: value };
    setMessages((m) => [...m, newUserMsg]);
    setBusy(true);

    try {
      const history = [...messages, newUserMsg]
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const result = await answerChat(value, slots, history);
      setSlots(result.slots || {});
      setQuote(result.quote?.complete ? result.quote : null);
      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text: result.text,
          quote: result.quote,
          fromAI: result.fromAI,
        },
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text: 'Xin lỗi, mình đang gặp sự cố kết nối. Bạn thử lại giúp mình nhé!',
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const bookNow = (q) => {
    if (!q?.complete) return;
    sessionStorage.setItem(
      'agrocold_booking_draft',
      JSON.stringify({
        product_type: q.product_type,
        weight: String(q.weight),
        pickup_address: q.pickup_address,
        delivery_address: q.delivery_address,
        customer_name: q.customer_name,
        customer_phone: q.customer_phone,
      })
    );
    setOpen(false);
    navigate('/booking');
  };

  return (
    <div className="fixed bottom-5 right-5 z-[60] font-sans">
      {open && (
        <div className="mb-3 w-[min(100vw-2rem,400px)] h-[560px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-agro-dark text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-agro-yellow text-agro-dark flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Tư vấn đặt thùng</p>
                <p className="text-[11px] text-white/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
                  AgroCold AI · Đang hoạt động
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-agro-bg">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'bot' && (
                  <div className="w-7 h-7 rounded-full bg-agro-dark flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-agro-yellow" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-agro-dark text-white rounded-br-md'
                      : 'bg-white text-agro-dark border border-gray-100 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.text}
                  {msg.quote?.complete && (
                    <button
                      onClick={() => bookNow(msg.quote)}
                      className="mt-3 w-full bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-2 rounded-xl text-xs transition-colors"
                    >
                      ĐẶT NGAY
                    </button>
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-agro-dark flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-agro-yellow" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-agro-dark/40 rounded-full animate-bounce"></span>
                    <span
                      className="w-2 h-2 bg-agro-dark/40 rounded-full animate-bounce"
                      style={{ animationDelay: '0.15s' }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-agro-dark/40 rounded-full animate-bounce"
                      style={{ animationDelay: '0.3s' }}
                    ></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          <div className="px-3 pt-2 pb-1 bg-white border-t border-gray-100">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={busy}
                  className="text-[10px] font-semibold bg-green-50 text-agro-dark px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 bg-white">
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
                disabled={busy}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors"
                aria-label="Gửi"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 rounded-full bg-agro-yellow hover:bg-yellow-500 text-agro-dark shadow-lg flex items-center justify-center transition-transform hover:scale-105 relative"
        aria-label="Mở chatbot"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>
    </div>
  );
}