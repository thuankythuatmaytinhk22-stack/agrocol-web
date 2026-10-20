import { useState, useRef, useEffect } from 'react';
import * as tmImage from '@teachablemachine/image';
import { 
  Camera, 
  BrainCircuit, 
  Loader2, 
  ArrowLeft, 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw, 
  Cpu, 
  Upload, 
  CheckCircle2,
  AlertTriangle // <-- ĐÃ THÊM ICON NÀY VÀO ĐÂY
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateAdvice } from '../lib/visionAI';

const MODEL_QUALITY_URL = "/tm-my-image-model/";
const MODEL_TYPE_URL = "/tm-my-image-model%20(1)/"; 

export default function FruitScannerPage() {
  const navigate = useNavigate();
  
  const [modelQuality, setModelQuality] = useState(null);
  const [modelType, setModelType] = useState(null);
  
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);
  
  const hiddenCanvasRef = useRef(null); 
  const displayImgRef = useRef(null);   
  const webcamInstance = useRef(null);
  const fileInputRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const [loadedQuality, loadedType] = await Promise.all([
          tmImage.load(MODEL_QUALITY_URL + "model.json", MODEL_QUALITY_URL + "metadata.json"),
          tmImage.load(MODEL_TYPE_URL + "model.json", MODEL_TYPE_URL + "metadata.json")
        ]);
        setModelQuality(loadedQuality);
        setModelType(loadedType);
        setIsLoadingModels(false);
      } catch (error) {
        console.error("Lỗi load model:", error);
        alert("Không thể tải mô hình AI. Vui lòng kiểm tra lại kết nối mạng.");
      }
    };
    loadModels();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (webcamInstance.current) webcamInstance.current.stop();
    };
  }, []);

  const startCamera = async () => {
    if (!modelQuality || !modelType) return;
    setIsCameraOn(true);
    setResult(null);

    try {
      const flip = true; 
      webcamInstance.current = new tmImage.Webcam(300, 300, flip);
      await webcamInstance.current.setup();
      await webcamInstance.current.play();
      
      if (hiddenCanvasRef.current) {
        hiddenCanvasRef.current.innerHTML = ''; 
        hiddenCanvasRef.current.appendChild(webcamInstance.current.canvas);
      }
      updateDisplayLoop();
    } catch (err) {
      console.error("Lỗi bật camera:", err);
      alert("Không thể truy cập Camera. Vui lòng dùng nút 'Tải ảnh lên'.");
      setIsCameraOn(false);
    }
  };

  const updateDisplayLoop = () => {
    if (webcamInstance.current && displayImgRef.current) {
      webcamInstance.current.update();
      const dataUrl = webcamInstance.current.canvas.toDataURL('image/jpeg');
      displayImgRef.current.src = dataUrl;
      animationFrameRef.current = requestAnimationFrame(updateDisplayLoop);
    }
  };

  const stopCameraOnly = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (webcamInstance.current) {
      webcamInstance.current.stop();
      webcamInstance.current = null;
    }
    setIsCameraOn(false);
  };

  const resetScanner = () => {
    stopCameraOnly();
    setResult(null);
  };

  const processImage = async (imageElement) => {
    setIsScanning(true);
    try {
      const predQuality = await modelQuality.predict(imageElement);
      let topQuality = predQuality[0];
      for (let i = 1; i < predQuality.length; i++) {
        if (predQuality[i].probability > topQuality.probability) topQuality = predQuality[i];
      }

      const predType = await modelType.predict(imageElement);
      let topType = predType[0];
      for (let i = 1; i < predType.length; i++) {
        if (predType[i].probability > topType.probability) topType = predType[i];
      }

      const advice = generateAdvice(
        topType.className, topType.probability,
        topQuality.className, topQuality.probability
      );
      
      const imgData = imageElement.tagName === 'CANVAS' 
        ? imageElement.toDataURL() 
        : imageElement.src;

      setResult({
        ...advice,
        rawQuality: topQuality,
        rawType: topType,
        capturedImage: imgData
      });
      
    } catch (error) {
      console.error("Lỗi phân tích:", error);
      alert("Lỗi phân tích hình ảnh.");
    } finally {
      setIsScanning(false);
      stopCameraOnly(); 
    }
  };

  const handleAnalyze = async () => {
    if (!webcamInstance.current || !modelQuality || !modelType) return;
    const currentCanvas = webcamInstance.current.canvas;
    setIsScanning(true); 
    setTimeout(() => {
      processImage(currentCanvas);
    }, 100);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => processImage(img);
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
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
            <div className="w-[300px] h-[300px] bg-gray-900 rounded-2xl overflow-hidden relative shadow-inner">
              
              <div ref={hiddenCanvasRef} style={{ display: 'none' }}></div>
              
              {result ? (
                <img src={result.capturedImage} alt="Captured" className="absolute inset-0 z-30 w-full h-full object-cover" />
              ) : (
                <img 
                  ref={displayImgRef} 
                  alt="Camera Feed" 
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isCameraOn ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                />
              )}

              {!isCameraOn && !result && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center text-gray-400">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Camera đang tắt</p>
                </div>
              )}

              {isScanning && (
                <div className="absolute inset-0 z-40 bg-agro-dark/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-10 h-10 animate-spin text-agro-yellow mb-3" />
                  <p className="font-bold">AI đang phân tích...</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            {!isCameraOn && !result && (
              <>
                <button onClick={startCamera} className="bg-agro-dark hover:bg-agro-dark/90 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2">
                  <Camera className="w-5 h-5" /> Bật Camera
                </button>
                <button onClick={() => fileInputRef.current.click()} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl flex items-center gap-2 border border-gray-300">
                  <Upload className="w-5 h-5" /> Tải ảnh lên
                </button>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              </>
            )}

            {isCameraOn && (
              <>
                <button onClick={stopCameraOnly} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-xl">
                  Tắt Camera
                </button>
                <button onClick={handleAnalyze} disabled={isScanning} className="bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 px-8 rounded-xl flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5" /> Chụp & Phân tích
                </button>
              </>
            )}

            {result && (
              <button onClick={resetScanner} className="bg-agro-dark hover:bg-agro-dark/90 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2">
                <RefreshCw className="w-5 h-5" /> Quét trái khác
              </button>
            )}
          </div>
        </div>

        {/* KẾT QUẢ PHÂN TÍCH */}
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

              <div className={`p-5 rounded-xl border-l-4 shadow-sm ${
                result.alertLevel === 'danger' ? 'bg-red-50 border-red-500' : 
                result.alertLevel === 'warning' ? 'bg-amber-50 border-amber-500' : 
                'bg-green-50 border-green-500'
              }`}>
                <h4 className={`font-bold text-base mb-2 flex items-center gap-2 ${
                  result.alertLevel === 'danger' ? 'text-red-800' : 
                  result.alertLevel === 'warning' ? 'text-amber-800' : 'text-green-800'
                }`}>
                  <BrainCircuit className="w-5 h-5" /> Kết luận từ AI:
                </h4>
                <p className={`text-sm font-medium ${
                  result.alertLevel === 'danger' ? 'text-red-700' : 
                  result.alertLevel === 'warning' ? 'text-amber-700' : 'text-green-700'
                }`}>{result.recommendation}</p>
              </div>

              <div>
                <p className="font-bold text-agro-dark text-sm mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Rủi ro cần cân nhắc:
                </p>
                <ul className="space-y-2 bg-gray-50 p-4 rounded-xl">
                  {result.risks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0"></div>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t border-gray-100">
                 <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Chi tiết phân tích của 2 Model AI:</p>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                        <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Model Nhận diện Quả</p>
                        <p className="font-bold text-sm text-agro-dark">{result.rawType.className}</p>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
                           <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${result.rawType.probability * 100}%` }}></div>
                        </div>
                        <p className="text-xs text-right text-gray-500 mt-1">{(result.rawType.probability * 100).toFixed(1)}%</p>
                    </div>
                    <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                        <p className="text-[10px] font-bold text-green-500 uppercase mb-1">Model Độ Tươi</p>
                        <p className="font-bold text-sm text-agro-dark">{result.rawQuality.className}</p>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
                           <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${result.rawQuality.probability * 100}%` }}></div>
                        </div>
                        <p className="text-xs text-right text-gray-500 mt-1">{(result.rawQuality.probability * 100).toFixed(1)}%</p>
                    </div>
                 </div>
              </div>

              {result.isGood && result.alertLevel !== 'danger' && (
                <button 
                  onClick={() => navigate('/booking')}
                  className="w-full bg-agro-yellow hover:bg-yellow-500 text-agro-dark font-bold py-3 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" /> Đủ điều kiện! Tiến hành đặt thùng
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}