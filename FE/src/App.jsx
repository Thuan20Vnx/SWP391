import React, { useCallback, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation, useParams, useSearchParams } from 'react-router-dom';

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
import CtsvAnnouncementPublish, {
  AdminAnnouncementManage,
  IcpdpAnnouncementManage,
  ClubAnnouncementManage,
  PartnerAnnouncementManage
} from './pages/ctsv/CtsvAnnouncementPublish';
import CtsvCalendar from './pages/ctsv/CtsvCalendar';
import CtsvReports from './pages/ctsv/CtsvReports';
import CtsvReportDetail from './pages/ctsv/CtsvReportDetail';
import CtsvProfile from './pages/ctsv/CtsvProfile';

import IcpdpLayout from './layouts/IcpdpLayout';
import IcpdpHome from './pages/IcpdpHome';
import IcpdpDashboard from './pages/icpdp/IcpdpDashboard';
import IcpdpProposalList from './pages/icpdp/IcpdpProposalList';
import IcpdpProposalDetail from './pages/icpdp/IcpdpProposalDetail';
import IcpdpClubRegistrationList from './pages/icpdp/IcpdpClubRegistrationList';
import IcpdpClubRegistrationDetail from './pages/icpdp/IcpdpClubRegistrationDetail';
import IcpdpEventList from './pages/icpdp/IcpdpEventList';
import IcpdpEventDetail from './pages/icpdp/IcpdpEventDetail';
import IcpdpCalendar from './pages/icpdp/IcpdpCalendar';
import IcpdpReports from './pages/icpdp/IcpdpReports';
import IcpdpProfileSettings from './pages/icpdp/IcpdpProfileSettings';
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
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminDashboard from './pages/AdminDashboard';
import AdminPartnerApprovals from './pages/admin/AdminPartnerApprovals';
import AdminSystemControl from './pages/admin/AdminSystemControl';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminPartners from './pages/admin/AdminPartners';
import AdminAccountsControl from './pages/admin/AdminAccountsControl';
import AdminSchoolEventApprovals from './pages/admin/AdminSchoolEventApprovals';
import AdminEventRequests from './pages/admin/AdminEventRequests';
import MyEvents from './pages/MyEvents';
import MyClubs from './pages/MyClubs';
import Schedule from './pages/Schedule';
import EventReviews from './pages/EventReviews';
import Announcements from './pages/Announcements';
import AnnouncementDetail from './pages/AnnouncementDetail';
import StaticPage from './pages/StaticPage';
import ClubManagerLayout from './layouts/ClubManagerLayout';
import ClubManagement from './pages/ClubManagement';
import ClubAnnouncementsPage from './pages/ClubAnnouncementsPage';
import ClubAnnouncementDetailPage from './pages/ClubAnnouncementDetailPage';
import EventManagementDetail from './pages/EventManagementDetail';
import QrScanPage from './pages/QrScanPage';

import { ToastContainer } from './components/Toast';
import PartnerLayout from './layouts/PartnerLayout';
import PartnerHome from './pages/PartnerHome';
import PartnerDashboard from './pages/partner/PartnerDashboard';
import PartnerProfileSettings from './pages/partner/PartnerProfileSettings';
import PartnerEventList from './pages/partner/PartnerEventList';
import PartnerEventDetail from './pages/partner/PartnerEventDetail';
import PartnerContractList from './pages/partner/PartnerContractList';
import PartnerAnalytics from './pages/partner/PartnerAnalytics';
import PartnerReportDetail from './pages/partner/PartnerReportDetail';
import PartnerProposalCreate from './pages/partner/PartnerProposalCreate';
import {
  getHomePathForRole,
  getUserRole,
  isCtsvRole,
  isAdminRole,
  isIcpdpRole,
  isClubManagerRole,
  isPartnerRole,
} from './utils/auth';
import SystemMaintenanceGate from './components/SystemMaintenanceGate';
import SystemMaintenanceBanner from './components/SystemMaintenanceBanner';
import { initThemeFromStorage } from './hooks/useSettingsPreferences';
import AdminFptSystem from './pages/admin/public/AdminFptSystem';
import AdminPartnerDetail from './pages/admin/public/AdminPartnerDetail';
import AdminFptDeptDetail from './pages/admin/public/AdminFptDeptDetail';
import AdminFptUnitNotify from './pages/admin/public/AdminFptUnitNotify';
import AdminFptUnitEvents from './pages/admin/AdminFptUnitEvents';
import AdminPublicAnnouncements from './pages/admin/public/AdminPublicAnnouncements';
import PublicAdminShell from './layouts/PublicAdminShell';
import SiteFooter from './components/SiteFooter';
import './index.css';
import './styles/admin-public-pages.css';

