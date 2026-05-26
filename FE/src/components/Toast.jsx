import React, { useEffect, useState } from 'react';

export const ToastIcon = ({ type }) => {
  if (type === 'success') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    );
  } else if (type === 'info') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    );
  } else {
    // error
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    );
  }
};

const ToastItem = ({ toast, onRemove }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade-out animation at 3.6s (400ms before removing)
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 3600);

    const removeTimer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onRemove]);

  return (
    <div className={`toast ${toast.type} ${fadeOut ? 'fade-out' : ''}`}>
      <ToastIcon type={toast.type} />
      <span>{toast.message}</span>
    </div>
  );
};

export const ToastContainer = ({ toasts, onRemoveToast }) => {
  return (
    <div className="toast-container" id="toast-container">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemoveToast} />
      ))}
    </div>
  );
};
