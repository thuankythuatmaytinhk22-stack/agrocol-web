import { Link } from 'react-router-dom';
import { Truck, Recycle, QrCode, Thermometer } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="bg-agro-bg min-h-screen">
      {/* Hero Section với ảnh nền */}
      <section 
        className="relative w-full min-h-[600px] flex items-center bg-cover bg-center"
        style={{ backgroundImage: "url('/hero-bg.avif')" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-agro-bg/90 via-agro-bg/70 to-transparent"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-center w-full">
          <div>
            <span className="bg-green-100 text-agro-dark text-xs font-bold px-4 py-2 rounded-full inline-block mb-4">
              LOGISTICS XANH - GIỮ ĐỘ TƯƠI
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold text-agro-dark mb-6 tracking-tight">
              AGROCOLD
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-md">
              Giải pháp vận chuyển nông sản giữ độ tươi trên suốt hành trình.
            </p>
            <Link to="/booking" className="inline-flex items-center gap-2 bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-4 px-8 rounded-full transition-all shadow-lg">
              <Truck className="w-5 h-5" />
              ĐẶT THÙNG LẠNH
              <span>→</span>
            </Link>
          </div>
          <div className="relative flex justify-center items-center">
            <img 
              src="/fresh-box.avif" 
              alt="Thùng lạnh AgroCold" 
              className="w-full h-auto max-w-md drop-shadow-2xl rounded-3xl"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-agro-dark mb-8">Một hành trình tươi hơn</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Thermometer, title: 'Giữ nhiệt', desc: 'Duy trì nhiệt độ phù hợp cho nông sản' },
            { icon: Recycle, title: 'Thùng lạnh tái sử dụng', desc: 'Thu hồi và tái vận hành' },
            { icon: QrCode, title: 'QR Freshness Passport', desc: 'Theo dõi thông tin lô hàng' },
          ].map((f, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-agro-dark" />
              </div>
              <h3 className="text-lg font-bold text-agro-dark mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}