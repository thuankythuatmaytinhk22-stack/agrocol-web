import { useState, useRef, useEffect } from 'react';
import * as tmImage from '@teachablemachine/image';
import { Camera, BrainCircuit, Loader2, ArrowLeft, ShieldAlert, ShieldCheck, RefreshCw, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateAdvice } from '../lib/visionAI';

// Đường dẫn tới 2 thư mục chứa model trong public
const MODEL_QUALITY_URL = "/model_quality/";
const MODEL_TYPE_URL = "/model_type/";

export default function FruitScannerPage() {
  const navigate = useNavigate();
  
  // State cho 2 model
  const [modelQuality, setModelQuality] = useState(null);
  const [modelType, setModelType] = useState(null);
  
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);
  
  const webcamRef = useRef(null);
  const webcamInstance = useRef(null);

  // Load CẢ 2 MÔ HÌNH AI KHI VÀO TRANG
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Tải song song 2 model để nhanh hơn
        const [loadedQuality, loadedType] = await Promise.all([
          tmImage.load(MODEL_QUALITY_URL + "model.json", MODEL_QUALITY_URL + "metadata.json"),
          tmImage.load(MODEL_TYPE_URL + "model.json", MODEL_TYPE_URL + "metadata.json")
        ]);
        
        setModelQuality(loadedQuality);
        setModelType(loadedType);
        setIsLoadingModels(false);
      } catch (error) {
        console.error("Lỗi load model:", error);
        alert("Không thể tải mô hình AI. Hãy kiểm tra lại 2 thư mục model_quality và model_type trong public.");
      }
    };
    loadModels();
  }, []);

  const startCamera = async () => {
    if (!modelQuality || !modelType) return;
    setIsCameraOn(true);
    setResult(null);

    const flip = true; 
    webcamInstance.current = new tmImage.Webcam(300, 300, flip);
    await webcamInstance.current.setup();
    await webcamInstance.current.play();
    
    if (webcamRef.current) {
      webcamRef.current.innerHTML = '';
      webcamRef.current.appendChild(webcamInstance.current.canvas);
    }
  };

  const stopCamera = () => {
    if (webcamInstance.current) {
      webcamInstance.current.stop();
      webcamInstance.current = null;
    }
    setIsCameraOn(false);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!webcamInstance.current || !modelQuality || !modelType) return;
    setIsScanning(true);

    try {
      webcamInstance.current.update();
      const canvas = webcamInstance.current.canvas;

      // 1. Cho Model 1 đoán Tươi/Hỏng
      const predQuality = await modelQuality.predict(canvas);
      let topQuality = predQuality[0];
      for (let i = 1; i < predQuality.length; i++) {
        if (predQuality[i].probability > topQuality.probability) topQuality = predQuality[i];
      }

      // 2. Cho Model 2 đoán Loại quả
      const predType = await modelType.predict(canvas);
      let topType = predType[0];
      for (let i = 1; i < predType.length; i++) {
        if (predType[i].probability > topType.probability) topType = predType[i];
      }

      // 3. Tổng hợp kết quả đưa ra lời khuyên
      const advice = generateAdvice(
        topType.className, topType.probability,
        topQuality.className, topQuality.probability
      );
      
      setResult({
        ...advice,
        rawQuality: topQuality,
        rawType: topType,
        capturedImage: canvas.toDataURL()
      });
      
      stopCamera();
    } catch (error) {
      console.error(error);
      alert("Lỗi phân tích ảnh.");
    } finally {
      setIsScanning(false);
    }
  };

  if (isLoadingModels) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-agro-bg">
        <Cpu className="w-12 h-12 text-agro-dark animate-pulse mb-4" />
        <p className="font-bold text-agro-dark mb-2">Đang nạp 2 bộ não AI...</p>
        <p className="text-sm text-gray-500">Đang tải mô hình nhận diện loại quả và độ tươi</p>
      </div>
    );
  }

  return (
    <div className="bg-agro-bg min-h-screen py-12 font-sans">
      <div className="max-w-3xl mx-auto px-4">
        
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-agro-dark font-semibold mb-6 hover:underline">
          <ArrowLeft className="w-5 h-5" /> Quay lại
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-agro-dark text-agro-yellow rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-agro-dark mb-2">AI Giám định Nông sản</h1>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            Đưa trái cây vào trước Camera. AI sẽ nhận diện loại quả và đánh giá độ tươi/hỏng.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          
          <div className="mb-6 flex flex-col items-center">
            <div className="w-[300px] h-[300px] bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center relative shadow-inner">
              {!isCameraOn && !result && (
                <div className="text-center text-gray-400">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Camera đang tắt</p>
                </div>
              )}
              
              {isCameraOn && (
                <div ref={webcamRef} className="w-full h-full object-cover"></div>
              )}

              {result && (
                <img src={result.capturedImage} alt="Captured" className="w-full h-full object-cover" />
              )}

              {isScanning && (
                <div className="absolute inset-0 bg-agro-dark/40 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10">
                  <Loader2 className="w-10 h-10 animate-spin text-agro-yellow mb-3" />
                  <p className="font-bold">2 AI đang cùng phân tích...</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            {!isCameraOn && !result && (
              <button onClick={startCamera} className="bg-agro-dark hover:bg-agro-dark/90 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2">
                <Camera className="w-5 h-5" /> Bật Camera
              </button>
            )}

            {isCameraOn && (
              <>
                <button onClick={stopCamera} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-xl">
                  Tắt
                </button>
                <button onClick={handleAnalyze} disabled={isScanning} className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 px-8 rounded-xl flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5" /> Chụp & Phân tích
                </button>
              </>
            )}

            {result && (
              <button onClick={startCamera} className="bg-agro-dark hover:bg-agro-dark/90 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2">
                <RefreshCw className="w-5 h-5" /> Quét trái khác
              </button>
            )}
          </div>
        </div>

        {result && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`p-4 text-white flex justify-between items-center ${
              result.alertLevel === 'danger' ? 'bg-red-600' : 
              result.alertLevel === 'warning' ? 'bg-amber-500' : 'bg-green-600'
            }`}>
              <h3 className="font-bold flex items-center gap-2">
                {result.alertLevel === 'danger' ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                Kết quả phân tích AI
              </h3>
              <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-bold">
                Độ tin cậy: {result.confidence}%
              </span>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  result.alertLevel === 'danger' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                }`}>
                  {result.alertLevel === 'danger' ? <ShieldAlert className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500">AI nhận diện được:</p>
                  <p className={`text-2xl font-extrabold ${result.alertLevel === 'danger' ? 'text-red-600' : 'text-green-600'}`}>
                    {result.fruitName} - {result.isGood ? 'TƯƠI' : 'HỎNG'}
                  </p>
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${
                result.alertLevel === 'danger' ? 'bg-red-50 border-red-100' : 
                result.alertLevel === 'warning' ? 'bg-amber-50 border-amber-100' : 
                'bg-blue-50 border-blue-100'
              }`}>
                <p className={`font-bold text-sm mb-1 ${
                  result.alertLevel === 'danger' ? 'text-red-800' : 
                  result.alertLevel === 'warning' ? 'text-amber-800' : 'text-blue-800'
                }`}>💡 Khuyến cáo từ AI:</p>
                <p className={`text-sm ${
                  result.alertLevel === 'danger' ? 'text-red-700' : 
                  result.alertLevel === 'warning' ? 'text-amber-700' : 'text-blue-700'
                }`}>{result.recommendation}</p>
              </div>

              <div>
                <p className="font-bold text-agro-dark text-sm mb-2">⚠️ Rủi ro cần cân nhắc:</p>
                <ul className="space-y-2">
                  {result.risks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></div>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Chi tiết 2 Model */}
              <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                 <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Model Loại Quả</p>
                    <p className="font-bold text-sm text-agro-dark">{result.rawType.className}</p>
                    <p className="text-xs text-gray-500">Độ chính xác: {(result.rawType.probability * 100).toFixed(1)}%</p>
                 </div>
                 <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Model Độ Tươi</p>
                    <p className="font-bold text-sm text-agro-dark">{result.rawQuality.className}</p>
                    <p className="text-xs text-gray-500">Độ chính xác: {(result.rawQuality.probability * 100).toFixed(1)}%</p>
                 </div>
              </div>

              {result.isGood && result.alertLevel !== 'danger' && (
                <button 
                  onClick={() => navigate('/booking')}
                  className="w-full bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 rounded-xl transition-colors mt-2"
                >
                  Đủ điều kiện! Tiến hành đặt thùng
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}