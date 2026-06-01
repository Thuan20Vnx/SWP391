import React from 'react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import AnnouncementDetail from './AnnouncementDetail';

const ClubAnnouncementDetailPage = ({ showToast }) => (
  <div className="announcements-page">
    <SiteHeader activeNav="club-manage" />
    <main className="announcements-page__main">
      <div className="announcements-page__container" style={{ maxWidth: 'var(--home-content-max, 1280px)' }}>
        <AnnouncementDetail
          showToast={showToast}
          embedded
          listPath="/quan-ly-clb/announcements"
          eventBasePath="/events"
        />
      </div>
    </main>
    <SiteFooter />
  </div>
);

export default ClubAnnouncementDetailPage;