initThemeFromStorage();

const ProtectedRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

const CtsvProtectedRoute = () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isCtsvRole() || getUserRole() === 'icpdp') return <Navigate to="/" replace />;
  return <Outlet />;
};

const IcpdpProtectedRoute = () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (getUserRole() !== 'icpdp') return <Navigate to="/" replace />;
  return <Outlet />;
};

const PartnerProtectedRoute = () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isPartnerRole()) return <Navigate to="/" replace />;
  return <Outlet />;
};

const PublicHomeRoute = ({ showToast }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (isLoggedIn) {
    if (getUserRole() === 'icpdp') return <Navigate to="/icpdp" replace />;
    if (isPartnerRole()) return <Navigate to="/partner/dashboard" replace />;
    if (isCtsvRole()) return <Navigate to="/ctsv" replace />;
    if (isAdminRole()) return <AdminFptSystem showToast={showToast} />;
  }
  return <Home showToast={showToast} />;
};

const PublicClubsRoute = ({ showToast }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (isLoggedIn && isAdminRole()) return <Navigate to="/" replace />;
  return <Clubs showToast={showToast} />;
};

const PublicDeptDetailRoute = ({ showToast }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isAdminRole()) return <Navigate to="/" replace />;
  return <AdminFptDeptDetail showToast={showToast} />;
};

const PublicUnitNotifyRoute = () => {
  const { unitType, unitId } = useParams();
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isAdminRole()) return <Navigate to="/" replace />;
  return (
    <Navigate
      to={`/admin/unit-notify/${unitType}/${unitId}${qs ? `?${qs}` : ''}`}
      replace
    />
  );
};

const PublicPartnerDetailRoute = ({ showToast }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!isAdminRole()) return <Navigate to="/" replace />;
  return <AdminPartnerDetail showToast={showToast} />;
};

const PublicAnnouncementsRoute = ({ showToast }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (isAdminRole()) return <AdminPublicAnnouncements showToast={showToast} />;
  return <Announcements showToast={showToast} />;
};

const PublicAnnouncementDetailRoute = ({ showToast }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (isAdminRole()) {
    return (
      <PublicAdminShell activeNav="news">
        <AnnouncementDetail
          showToast={showToast}
          embedded
          listPath="/announcements"
          eventBasePath="/events"
        />
        <SiteFooter />
      </PublicAdminShell>
    );
  }
  return <AnnouncementDetail showToast={showToast} />;
};

