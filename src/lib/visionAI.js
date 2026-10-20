export const generateAdvice = (fruitClass, fruitProb, qualityClass, qualityProb) => {
  // fruitClass: VD "Sầu riêng", "Bơ"...
  // qualityClass: VD "Tươi", "Hỏng"
  
  const fruitName = fruitClass;
  const isGood = qualityClass.toLowerCase().includes('tươi') || qualityClass.toLowerCase().includes('good');
  const confidence = Math.round(Math.min(fruitProb, qualityProb) * 100);

  let recommendation = '';
  let risks = [];
  let alertLevel = 'safe';

  if (isGood && confidence > 70) {
    recommendation = `Nông sản (${fruitName}) rất tươi ngon. Đủ điều kiện xuất kho ngay.`;
    risks = ['Không có rủi ro đáng kể.', 'Cần duy trì nhiệt độ thùng lạnh trong suốt quá trình vận chuyển.'];
    alertLevel = 'safe';
  } else if (isGood && confidence <= 70) {
    recommendation = `Nông sản (${fruitName}) có vẻ tươi nhưng AI chưa chắc chắn 100% (Độ tin cậy ${confidence}%). Hãy kiểm tra lại bằng mắt thường.`;
    risks = ['Có thể có vài quả bị dập nhẹ ở bên dưới.', 'Nên ưu tiên giao sớm.'];
    alertLevel = 'warning';
  } else {
    recommendation = `CẢNH BÁO: Phát hiện nông sản (${fruitName}) hư hỏng hoặc không đạt chuẩn. KHÔNG NÊN GỬI ĐI.`;
    risks = ['Nguy cơ lây lan vi khuẩn sang các thùng khác.', 'Khách hàng sẽ phàn nàn và đánh giá 1 sao.', 'Đề xuất: Loại bỏ quả hỏng hoặc chuyển sang chế biến.'];
    alertLevel = 'danger';
  }

  return { 
    fruitName, 
    isGood, 
    recommendation, 
    risks, 
    alertLevel, 
    confidence 
  };
};