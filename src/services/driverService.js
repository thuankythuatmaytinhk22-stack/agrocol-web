import { supabase } from '../lib/supabaseClient';

// === LẤY DANH SÁCH TÀI XẾ ===
export const getAllDrivers = async () => {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

// === LẤY TÀI XẾ THEO ID ===
export const getDriverById = async (id) => {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

// === THÊM TÀI XẾ MỚI ===
export const createDriver = async (driverData) => {
  const { data, error } = await supabase
    .from('drivers')
    .insert([{
      name: driverData.name,
      phone: driverData.phone,
      license_number: driverData.license_number || '',
      status: driverData.status || 'available',
      years_experience: driverData.years_experience || 0,
      favorite_routes: driverData.favorite_routes || [],
      notes: driverData.notes || '',
    }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

// === CẬP NHẬT TÀI XẾ ===
export const updateDriver = async (id, driverData) => {
  const { data, error } = await supabase
    .from('drivers')
    .update(driverData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// === XÓA TÀI XẾ ===
export const deleteDriver = async (id) => {
  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

// === CẬP NHẬT TRẠNG THÁI TÀI XẾ ===
export const updateDriverStatus = async (id, status) => {
  const { data, error } = await supabase
    .from('drivers')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// === LẤY THỐNG KÊ TÀI XẾ ===
export const getDriverStats = async () => {
  const { data, error } = await supabase.from('drivers').select('status');
  if (error) throw error;
  return {
    total: data.length,
    available: data.filter((d) => d.status === 'available').length,
    onDuty: data.filter((d) => d.status === 'on_duty').length,
    off: data.filter((d) => d.status === 'off').length,
  };
};

// === LẤY TÀI XẾ RẢNH ===
export const getAvailableDrivers = async () => {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('status', 'available');
  if (error) throw error;
  return data || [];
};