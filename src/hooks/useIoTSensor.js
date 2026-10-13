import { useState, useEffect, useRef } from 'react';
import {
  getLatestReading,
  getReadingsHistory,
  getShippingOrdersWithTemp,
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
  const [shippingOrders, setShippingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastAlertTemp = useRef(null);
  const lastAlertTime = useRef(0);

  // Load dữ liệu ban đầu
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [latestReading, historyData, shippingData] = await Promise.all([
          getLatestReading(DEVICE_ID).catch(() => null),
          getReadingsHistory(6, DEVICE_ID).catch(() => []),
          getShippingOrdersWithTemp().catch(() => []),
        ]);
        setLatest(latestReading || null);
        setHistory(Array.isArray(historyData) ? historyData : []);
        setShippingOrders(Array.isArray(shippingData) ? shippingData : []);
        setLoading(false);
      } catch (err) {
        console.error('IoT load error:', err);
        setError(err?.message || 'Lỗi không xác định');
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  // Lắng nghe realtime
  useEffect(() => {
    let isMounted = true;

    const channel = subscribeToSensor(DEVICE_ID, async (newReading) => {
      if (!isMounted) return;
      if (!newReading) return;

      // Update latest
      setLatest(newReading);

      // Update history (giữ 60 điểm gần nhất)
      setHistory((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        return [...arr, newReading].slice(-60);
      });

      // Refresh danh sách đơn shipping
      try {
        const shippingData = await getShippingOrdersWithTemp();
        if (!isMounted) return;
        setShippingOrders(Array.isArray(shippingData) ? shippingData : []);
      } catch (err) {
        console.error('Refresh shipping failed:', err);
      }

      // Tự động tạo cảnh báo nếu vượt ngưỡng + có đơn đang giao
      const status = getTemperatureStatus(newReading.temperature);
      if (status.level !== 'ideal' && newReading.mode === 1) {
        const now = Date.now();
        const tempDiff = Math.abs(
          newReading.temperature - (lastAlertTemp.current || 0)
        );

        if (tempDiff > 0.5 || now - lastAlertTime.current > 120000) {
          lastAlertTemp.current = newReading.temperature;
          lastAlertTime.current = now;

          // Lấy TẤT CẢ đơn shipping để gắn vào cảnh báo
          let shippingData = [];
          try {
            shippingData = await getShippingOrdersWithTemp();
          } catch (err) {
            console.error(err);
          }

          const orders = Array.isArray(shippingData) ? shippingData : [];

          if (orders.length > 0) {
            // Tạo 1 alert cho MỖI đơn đang shipping
            orders.forEach((order) => {
              const message = `Đơn ${order.order_code} (${
                order.product_type
              }) đang cảnh báo: nhiệt độ ${newReading.temperature.toFixed(
                1
              )}°C ${
                status.level === 'too_high'
                  ? 'vượt ngưỡng trên'
                  : 'dưới ngưỡng'
              } (${TEMP_MIN}–${TEMP_MAX}°C)`;

              createAlert({
                deviceId: newReading.device_id,
                temperature: newReading.temperature,
                alertType: status.level,
                severity:
                  status.level === 'too_high' &&
                  newReading.temperature > TEMP_MAX + 3
                    ? 'critical'
                    : 'warning',
                message,
                orderCode: order.order_code,
                orderId: order.id,
              }).catch((err) => console.error('Create alert failed:', err));
            });
          } else {
            // Không có đơn shipping → vẫn tạo alert chung
            createAlert({
              deviceId: newReading.device_id,
              temperature: newReading.temperature,
              alertType: status.level,
              severity:
                status.level === 'too_high' &&
                newReading.temperature > TEMP_MAX + 3
                  ? 'critical'
                  : 'warning',
              message: `Thiết bị cảnh báo: nhiệt độ ${newReading.temperature.toFixed(
                1
              )}°C ${
                status.level === 'too_high' ? 'vượt ngưỡng' : 'dưới ngưỡng'
              } (${TEMP_MIN}–${TEMP_MAX}°C)`,
              orderCode: null,
              orderId: null,
            }).catch((err) => console.error('Create alert failed:', err));
          }
        }
      }
    });

    return () => {
      isMounted = false;
      try {
        channel?.unsubscribe?.();
      } catch (err) {
        console.error('Unsubscribe error:', err);
      }
    };
  }, []);

  const status = latest ? getTemperatureStatus(latest.temperature) : null;

  return {
    latest,
    history,
    shippingOrders,
    status,
    loading,
    error,
    deviceId: DEVICE_ID,
  };
}