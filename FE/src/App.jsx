import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import { ToastContainer } from './components/Toast';
import './index.css';

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
