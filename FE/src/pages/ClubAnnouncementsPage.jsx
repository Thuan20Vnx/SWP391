import React from 'react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { ClubAnnouncementManage } from './ctsv/CtsvAnnouncementPublish';

const ClubAnnouncementsPage = ({ showToast }) => (
  <div className="announcements-page">
    <SiteHeader activeNav="club-manage" />
    <main className="announcements-page__main">
      <div className="announcements-page__container" style={{ maxWidth: 'var(--home-content-max, 1280px)' }}>
        <ClubAnnouncementManage showToast={showToast} />
      </div>
    </main>
    <SiteFooter />
  </div>
);

export default ClubAnnouncementsPage;
