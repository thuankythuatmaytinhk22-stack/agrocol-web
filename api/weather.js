// api/weather.js — Vercel Serverless Function
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'Thiếu thông tin date' });
  }

  // TỌA ĐỘ CỐ ĐỊNH CỦA KHO HUB (BUÔN MA THUỘT)
  const hubLat = 12.6662;
  const hubLng = 108.0382;

  try {
    // Gọi API lấy thời tiết theo GIỜ để tính toán chính xác hơn
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${hubLat}&longitude=${hubLng}&hourly=temperature_2m,precipitation_probability&timezone=Asia%2FBangkok&start_date=${date}&end_date=${date}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!data.hourly || !data.hourly.time || data.hourly.time.length === 0) {
      return res.status(404).json({ error: 'Không có dữ liệu thời tiết cho ngày này' });
    }

    const times = data.hourly.time;
    const temps = data.hourly.temperature_2m;
    const rains = data.hourly.precipitation_probability;

    // Phân tích 3 khung giờ chính trong ngày
    let morningScore = 0, noonScore = 0, eveningScore = 0; // Điểm càng thấp càng tốt
    let morningRain = 0, noonRain = 0, eveningRain = 0;

    for (let i = 0; i < times.length; i++) {
      const hour = new Date(times[i]).getHours();
      
      // Khung 1: Sáng sớm (5h - 9h)
      if (hour >= 5 && hour <= 9) {
        morningScore += temps[i];
        morningRain += rains[i];
      }
      // Khung 2: Giữa trưa (10h - 15h) - Thường nắng nóng nhất
      if (hour >= 10 && hour <= 15) {
        noonScore += temps[i];
        noonRain += rains[i];
      }
      // Khung 3: Chiều muộn (16h - 19h)
      if (hour >= 16 && hour <= 19) {
        eveningScore += temps[i];
        eveningRain += rains[i];
      }
    }

    // Đưa ra khuyến cáo dựa trên điểm số
    let advice = '';
    let status = 'good';
    let suggestedTime = '';

    if (morningRain > 150) { // Khả năng mưa cao
      advice = 'Buổi sáng có thể có mưa. Hãy cân nhắc dời giờ giao hàng.';
      status = 'warning';
    } else if (noonScore > 100) { // Tổng nhiệt độ giữa trưa quá cao (trung bình > 33 độ)
      advice = 'Giữa trưa trời rất nắng nóng, không tốt cho nông sản. Bạn nên giao vào sáng sớm hoặc chiều muộn.';
      status = 'danger';
    } else {
      advice = 'Thời tiết khá thuận lợi. Để đảm bảo độ tươi ngon, bạn nên giao vào sáng sớm hoặc chiều muộn khi trời mát mẻ.';
      status = 'good';
    }

    // Đề xuất giờ cụ thể
    if (morningRain < 30) {
      suggestedTime = '06:00 - 09:00';
    } else if (eveningRain < 30) {
      suggestedTime = '16:00 - 19:00';
    } else {
      suggestedTime = 'Bất kỳ lúc nào (hạn chế giữa trưa)';
    }

    return res.status(200).json({
      advice,
      status,
      suggestedTime
    });

  } catch (error) {
    console.error('Lỗi lấy thời tiết:', error);
    return res.status(500).json({ error: 'Lỗi kết nối API thời tiết' });
  }
}