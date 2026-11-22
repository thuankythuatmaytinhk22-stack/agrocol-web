// api/weather.js — Vercel Serverless Function
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { lat, lng, date } = req.query;

  if (!lat || !lng || !date) {
    return res.status(400).json({ error: 'Thiếu thông tin lat, lng hoặc date' });
  }

  try {
    // Gọi Open-Meteo API (Miễn phí, không cần key)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=Asia%2FBangkok&start_date=${date}&end_date=${date}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
      return res.status(404).json({ error: 'Không có dữ liệu thời tiết cho ngày này' });
    }

    const maxTemp = data.daily.temperature_2m_max[0];
    const minTemp = data.daily.temperature_2m_min[0];
    const rainProb = data.daily.precipitation_probability_max[0];
    const weatherCode = data.daily.weathercode[0];

    // Phân tích để đưa ra khuyến cáo
    let advice = '';
    let status = 'good'; // good, warning, danger

    if (rainProb > 60) {
      advice = 'Khả năng mưa cao. Nên giao hàng vào sáng sớm hoặc khi tạnh mưa để tránh nước vào thùng.';
      status = 'warning';
    } else if (maxTemp > 35) {
      advice = 'Trời nắng gắt. Nên tránh giao hàng vào giữa trưa (11h-15h). Tốt nhất là giao vào sáng sớm hoặc chiều muộn.';
      status = 'danger';
    } else if (maxTemp > 32) {
      advice = 'Trời khá nóng. Nên ưu tiên giao buổi sáng sớm.';
      status = 'warning';
    } else if (minTemp < 15) {
      advice = 'Trời khá lạnh. Cần đảm bảo thùng giữ nhiệt tốt, nên giao vào buổi trưa hoặc đầu giờ chiều.';
      status = 'warning';
    } else {
      advice = 'Thời tiết khá thuận lợi. Bạn có thể giao hàng vào bất kỳ thời gian nào trong ngày.';
      status = 'good';
    }

    return res.status(200).json({
      maxTemp,
      minTemp,
      rainProb,
      weatherCode,
      advice,
      status
    });

  } catch (error) {
    console.error('Lỗi lấy thời tiết:', error);
    return res.status(500).json({ error: 'Lỗi kết nối API thời tiết' });
  }
}