export default function StatCard({ icon: Icon, value, label, color = 'blue', suffix = '' }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    dark: 'bg-agro-dark text-white border-agro-dark',
  };

  const iconBg = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    dark: 'bg-agro-yellow text-agro-dark',
  };

  return (
    <div className={`bg-white rounded-2xl p-5 border ${colorMap[color]} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-extrabold text-agro-dark">
        {value}
        {suffix && <span className="text-base font-semibold ml-1">{suffix}</span>}
      </p>
      <p className="text-sm text-gray-500 font-medium mt-1">{label}</p>
    </div>
  );
}