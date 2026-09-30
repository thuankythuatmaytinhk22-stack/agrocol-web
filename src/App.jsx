import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import TrackingPage from './pages/TrackingPage';
import BoxManagementPage from './pages/BoxManagementPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';

// Component bảo vệ Admin
function ProtectedAdmin() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  return isAdmin ? <AdminPage /> : <LoginPage />;
}

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/tracking/:orderCode" element={<TrackingPage />} />
            <Route path="/box-management" element={<BoxManagementPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<ProtectedAdmin />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;