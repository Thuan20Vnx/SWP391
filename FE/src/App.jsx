import React, { useCallback, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';

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
import CtsvPartnerNew from './pages/ctsv/CtsvPartnerNew';
import CtsvAnnouncementPublish from './pages/ctsv/CtsvAnnouncementPublish';
import CtsvCalendar from './pages/ctsv/CtsvCalendar';
import CtsvReports from './pages/ctsv/CtsvReports';

import Signup from './pages/Signup';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Clubs from './pages/Clubs';
import ClubDetail from './pages/ClubDetail';
import CreateEvent from './pages/CreateEvent';
import AdminLayout from './layouts/AdminLayout';
import AdminMonitoringDashboard from './pages/AdminMonitoringDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminPlaceholder from './pages/admin/AdminPlaceholder';
import AdminSystemControl from './pages/admin/AdminSystemControl';
import AdminDataMaintenance from './pages/admin/AdminDataMaintenance';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminPartners from './pages/admin/AdminPartners';
import AdminAccountsControl from './pages/admin/AdminAccountsControl';
import AdminEventRequests from './pages/admin/AdminEventRequests';
import MyEvents from './pages/MyEvents';
import MyClubs from './pages/MyClubs';
import Schedule from './pages/Schedule';
import EventReviews from './pages/EventReviews';
import Announcements from './pages/Announcements';
import AnnouncementDetail from './pages/AnnouncementDetail';
import StaticPage from './pages/StaticPage';

import { ToastContainer } from './components/Toast';
import { getHomePathForRole, getUserRole, isCtsvRole, isAdminRole } from './utils/auth';
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

const AdminAreaGuard = () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const { pathname } = useLocation();

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (isAdminRole()) return <Outlet />;
  if (
    isCtsvRole() &&
    (pathname.startsWith('/admin/events') || pathname.startsWith('/admin/event-requests'))
  ) {
    return <Outlet />;
  }
  return <Navigate to="/" replace />;
};

function App() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <Router>
      <div className="app-root">
        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
        <Routes>
          <Route path="/" element={<PublicHomeRoute showToast={showToast} />} />

          <Route path="/ctsv" element={<CtsvProtectedRoute />}>
            <Route index element={<CtsvHome showToast={showToast} />} />
            <Route element={<CtsvLayout showToast={showToast} />}>
              <Route path="dashboard" element={<CtsvDashboard />} />
              <Route path="events" element={<CtsvEventList />} />
              <Route path="events/create" element={<CtsvEventCreate />} />
              <Route path="events/:id" element={<CtsvEventDetail />} />
              <Route path="proposals" element={<CtsvProposalList />} />
              <Route path="proposals/:id" element={<CtsvProposalDetail />} />
              <Route path="partners" element={<CtsvPartnerList />} />
              <Route path="partners/new" element={<CtsvPartnerNew />} />
              <Route path="partners/:id" element={<CtsvPartnerDetail />} />
              <Route path="announcements/publish" element={<CtsvAnnouncementPublish />} />
              <Route path="calendar" element={<CtsvCalendar />} />
              <Route path="reports" element={<CtsvReports />} />
            </Route>
          </Route>

          <Route path="/signup" element={<Signup showToast={showToast} />} />
          <Route path="/login" element={<Login showToast={showToast} />} />
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
          <Route path="/admin" element={<AdminAreaGuard />}>
            <Route element={<AdminLayout showToast={showToast} />}>
              <Route index element={<AdminMonitoringDashboard />} />
              <Route path="events" element={<AdminDashboard showToast={showToast} />} />
              <Route path="event-requests" element={<AdminEventRequests showToast={showToast} />} />
              <Route path="accounts" element={<AdminAccountsControl />} />
              <Route path="system" element={<AdminSystemControl />} />
              <Route path="data" element={<AdminDataMaintenance />} />
              <Route path="partners" element={<AdminPartners />} />
              <Route path="analytics" element={<AdminAnalytics />} />
            </Route>
          </Route>
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
