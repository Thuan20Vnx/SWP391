import React from 'react';
import PublicAdminShell from '../../../layouts/PublicAdminShell';
import SiteFooter from '../../../components/SiteFooter';
import { PortalAnnouncementManage } from '../../ctsv/CtsvAnnouncementPublish';
import '../../../styles/admin-public-pages.css';

const AdminPublicAnnouncements = ({ showToast }) => (
  <PublicAdminShell
    activeNav="news"
    searchPlaceholder="Tìm thông báo theo tiêu đề, danh mục..."
  >
    <div className="admin-public-announcements">
      <PortalAnnouncementManage
        portalRole="admin"
        showToast={showToast}
        detailPathPrefix="/announcements"
        eventDetailPathPrefix="/events"
      />
    </div>
    <SiteFooter />
  </PublicAdminShell>
);

export default AdminPublicAnnouncements;
