import React from 'react';
import ClubPortalShell from '../layouts/ClubPortalShell';
import AnnouncementDetail from './AnnouncementDetail';

const ClubAnnouncementDetailPage = ({ showToast }) => (
  <ClubPortalShell activeNav="announcements" showToast={showToast}>
    <div className="announcements-page__container" style={{ width: '100%', maxWidth: 'var(--home-content-max, 1280px)', margin: '0 auto' }}>
      <AnnouncementDetail
        showToast={showToast}
        embedded
        listPath="/quan-ly-clb/announcements"
        eventBasePath="/events"
      />
    </div>
  </ClubPortalShell>
);

export default ClubAnnouncementDetailPage;
