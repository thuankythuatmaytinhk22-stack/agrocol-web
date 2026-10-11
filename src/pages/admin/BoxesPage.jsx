import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getAllBoxes, updateBoxStatus } from '../../services/boxService';
import {
  Recycle,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';

export default function BoxesPage() {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boxFilter, setBoxFilter] = useState('all');
  const [boxSearch, setBoxSearch] = useState('');
  const [boxPage, setBoxPage] = useState(1);
  const boxesPerPage = 10;

  useEffect(() => {
    fetchBoxes();
  }, []);

  const fetchBoxes = async () => {
    try {
      const data = await getAllBoxes();
      setBoxes(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleUpdateBoxStatus = async (boxCode, newStatus) => {
    try {
      await updateBoxStatus(boxCode, newStatus);
      fetchBoxes();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleClearReadyBoxes = async () => {
    if (
      !window.confirm(
        'Xóa tất cả thùng đã sẵn sàng tái sử dụng? Hành động này không thể hoàn tác.'
      )
    )
      return;
    try {
      const readyBoxes = boxes.filter((b) => b.status === 'ready');
      if (readyBoxes.length === 0) {
        alert('Không có thùng nào cần xóa.');
        return;
      }
      const { error } = await supabase
        .from('boxes')
        .delete()
        .in('id', readyBoxes.map((b) => b.id));
      if (error) throw error;
      alert(`Đã xóa ${readyBoxes.length} thùng.`);
      fetchBoxes();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const boxStatusOptions = [
    {
      value: 'delivered',
      label: 'Đã giao (Chờ thu hồi)',
      color: 'bg-green-100 text-green-700',
    },
    {
      value: 'waiting_return',
      label: 'Chờ thu hồi',
      color: 'bg-yellow-100 text-yellow-700',
    },
    {
      value: 'at_hub',
      label: 'Đã về Hub',
      color: 'bg-blue-100 text-blue-700',
    },
    {
      value: 'ready',
      label: 'Sẵn sàng tái sử dụng',
      color: 'bg-purple-100 text-purple-700',
    },
  ];

  const filteredBoxes = boxes.filter((box) => {
    const matchStatus = boxFilter === 'all' || box.status === boxFilter;
    const matchSearch =
      !boxSearch ||
      box.box_code.toLowerCase().includes(boxSearch.toLowerCase()) ||
      box.product_type?.toLowerCase().includes(boxSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalBoxPages = Math.ceil(filteredBoxes.length / boxesPerPage);
  const paginatedBoxes = filteredBoxes.slice(
    (boxPage - 1) * boxesPerPage,
    boxPage * boxesPerPage
  );

  useEffect(() => {
    setBoxPage(1);
  }, [boxFilter, boxSearch]);

  const boxStats = {
    total: boxes.length,
    delivered: boxes.filter((b) => b.status === 'delivered').length,
    waitingReturn: boxes.filter((b) => b.status === 'waiting_return').length,
    atHub: boxes.filter((b) => b.status === 'at_hub').length,
    ready: boxes.filter((b) => b.status === 'ready').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-agro-yellow border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-agro-dark flex items-center gap-2">
          <Recycle className="w-6 h-6" />
          Quản lý Thùng lạnh
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {filteredBoxes.length} / {boxes.length} thùng đang hiển thị
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium">Tổng</p>
          <p className="text-2xl font-bold text-agro-dark">{boxStats.total}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-xs text-gray-500 font-medium">Đã giao</p>
          <p className="text-2xl font-bold text-green-700">
            {boxStats.delivered}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <p className="text-xs text-gray-500 font-medium">Chờ thu hồi</p>
          <p className="text-2xl font-bold text-yellow-700">
            {boxStats.waitingReturn}
          </p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs text-gray-500 font-medium">Đã về Hub</p>
          <p className="text-2xl font-bold text-blue-700">{boxStats.atHub}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <p className="text-xs text-gray-500 font-medium">Sẵn sàng</p>
          <p className="text-2xl font-bold text-purple-700">{boxStats.ready}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo mã thùng, loại nông sản..."
            value={boxSearch}
            onChange={(e) => setBoxSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark"
          />
        </div>
        <select
          value={boxFilter}
          onChange={(e) => setBoxFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-agro-dark text-agro-dark font-medium"
        >
          <option value="all">Tất cả trạng thái</option>
          {boxStatusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleClearReadyBoxes}
          className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Xóa thùng sẵn sàng
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-agro-dark text-white">
            <tr>
              <th className="px-6 py-4 text-xs font-bold">Mã thùng</th>
              <th className="px-6 py-4 text-xs font-bold">Loại nông sản</th>
              <th className="px-6 py-4 text-xs font-bold">Nhiệt độ mục tiêu</th>
              <th className="px-6 py-4 text-xs font-bold">Trạng thái</th>
              <th className="px-6 py-4 text-xs font-bold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBoxes.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-400 text-sm">
                  Không có thùng nào
                </td>
              </tr>
            ) : (
              paginatedBoxes.map((box) => (
                <tr
                  key={box.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-6 py-4 font-bold text-agro-dark text-sm">
                    {box.box_code}
                  </td>
                  <td className="px-6 py-4 text-sm">{box.product_type}</td>
                  <td className="px-6 py-4 text-sm">{box.target_temp}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        boxStatusOptions.find((s) => s.value === box.status)
                          ?.color
                      }`}
                    >
                      {
                        boxStatusOptions.find((s) => s.value === box.status)
                          ?.label
                      }
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={box.status}
                      onChange={(e) =>
                        handleUpdateBoxStatus(box.box_code, e.target.value)
                      }
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-agro-dark"
                    >
                      {boxStatusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalBoxPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-sm text-gray-600 font-medium">
            Trang {boxPage} / {totalBoxPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setBoxPage((p) => Math.max(1, p - 1))}
              disabled={boxPage === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setBoxPage((p) => Math.min(totalBoxPages, p + 1))}
              disabled={boxPage === totalBoxPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}