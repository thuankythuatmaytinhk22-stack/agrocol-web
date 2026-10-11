import { supabase } from '../lib/supabaseClient';

// === LẤY DANH SÁCH XE ===
export const getAllVehicles = async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

// === LẤY XE THEO ID ===
export const getVehicleById = async (id) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

// === THÊM XE MỚI ===
export const createVehicle = async (vehicleData) => {
  const { data, error } = await supabase
    .from('vehicles')
    .insert([{
      plate_number: vehicleData.plate_number,
      capacity_boxes: vehicleData.capacity_boxes || 12,
      status: vehicleData.status || 'idle',
      notes: vehicleData.notes || '',
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

// === CẬP NHẬT XE ===
export const updateVehicle = async (id, vehicleData) => {
  const { data, error } = await supabase
    .from('vehicles')
    .update(vehicleData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// === XÓA XE ===
export const deleteVehicle = async (id) => {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// === CẬP NHẬT TRẠNG THÁI XE ===
export const updateVehicleStatus = async (id, status) => {
  const { data, error } = await supabase
    .from('vehicles')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// === LẤY THỐNG KÊ XE ===
export const getVehicleStats = async () => {
  const { data, error } = await supabase.from('vehicles').select('status');
  if (error) throw error;
  return {
    total: data.length,
    idle: data.filter((v) => v.status === 'idle').length,
    inTransit: data.filter((v) => v.status === 'in_transit').length,
    maintenance: data.filter((v) => v.status === 'maintenance').length,
  };
};

// === TÍNH SỐ XE CẦN THIẾT ===
export const calculateVehiclesNeeded = (boxes, capacityPerVehicle = 12) => {
  if (!boxes || boxes <= 0) return 0;
  return Math.ceil(boxes / capacityPerVehicle);
};

// === LẤY XE RẢNH ===
export const getIdleVehicles = async () => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'idle');
  if (error) throw error;
  return data || [];
};