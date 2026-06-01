import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import useUserProfile from '../../hooks/useUserProfile';
import AdminSidebar from './AdminSidebar';

/** Menu quản trị dạng sidebar CTSV — mở khi bấm 3 gạch (trang ngoài /admin). */
const AdminDrawerMenu = ({ open, onClose }) => {
  const { pathname } = useLocation();
  const { userProfile } = useUserProfile();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="admin-drawer-root" role="presentation">
      <button
        type="button"
        className="ctsv-drawer-backdrop admin-sidebar-backdrop admin-drawer-backdrop"
        onClick={onClose}
        aria-label="Đóng menu"
      />
      <AdminSidebar
        open
        onClose={onClose}
        pathname={pathname}
        userProfile={userProfile}
        overlay
      />
    </div>,
    document.body
  );
};

export default AdminDrawerMenu;