const AdminAreaGuard = () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const { pathname } = useLocation();

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (isAdminRole()) return <Outlet />;
  if (isIcpdpRole() && pathname.startsWith('/admin/system')) return <Outlet />;
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
        <SystemMaintenanceGate>
        <Routes>
          <Route path="/" element={<PublicHomeRoute showToast={showToast} />} />

          <Route path="/ctsv" element={<CtsvProtectedRoute />}>
            <Route element={<CtsvLayout showToast={showToast} />}>
              <Route index element={<CtsvHome showToast={showToast} />} />
              <Route path="dashboard" element={<CtsvDashboard />} />
              <Route path="events" element={<CtsvEventList />} />
              <Route path="events/create" element={<CtsvEventCreate />} />
              <Route path="events/:id/edit" element={<CtsvEventCreate />} />
              <Route path="events/:id" element={<CtsvEventDetail />} />
              <Route path="proposals" element={<CtsvProposalList />} />
              <Route path="proposals/:id" element={<CtsvProposalDetail />} />
              <Route path="partners" element={<CtsvPartnerList />} />
              <Route path="partners/:id" element={<CtsvPartnerDetail />} />
              <Route path="announcements/publish" element={<CtsvAnnouncementPublish />} />
              <Route
                path="announcements/:id"
                element={
                  <AnnouncementDetail
                    showToast={showToast}
                    embedded
                    listPath="/ctsv/announcements/publish"
                    eventBasePath="/ctsv/events"
                  />
                }
              />
              <Route path="calendar" element={<CtsvCalendar />} />
              <Route path="reports" element={<CtsvReports />} />
              <Route path="reports/:id" element={<CtsvReportDetail />} />
              <Route path="profile" element={<CtsvProfile showToast={showToast} />} />
            </Route>
          </Route>

          <Route path="/icpdp" element={<IcpdpProtectedRoute />}>
            <Route element={<IcpdpLayout showToast={showToast} />}>
              <Route index element={<IcpdpHome showToast={showToast} />} />
              <Route path="dashboard" element={<IcpdpDashboard />} />
              <Route path="proposals" element={<IcpdpProposalList />} />
              <Route path="proposals/:id" element={<IcpdpProposalDetail />} />
              <Route path="club-registrations" element={<IcpdpClubRegistrationList />} />
              <Route path="club-registrations/:id" element={<IcpdpClubRegistrationDetail />} />
              <Route path="events" element={<IcpdpEventList />} />
              <Route path="events/create" element={<CtsvEventCreate />} />
              <Route path="events/:id/edit" element={<CtsvEventCreate />} />
              <Route path="events/:id" element={<IcpdpEventDetail />} />
              <Route path="calendar" element={<IcpdpCalendar />} />
              <Route path="reports" element={<IcpdpReports />} />
              <Route path="profile" element={<IcpdpProfileSettings showToast={showToast} />} />
              <Route path="announcements" element={<IcpdpAnnouncementManage />} />
              <Route
                path="announcements/:id"
                element={
                  <AnnouncementDetail
                    showToast={showToast}
                    embedded
                    listPath="/icpdp/announcements"
                    eventBasePath="/icpdp/events"
                  />
                }
              />
            </Route>
          </Route>

          <Route path="/partner" element={<PartnerProtectedRoute />}>
            <Route element={<PartnerLayout showToast={showToast} />}>
              <Route index element={<PartnerHome showToast={showToast} />} />
              <Route path="home" element={<Navigate to="/partner" replace />} />
              <Route path="dashboard" element={<PartnerDashboard />} />
              <Route path="profile" element={<PartnerProfileSettings showToast={showToast} />} />
              <Route path="events" element={<PartnerEventList />} />
              <Route path="events/:id" element={<PartnerEventDetail />} />
              <Route path="join/events" element={<Navigate to="/partner" replace />} />
              <Route
                path="join/events/:eventId"
                element={
                  <EventDetail showToast={showToast} embedded backPath="/partner/announcements" />
                }
              />
              <Route path="contracts" element={<PartnerContractList />} />
              <Route path="analytics" element={<PartnerAnalytics />} />
              <Route path="analytics/:id" element={<PartnerReportDetail />} />
              <Route path="proposals/create" element={<PartnerProposalCreate />} />
              <Route path="announcements" element={<PartnerAnnouncementManage />} />
              <Route
                path="announcements/:id"
                element={
                  <AnnouncementDetail
                    showToast={showToast}
                    embedded
                    listPath="/partner/announcements"
                    eventBasePath="/partner/join/events"
                  />
                }
              />
            </Route>
          </Route>

          <Route path="/signup" element={<Signup showToast={showToast} />} />
          <Route path="/login" element={<Login showToast={showToast} />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                {isPartnerRole() ? (
                  <Navigate to="/partner/profile" replace />
                ) : isCtsvRole() ? (
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
          <Route path="/clubs" element={<PublicClubsRoute showToast={showToast} />} />
          <Route path="/clubs/:clubId" element={<ClubDetail showToast={showToast} />} />
          <Route path="/dept/:deptType" element={<PublicDeptDetailRoute showToast={showToast} />} />
          <Route path="/partners/:partnerId" element={<PublicPartnerDetailRoute showToast={showToast} />} />
          <Route
            path="/unit-notify/:unitType/:unitId"
            element={<PublicUnitNotifyRoute showToast={showToast} />}
          />
          <Route
            path="/quan-ly-clb"
            element={
              <ProtectedRoute>
                <ClubManagerLayout showToast={showToast} />
              </ProtectedRoute>
            }
          >
            <Route index element={<ClubManagement />} />
            <Route path="announcements" element={<ClubAnnouncementsPage />} />
            <Route path="announcements/:id" element={<ClubAnnouncementDetailPage />} />
          </Route>
          <Route
            path="/quan-ly-clb/su-kien/:id"
            element={
              <ProtectedRoute>
                <EventManagementDetail showToast={showToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quet-qr"
            element={
              <ProtectedRoute>
                <QrScanPage showToast={showToast} />
              </ProtectedRoute>
            }
          />
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
              <Route path="calendar" element={<AdminCalendar />} />
              <Route path="icpdp/club-registrations" element={<IcpdpClubRegistrationList />} />
              <Route path="icpdp/club-registrations/:id" element={<IcpdpClubRegistrationDetail />} />
              <Route path="profile" element={<Profile showToast={showToast} embedded />} />
              <Route path="events" element={<AdminDashboard showToast={showToast} />} />
              <Route path="events/school-approvals" element={<AdminSchoolEventApprovals showToast={showToast} />} />
              <Route path="event-requests" element={<AdminEventRequests showToast={showToast} />} />
              <Route path="accounts" element={<AdminAccountsControl />} />
              <Route path="system" element={<AdminSystemControl />} />
              <Route path="partners" element={<AdminPartners />} />
              <Route path="partners/approvals" element={<AdminPartnerApprovals showToast={showToast} />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="announcements" element={<AdminAnnouncementManage />} />
              <Route path="unit-events/:unitType/:unitId" element={<AdminFptUnitEvents />} />
              <Route path="unit-notify/:unitType/:unitId" element={<AdminFptUnitNotify />} />
              <Route
                path="announcements/:id"
                element={
                  <AnnouncementDetail
                    showToast={showToast}
                    embedded
                    listPath="/admin/announcements"
                    eventBasePath="/admin/events"
                  />
                }
              />
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
            element={<PublicAnnouncementsRoute showToast={showToast} />}
          />
          <Route
            path="/announcements/:id"
            element={<PublicAnnouncementDetailRoute showToast={showToast} />}
          />

          <Route path="/terms" element={<StaticPage pageKey="terms" />} />
          <Route path="/privacy" element={<StaticPage pageKey="privacy" />} />
          <Route path="/support" element={<StaticPage pageKey="support" />} />
          <Route path="/contact" element={<StaticPage pageKey="contact" />} />
          <Route path="/guide" element={<StaticPage pageKey="guide" />} />
          <Route path="/cookies" element={<StaticPage pageKey="cookies" />} />

          <Route path="*" element={<Navigate to={getHomePathForRole(getUserRole())} replace />} />
        </Routes>
        </SystemMaintenanceGate>
      </div>
    </Router>
  );
}

export default App;
