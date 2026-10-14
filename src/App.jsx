import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ChatWidget from './components/ai/ChatWidget';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import TrackingPage from './pages/TrackingPage';
import BoxManagementPage from './pages/BoxManagementPage';
import LoginPage from './pages/LoginPage';

// Admin Layout + Pages
import AdminLayout from './components/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import OrdersPage from './pages/admin/OrdersPage';
import VehiclesPage from './pages/admin/VehiclesPage';
import DriversPage from './pages/admin/DriversPage';
import DispatchPage from './pages/admin/DispatchPage';
import BoxesPage from './pages/admin/BoxesPage';
import IoTPage from './pages/admin/IoTPage';
import RevenuePage from './pages/admin/RevenuePage';

// Component bảo vệ Admin
function ProtectedAdmin() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  return isAdmin ? <AdminLayout /> : <LoginPage />;
}

// Trang chưa làm
function ComingSoon({ title }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-2xl font-bold text-agro-dark mb-2">{title}</h2>
        <p className="text-gray-500 text-sm">Trang này đang được phát triển...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* === ADMIN ROUTES === */}
        <Route path="/admin" element={<ProtectedAdmin />}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="dispatch" element={<DispatchPage />} />
          <Route path="boxes" element={<BoxesPage />} />
          <Route path="iot" element={<IoTPage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route
            path="reports"
            element={<ComingSoon title="Báo cáo & Thống kê" />}
          />
          <Route
            path="settings"
            element={<ComingSoon title="Cài đặt hệ thống" />}
          />
        </Route>

        {/* === PUBLIC ROUTES === */}
        <Route
          path="*"
          element={
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/booking" element={<BookingPage />} />
                  <Route path="/tracking" element={<TrackingPage />} />
                  <Route
                    path="/tracking/:orderCode"
                    element={<TrackingPage />}
                  />
                  <Route
                    path="/box-management"
                    element={<BoxManagementPage />}
                  />
                  <Route path="/login" element={<LoginPage />} />
                </Routes>
              </main>
              <Footer />
              <ChatWidget />
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;