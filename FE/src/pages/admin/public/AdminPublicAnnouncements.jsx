import React from 'react';
import PublicAdminShell from '../../../layouts/PublicAdminShell';
import SiteFooter from '../../../components/SiteFooter';
import { PortalAnnouncementManage } from '../../ctsv/CtsvAnnouncementPublish';
import { useTranslation } from '../../../i18n/I18nContext';
import '../../../styles/admin-public-pages.css';

const AdminPublicAnnouncements = ({ showToast }) => {
  const { t } = useTranslation();

  return (
    <PublicAdminShell activeNav="news" searchPlaceholder={t('header.searchAnnouncements')}>
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
};

export default AdminPublicAnnouncements;
