import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AnnouncementDetail from './AnnouncementDetail';

const ClubAnnouncementDetailPage = () => {
  const { showToast } = useOutletContext();

  return (
    <div
      className="announcements-page__container"
      style={{ width: '100%', maxWidth: 'var(--home-content-max, 1280px)', margin: '0 auto' }}
    >
      <AnnouncementDetail
        showToast={showToast}
        embedded
        listPath="/quan-ly-clb/announcements"
        eventBasePath="/events"
      />
    </div>
  );
};

export default ClubAnnouncementDetailPage;
