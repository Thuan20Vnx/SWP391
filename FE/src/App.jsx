import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import Home from './pages/Home';
import CtsvHome from './pages/CtsvHome';
import CtsvLayout from './layouts/CtsvLayout';
import CtsvDashboard from './pages/ctsv/CtsvDashboard';
import CtsvEventList from './pages/ctsv/CtsvEventList';
import CtsvEventDetail from './pages/ctsv/CtsvEventDetail';
import CtsvEventCreate from './pages/ctsv/CtsvEventCreate';
import CtsvProposalList from './pages/ctsv/CtsvProposalList';
import CtsvProposalDetail from './pages/ctsv/CtsvProposalDetail';
import CtsvPartnerList from './pages/ctsv/CtsvPartnerList';
import CtsvPartnerDetail from './pages/ctsv/CtsvPartnerDetail';
import CtsvAnnouncementPublish from './pages/ctsv/CtsvAnnouncementPublish';
import CtsvCalendar from './pages/ctsv/CtsvCalendar';
import CtsvReports from './pages/ctsv/CtsvReports';
import CtsvProfile from './pages/ctsv/CtsvProfile';

import Signup from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Clubs from './pages/Clubs';
import ClubDetail from './pages/ClubDetail';
import CreateEvent from './pages/CreateEvent';
import AdminDashboard from './pages/AdminDashboard';
import AdminPartnerApprovals from './pages/admin/AdminPartnerApprovals';
import MyEvents from './pages/MyEvents';
import MyClubs from './pages/MyClubs';
import Schedule from './pages/Schedule';
import EventReviews from './pages/EventReviews';
import Announcements from './pages/Announcements';
import AnnouncementDetail from './pages/AnnouncementDetail';
import StaticPage from './pages/StaticPage';

import { ToastContainer } from './components/Toast';
import { getHomePathForRole, getUserRole, isCtsvRole } from './utils/auth';
import { initThemeFromStorage } from './hooks/useSettingsPreferences';
import './index.css';

initThemeFromStorage();

const ProtectedRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

const CtsvProtectedRoute = () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isCtsvRole()) return <Navigate to="/" replace />;
  return <Outlet />;
};

const PublicHomeRoute = ({ showToast }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (isLoggedIn && isCtsvRole()) {
    return <Navigate to="/ctsv" replace />;
  }
  return <Home showToast={showToast} />;
};

function App() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <Router>
      <div className="app-root">
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
        <Routes>
          <Route path="/" element={<PublicHomeRoute showToast={showToast} />} />

          <Route path="/ctsv" element={<CtsvProtectedRoute />}>
            <Route element={<CtsvLayout showToast={showToast} />}>
              <Route index element={<CtsvHome showToast={showToast} />} />
              <Route path="dashboard" element={<CtsvDashboard />} />
              <Route path="events" element={<CtsvEventList />} />
              <Route path="events/create" element={<CtsvEventCreate />} />
              <Route path="events/:id" element={<CtsvEventDetail />} />
              <Route path="proposals" element={<CtsvProposalList />} />
              <Route path="proposals/:id" element={<CtsvProposalDetail />} />
              <Route path="partners" element={<CtsvPartnerList />} />
              <Route path="partners/:id" element={<CtsvPartnerDetail />} />
              <Route path="announcements/publish" element={<CtsvAnnouncementPublish />} />
              <Route path="calendar" element={<CtsvCalendar />} />
              <Route path="reports" element={<CtsvReports />} />
              <Route path="profile" element={<CtsvProfile showToast={showToast} />} />
            </Route>
          </Route>

          <Route path="/signup" element={<Signup showToast={showToast} />} />
          <Route path="/login" element={<Login showToast={showToast} />} />
          <Route path="/forgot" element={<ForgotPassword showToast={showToast} />} />
          <Route path="/reset-password" element={<ResetPassword showToast={showToast} />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                {isCtsvRole() ? (
                  <Navigate to="/ctsv/profile" replace />
                ) : (
                  <Profile showToast={showToast} />
                )}
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

          <Route path="/events" element={<Events showToast={showToast} />} />
          <Route path="/events/:eventId" element={<EventDetail showToast={showToast} />} />
          <Route path="/clubs" element={<Clubs showToast={showToast} />} />
          <Route path="/clubs/:clubId" element={<ClubDetail showToast={showToast} />} />
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
            path="/admin/partners"
            element={
              <ProtectedRoute>
                <AdminPartnerApprovals showToast={showToast} />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
          <Route
            path="/my-events"
            element={
              <ProtectedRoute>
                <MyEvents showToast={showToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-clubs"
            element={
              <ProtectedRoute>
                <MyClubs showToast={showToast} />
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

          <Route path="*" element={<Navigate to={getHomePathForRole(getUserRole())} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
