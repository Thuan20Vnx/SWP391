import React from 'react';
import PublicAdminShell from '../layouts/PublicAdminShell';
import SiteFooter from './SiteFooter';
import '../styles/announcements-page.css';

const AnnouncementsLayout = ({ children, title, subtitle }) => (
  <PublicAdminShell activeNav="news">
    <div className="announcements-page">
      <main className="announcements-page__main">
        <div className="announcements-page__container">
          {title && (
            <div className="announcements-page__hero">
              <h1 className="announcements-page__title">{title}</h1>
              {subtitle && <p className="announcements-page__subtitle">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  </PublicAdminShell>
);

export default AnnouncementsLayout;
