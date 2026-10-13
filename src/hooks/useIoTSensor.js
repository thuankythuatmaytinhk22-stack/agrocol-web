import { useState, useEffect, useRef } from 'react';
import {
  getLatestReading,
  getReadingsHistory,
  subscribeToSensor,
  createAlert,
  getTemperatureStatus,
  TEMP_MIN,
  TEMP_MAX,
} from '../services/iotService';

const DEVICE_ID = 'esp32-c3-01';

export default function useIoTSensor() {
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastAlertTemp = useRef(null);
  const lastAlertTime = useRef(0);

  // Load dữ liệu ban đầu
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [latestReading, historyData] = await Promise.all([
          getLatestReading(DEVICE_ID),
          getReadingsHistory(1, DEVICE_ID),
        ]);
        setLatest(latestReading);
        setHistory(historyData);
        setLoading(false);
      } catch (err) {
        console.error('IoT load error:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  // Lắng nghe realtime
  useEffect(() => {
    const channel = subscribeToSensor(DEVICE_ID, (newReading) => {
      setLatest(newReading);
      setHistory((prev) => [...prev, newReading].slice(-60)); // giữ 60 điểm gần nhất

      // Tự động tạo cảnh báo nếu vượt ngưỡng
      const status = getTemperatureStatus(newReading.temperature);
      if (status.level !== 'ideal' && newReading.mode === 1) {
        const now = Date.now();
        const tempDiff = Math.abs(newReading.temperature - (lastAlertTemp.current || 0));
        // Chỉ tạo alert nếu: khác nhiệt độ đáng kể (>0.5°C) HOẶC đã qua 2 phút
        if (tempDiff > 0.5 || now - lastAlertTime.current > 120000) {
          lastAlertTemp.current = newReading.temperature;
          lastAlertTime.current = now;

          createAlert({
            deviceId: newReading.device_id,
            temperature: newReading.temperature,
            alertType: status.level,
            severity: status.level === 'too_high' && newReading.temperature > TEMP_MAX + 3
              ? 'critical'
              : 'warning',
            message: `Nhiệt độ ${newReading.temperature.toFixed(1)}°C ${
              status.level === 'too_high' ? 'vượt ngưỡng trên' : 'dưới ngưỡng'
            } (${TEMP_MIN}–${TEMP_MAX}°C)`,
          }).catch((err) => console.error('Create alert failed:', err));
        }
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const status = latest ? getTemperatureStatus(latest.temperature) : null;

  return {
    latest,
    history,
    status,
    loading,
    error,
    deviceId: DEVICE_ID,
  };
}