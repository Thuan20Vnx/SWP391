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

import CtsvPartnerNew from './pages/ctsv/CtsvPartnerNew';

import CtsvAnnouncementPublish from './pages/ctsv/CtsvAnnouncementPublish';

import CtsvCalendar from './pages/ctsv/CtsvCalendar';

import CtsvReports from './pages/ctsv/CtsvReports';

import Signup from './pages/Signup';

import Login from './pages/Login';

import ForgotPassword from './pages/ForgotPassword';

import ResetPassword from './pages/ResetPassword';

import Profile from './pages/Profile';

import { ToastContainer } from './components/Toast';

import { getHomePathForRole, getUserRole, isCtsvRole } from './utils/auth';

import './index.css';



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

          <Route path="/forgot" element={<ForgotPassword showToast={showToast} />} />

          <Route path="/reset-password" element={<ResetPassword showToast={showToast} />} />



          <Route

            path="/profile"

            element={

              <ProtectedRoute>

                <Profile showToast={showToast} />

              </ProtectedRoute>

            }

          />



          <Route path="*" element={<Navigate to={getHomePathForRole(getUserRole())} replace />} />

        </Routes>



        <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      </div>

    </Router>

  );

}



export default App;

