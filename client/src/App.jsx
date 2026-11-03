import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';

// Pages
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Journeys from './pages/Journeys.jsx';
import JourneyForm from './pages/JourneyForm.jsx';
import Reports from './pages/Reports.jsx';
import Analytics from './pages/Analytics.jsx';
import Notifications from './pages/Notifications.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminUsers from './pages/admin/Users.jsx';

// Components
import Sidebar from './components/Sidebar.jsx';
import BottomNav from './components/BottomNav.jsx';
import OfflineIndicator from './components/OfflineIndicator.jsx';
import AIChatModal from './components/AIChatModal.jsx';

// Auth Route Guards
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100" style={{ backgroundColor: 'var(--bg-main)' }}>
        <div className="spinner-border text-teal" style={{ color: '#2dd4bf' }} role="status">
          <span className="visually-hidden">Loading session...</span>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100" style={{ backgroundColor: 'var(--bg-main)' }}>
        <div className="spinner-border text-teal" style={{ color: '#2dd4bf' }} role="status">
          <span className="visually-hidden">Validating administrative permission...</span>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!user.isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <div className="app-layout">
        {/* Persistent left sidebar on desktop, hidden on mobile */}
        <Sidebar />

        <div className="content-wrapper">
          {/* Connection status banner */}
          <OfflineIndicator />

          {/* Mobile Top Header (only visible on mobile, since sidebar is hidden) */}
          {user && (
            <header className="no-print border-bottom border-secondary py-3 px-3 d-lg-none d-flex justify-content-between align-items-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <div className="d-flex align-items-center gap-2">
                <img src="/logo.svg" alt="RailAssist" width="28" height="28" />
                <h5 className="mb-0 text-white font-weight-bold" style={{ fontSize: '15px' }}>RailAssist</h5>
              </div>
              <span className="badge bg-dark border border-secondary text-secondary-custom" style={{ fontSize: '11px' }}>
                {user.name.split(' ')[0]}
              </span>
            </header>
          )}

          {/* Main routing area */}
          <main className="flex-grow-1">
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Protected Employee Routes */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/journeys" element={<ProtectedRoute><Journeys /></ProtectedRoute>} />
              <Route path="/journeys/new" element={<ProtectedRoute><JourneyForm /></ProtectedRoute>} />
              <Route path="/journeys/edit/:id" element={<ProtectedRoute><JourneyForm /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

              {/* Protected Secure Admin Console */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>

        {/* Floating AI Copilot Assistant */}
        <AIChatModal />

        {/* Native Mobile bottom Nav Bar */}
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;
