import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { ClubAnnouncementManage } from './ctsv/CtsvAnnouncementPublish';

const ClubAnnouncementsPage = () => {
  const { showToast } = useOutletContext();

  return (
    <div
      className="announcements-page__container"
      style={{ width: '100%', maxWidth: 'var(--home-content-max, 1280px)', margin: '0 auto' }}
    >
      <ClubAnnouncementManage showToast={showToast} />
    </div>
  );
};

export default ClubAnnouncementsPage;
