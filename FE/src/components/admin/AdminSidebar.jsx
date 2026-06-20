import React from 'react';
import { Link } from 'react-router-dom';
import { FE_LOGO, FE_LOGO_ALT } from '../../assets/brand';
import defaultAvatar from '../../constants/defaultAvatar';
import { ADMIN_NAV_ITEMS, ICPDP_ADMIN_NAV_ITEMS } from '../../data/adminNavItems';
import { getRoleDisplayLabel, getUserRole, isIcpdpRole } from '../../utils/auth';
import { useTranslation } from '../../i18n/I18nContext';
import { AdminMenuIcon } from './AdminMenuIcons';

const AdminSidebar = ({
  open,
  pathname,
  userProfile,
  overlay = false,
}) => {
  const { t } = useTranslation();

  const isActive = (item) => {
    if (item.end) return pathname === item.path;
    if (item.path === '/admin/events') return pathname === '/admin/events' || pathname.startsWith('/admin/events/') && !pathname.startsWith('/admin/events/approved');
    if (item.path === '/admin/events/approved') return pathname === '/admin/events/approved';
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  };

  const navItems = isIcpdpRole() ? ICPDP_ADMIN_NAV_ITEMS : ADMIN_NAV_ITEMS;

  const renderNavItems = () => {
    const out = [];
    let lastSectionKey = null;
    navItems.forEach((item) => {
      if (item.sectionKey && item.sectionKey !== lastSectionKey) {
        lastSectionKey = item.sectionKey;
        out.push(
          <p key={`sec-${item.sectionKey}`} className="ctsv-nav-section">
            {t(item.sectionKey)}
          </p>
        );
        return;
      }
      if (!item.path) return;
      const active = isActive(item);
      out.push(
        <Link
          key={item.path}
          to={item.path}
          className={active ? 'ctsv-nav-link active' : 'ctsv-nav-link'}
        >
          <span className="ctsv-nav-icon">
            <AdminMenuIcon type={item.icon} />
          </span>
          <span className="ctsv-nav-label">{t(item.labelKey)}</span>
        </Link>
      );
    });
    return out;
  };

  const asideClass = `ctsv-sidebar admin-sidebar${overlay ? ' admin-sidebar--overlay' : ''}${open ? ' admin-sidebar--open' : ''}`;

  return (
    <aside className={asideClass} aria-hidden={!open} aria-label={t('admin.sidebarLabel')}>
      <div className="ctsv-sidebar-header">
        <img src={FE_LOGO} alt={FE_LOGO_ALT} className="ctsv-sidebar-logo" />
      </div>
      <nav className="ctsv-sidebar-nav">{renderNavItems()}</nav>
      <div className="ctsv-sidebar-footer">
        <img
          src={userProfile?.picture || defaultAvatar}
          alt=""
          className="ctsv-sidebar-avatar"
        />
        <div className="ctsv-sidebar-footer-text">
          <p className="ctsv-sidebar-user">{userProfile?.fullname || t('header.defaultAdmin')}</p>
          <p className="ctsv-sidebar-role profile-role-admin">{getRoleDisplayLabel(getUserRole())}</p>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
