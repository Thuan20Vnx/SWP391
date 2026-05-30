import React from 'react';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import '../styles/announcements-page.css';

const AnnouncementsLayout = ({ children, title, subtitle }) => (
  <div className="announcements-page">
    <SiteHeader activeNav="news" />

    <main className="announcements-page__main">
      <div className="announcements-page__container">
        {title && <h1 className="announcements-page__title">{title}</h1>}
        {subtitle && <p className="announcements-page__subtitle">{subtitle}</p>}
        {children}
      </div>
    </main>

    <SiteFooter />
  </div>
);

export default AnnouncementsLayout;
