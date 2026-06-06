import React from 'react';
import ClubPortalShell from '../layouts/ClubPortalShell';
import { ClubAnnouncementManage } from './ctsv/CtsvAnnouncementPublish';

const ClubAnnouncementsPage = ({ showToast }) => (
  <ClubPortalShell activeNav="announcements" showToast={showToast}>
    <div className="announcements-page__container" style={{ width: '100%', maxWidth: 'var(--home-content-max, 1280px)', margin: '0 auto' }}>
      <ClubAnnouncementManage showToast={showToast} />
    </div>
  </ClubPortalShell>
);

export default ClubAnnouncementsPage;
