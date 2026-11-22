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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${hubLat}&longitude=${hubLng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=Asia%2FBangkok&start_date=${date}&end_date=${date}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
      return res.status(404).json({ error: 'Không có dữ liệu thời tiết cho ngày này' });
    }

    const maxTemp = data.daily.temperature_2m_max[0];
    const minTemp = data.daily.temperature_2m_min[0];
    const rainProb = data.daily.precipitation_probability_max[0];
    
    let advice = '';
    let status = 'good';

    // Đưa ra khuyến cáo dựa trên thời tiết tại Buôn Ma Thuột
    if (rainProb > 60) {
      advice = 'Tại Buôn Ma Thuột, khả năng mưa cao. Nên cho xe xuất phát vào sáng sớm hoặc khi tạnh mưa để tránh nước vào thùng.';
      status = 'warning';
    } else if (maxTemp > 35) {
      advice = 'Tại Buôn Ma Thuột, trời nắng gắt. Nên tránh xuất phát vào giữa trưa (11h-15h). Tốt nhất là cho xe đi vào sáng sớm hoặc chiều muộn.';
      status = 'danger';
    } else if (maxTemp > 32) {
      advice = 'Tại Buôn Ma Thuột, trời khá nóng. Nên ưu tiên cho xe xuất phát vào buổi sáng sớm.';
      status = 'warning';
    } else {
      advice = 'Thời tiết tại Buôn Ma Thuột khá thuận lợi. Bạn có thể cho xe xuất phát vào bất kỳ thời gian nào trong ngày.';
      status = 'good';
    }

    return res.status(200).json({
      maxTemp,
      minTemp,
      rainProb,
      advice,
      status
    });

  } catch (error) {
    console.error('Lỗi lấy thời tiết:', error);
    return res.status(500).json({ error: 'Lỗi kết nối API thời tiết' });
  }
}