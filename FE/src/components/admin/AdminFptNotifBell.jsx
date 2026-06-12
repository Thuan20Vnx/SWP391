import React, { useCallback, useEffect, useState } from 'react';
import HeaderNotificationPanel from '../HeaderNotificationPanel';

/** Chuông thông báo giống header-notif-wrap — dùng trên thẻ FPT / section */
const AdminFptNotifBell = ({ className = '', isAdmin = true }) => {
  const [open, setOpen] = useState(false);

  const handleClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (e.target.closest?.('.admin-fpt-notif-bell')) return;
      if (e.target.closest?.('.header-notif-panel')) return;
      if (e.target.closest?.('.header-notif-backdrop')) return;
      handleClose();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [open, handleClose]);

  return (
    <div className={`header-notif-wrap admin-fpt-notif-bell${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className={`notif-bell-btn${open ? ' notif-bell-btn--open' : ''}`}
        aria-label="Thông báo"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
            fill="currentColor"
          />
        </svg>
        <span className="notif-badge" aria-hidden />
      </button>
      <HeaderNotificationPanel open={open} onClose={handleClose} isAdmin={isAdmin} />
    </div>
  );
};

export default AdminFptNotifBell;
