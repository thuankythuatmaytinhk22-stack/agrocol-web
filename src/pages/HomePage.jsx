import { Link } from 'react-router-dom';
import { Truck, Recycle, QrCode, Thermometer } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="bg-agro-bg min-h-screen font-sans">
      {/* Hero Section với ảnh nền hero-bg.jpg */}
      <section 
        className="relative w-full min-h-[600px] flex items-center bg-cover bg-center"
        style={{ backgroundImage: "url('/hero-bg.jpg')" }}
      >
        {/* Overlay mờ để chữ nổi bật */}
        <div className="absolute inset-0 bg-gradient-to-r from-agro-bg/95 via-agro-bg/80 to-transparent"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-20 w-full">
          <div className="max-w-xl">
            <span className="bg-green-100 text-agro-dark text-xs font-bold px-4 py-2 rounded-full inline-block mb-4 tracking-wide">
              LOGISTICS XANH - GIỮ ĐỘ TƯƠI
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold text-agro-dark mb-6 tracking-tight">
              AGROCOLD
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-md font-medium">
              Giải pháp vận chuyển nông sản giữ độ tươi trên suốt hành trình.
            </p>
            <Link to="/booking" className="inline-flex items-center gap-2 bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-4 px-8 rounded-full transition-all shadow-lg text-lg">
              <Truck className="w-6 h-6" />
              ĐẶT THÙNG LẠNH
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-agro-dark mb-8">Một hành trình tươi hơn</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Thermometer, title: 'Giữ nhiệt', desc: 'Duy trì nhiệt độ phù hợp cho nông sản' },
            { icon: Recycle, title: 'Thùng lạnh tái sử dụng', desc: 'Thu hồi và tái vận hành' },
            { icon: QrCode, title: 'QR Freshness Passport', desc: 'Theo dõi thông tin lô hàng' },
          ].map((f, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <f.icon className="w-7 h-7 text-agro-dark" />
              </div>
              <h3 className="text-lg font-bold text-agro-dark mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm font-medium">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}