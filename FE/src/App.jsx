import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Events from './pages/Events';
import CreateEvent from './pages/CreateEvent';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import MyEvents from './pages/MyEvents';
import Schedule from './pages/Schedule';
import EventReviews from './pages/EventReviews';
import Announcements from './pages/Announcements';
import AnnouncementDetail from './pages/AnnouncementDetail';
import StaticPage from './pages/StaticPage';
import { ToastContainer } from './components/Toast';
import { initThemeFromStorage } from './hooks/useSettingsPreferences';
import './index.css';

initThemeFromStorage();

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

function App() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <Router>
      <div className="app-root">
        <Routes>
          {/* Default route is the beautiful new Home Page */}
          <Route path="/" element={<Home showToast={showToast} />} />
          <Route path="/signup" element={<Signup showToast={showToast} />} />
          <Route path="/login" element={<Login showToast={showToast} />} />
          <Route path="/forgot" element={<ForgotPassword showToast={showToast} />} />
          <Route path="/reset-password" element={<ResetPassword showToast={showToast} />} />

          
          {/* Protected Profile Route */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile showToast={showToast} />
              </ProtectedRoute>
            } 
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings showToast={showToast} />
              </ProtectedRoute>
            }
          />

          {/* Event Routes */}
          <Route path="/events" element={<Events showToast={showToast} />} />
          <Route 
            path="/create-event" 
            element={
              <ProtectedRoute>
                <CreateEvent showToast={showToast} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/events" 
            element={
              <ProtectedRoute>
                <AdminDashboard showToast={showToast} />
              </ProtectedRoute>
            } 
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <StudentDashboard showToast={showToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-events"
            element={
              <ProtectedRoute>
                <MyEvents showToast={showToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <Schedule showToast={showToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/event-reviews"
            element={
              <ProtectedRoute>
                <EventReviews showToast={showToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/announcements"
            element={
              <ProtectedRoute>
                <Announcements showToast={showToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/announcements/:id"
            element={
              <ProtectedRoute>
                <AnnouncementDetail showToast={showToast} />
              </ProtectedRoute>
            }
          />

          <Route path="/terms" element={<StaticPage pageKey="terms" />} />
          <Route path="/privacy" element={<StaticPage pageKey="privacy" />} />
          <Route path="/support" element={<StaticPage pageKey="support" />} />
          <Route path="/contact" element={<StaticPage pageKey="contact" />} />

          {/* Catch-all redirects to signup */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Global Toast Notifications */}
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      </div>
    </Router>
  );
}

export default App;
