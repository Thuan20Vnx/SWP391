import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AnnouncementsLayout from '../components/AnnouncementsLayout';
import { fetchPublicAnnouncement } from '../services/announcementApi';
import { markAnnouncementRead } from '../utils/announcementReadState';
import { getPublisherRoleTone } from '../utils/announcementPublisher';
import { getNoticeCategoryLabel } from '../constants/announcementNoticeCategories';
import { useTranslation } from '../i18n/I18nContext';
import { localizePublicAnnouncement } from '../utils/localizeAnnouncement';

const getInitials = (name) => {
  const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
};

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V9h14v11z"
      fill="currentColor"
    />
  </svg>
);

const IconMail = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z"
      fill="currentColor"
    />
  </svg>
);

const IconUser = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
      fill="currentColor"
    />
  </svg>
);

const IconBadge = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M12 2l2.4 4.8 5.3.8-3.85 3.7.9 5.3L12 14.8 7.25 16.6l.9-5.3L4.3 7.6l5.3-.8L12 2z"
      fill="currentColor"
    />
  </svg>
);

const DetailPageShell = ({ embedded, title, children }) => {
  if (embedded) {
    return <div className="announcements-detail-page announcements-detail-page--embedded">{children}</div>;
  }
  return (
    <AnnouncementsLayout title={title}>
      <div className="announcements-detail-page">{children}</div>
    </AnnouncementsLayout>
  );
};

const AnnouncementDetail = ({
  showToast,
  embedded = false,
  listPath = '/announcements',
  eventBasePath = '/events',
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setAvatarError(false);

    fetchPublicAnnouncement(id)
      .then((data) => {
        if (cancelled) return;
        setAnnouncement(localizePublicAnnouncement(data, t, language));
        markAnnouncementRead(data.id);
      })
      .catch((err) => {
        if (cancelled) return;
        setAnnouncement(null);
        setNotFound(true);
        showToast?.(err.message || t('announce.detail.loadFail'), 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, showToast, t, language]);

  if (loading) {
    return (
      <DetailPageShell embedded={embedded} title={t('announce.detail.title')}>
        <div className="announcements-detail-skeleton" aria-busy="true">
          <div className="announcements-skeleton announcements-skeleton--hero" />
          <div className="announcements-detail-skeleton__grid">
            <div className="announcements-skeleton announcements-skeleton--block" />
            <div className="announcements-skeleton announcements-skeleton--aside" />
          </div>
        </div>
      </DetailPageShell>
    );
  }

  if (notFound || !announcement) {
    return (
      <DetailPageShell embedded={embedded} title={t('announce.detail.notFoundTitle')}>
        <div className="announcements-empty">
          <div className="announcements-empty__icon">
            <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h3>{t('announce.detail.notFoundHeading')}</h3>
          <p>{t('announce.detail.notFoundDesc')}</p>
          <button type="button" className="announcements-detail-back" onClick={() => navigate(listPath)}>
            {t('announce.detail.backToList')}
          </button>
        </div>
      </DetailPageShell>
    );
  }

  const paragraphs = (announcement.body || announcement.content || announcement.excerpt || '')
    .split(/\n\n+/)
    .filter(Boolean);

  const roleLabel = announcement.publisherRoleLabel || announcement.sender || t('announce.detail.defaultSchool');
  const roleTone = getPublisherRoleTone(announcement.publishedByRole || roleLabel);
  const noticeLabel = getNoticeCategoryLabel(announcement.noticeCategory, t);
  const noticeKey = announcement.noticeCategory || 'info';
  const publisherName = announcement.publisherName || t('announce.detail.defaultPublisher');
  const publisherAvatar = String(announcement.publisherAvatar || '').trim();
  const showAvatarPhoto = Boolean(publisherAvatar) && !avatarError;
  const eventPath = announcement.eventId ? `${eventBasePath}/${announcement.eventId}` : null;

  return (
    <DetailPageShell embedded={embedded}>
      <button type="button" className="announcements-detail-back" onClick={() => navigate(listPath)}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor" />
        </svg>
        {t('announce.detail.listTitle')}
      </button>

      <article className={`announcements-detail announcements-detail--${roleTone}`}>
        {announcement.image && (
          <div className="announcements-detail__hero">
            <img
              src={announcement.image}
              alt={announcement.title ? t('announce.detail.imageAlt', { title: announcement.title }) : t('announce.detail.imageAltGeneric')}
              className="announcements-detail__hero-img"
            />
          </div>
        )}

        <div className="announcements-detail__shell">
          <header className="announcements-detail__intro">
            <div className="announcements-detail__badges">
                <span className="announcements-detail__badge announcements-detail__badge--category">
                  {announcement.category}
                </span>
                <span className={`announcements-detail__badge announcements-detail__badge--notice announcements-detail__badge--notice-${noticeKey}`}>
                  {noticeLabel}
                </span>
              {announcement.important && (
                <span className="announcements-detail__badge announcements-detail__badge--important">
                  {t('announce.public.importantBadge')}
                </span>
              )}
            </div>
            <h1 className="announcements-detail__title">{announcement.title}</h1>
            <p className="announcements-detail__datetime">
              <IconCalendar />
              {announcement.publishedAtLabel || announcement.time}
            </p>
          </header>

          <div className="announcements-detail__grid">
            <div className="announcements-detail__main">
              <section className="announcements-detail__prose" aria-label={t('announce.detail.contentAria')}>
                {paragraphs.length > 0 ? (
                  paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 32)}>{paragraph}</p>
                  ))
                ) : (
                  <p>{announcement.excerpt || t('announce.detail.noContent')}</p>
                )}
              </section>

              {eventPath && (
                <Link to={eventPath} className="announcements-detail__event-cta">
                  <span className="announcements-detail__event-cta-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22">
                      <path
                        d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V9h14v11z"
                        fill="currentColor"
                      />
                    </svg>
                  </span>
                  <span className="announcements-detail__event-cta-body">
                    <span className="announcements-detail__event-cta-label">{t('announce.detail.relatedEvent')}</span>
                    <span className="announcements-detail__event-cta-title">
                      {announcement.eventTitle || t('announce.detail.viewEvent')}
                    </span>
                  </span>
                  <span className="announcements-detail__event-cta-arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" fill="currentColor" />
                    </svg>
                  </span>
                </Link>
              )}
            </div>

            <aside className="announcements-detail__aside" aria-label={t('announce.detail.senderAria')}>
              <div className="announcements-detail__sender">
                <div className="announcements-detail__sender-top">
                  <div
                    className={`announcements-detail__avatar announcements-detail__avatar--${roleTone}${showAvatarPhoto ? ' announcements-detail__avatar--photo' : ''}`}
                  >
                    {showAvatarPhoto ? (
                      <img
                        src={publisherAvatar}
                        alt=""
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      getInitials(publisherName)
                    )}
                  </div>
                  <div>
                    <p className="announcements-detail__sender-label">{t('announce.detail.senderLabel')}</p>
                    <h2 className="announcements-detail__sender-name">{publisherName}</h2>
                    <span className={`announcements-detail__role announcements-detail__role--${roleTone}`}>
                      {roleLabel}
                    </span>
                  </div>
                </div>

                <ul className="announcements-detail__sender-list">
                  <li>
                    <span className="announcements-detail__sender-icon"><IconUser /></span>
                    <span>
                      <span className="announcements-detail__sender-key">{t('announce.detail.fullName')}</span>
                      <span className="announcements-detail__sender-val">{publisherName}</span>
                    </span>
                  </li>
                  <li>
                    <span className="announcements-detail__sender-icon"><IconMail /></span>
                    <span>
                      <span className="announcements-detail__sender-key">{t('announce.detail.email')}</span>
                      {announcement.publisherEmail ? (
                        <a
                          href={`mailto:${announcement.publisherEmail}`}
                          className="announcements-detail__sender-val announcements-detail__sender-link"
                        >
                          {announcement.publisherEmail}
                        </a>
                      ) : (
                        <span className="announcements-detail__sender-val">—</span>
                      )}
                    </span>
                  </li>
                  <li>
                    <span className="announcements-detail__sender-icon"><IconBadge /></span>
                    <span>
                      <span className="announcements-detail__sender-key">{t('announce.detail.role')}</span>
                      <span className="announcements-detail__sender-val">{roleLabel}</span>
                    </span>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </article>
    </DetailPageShell>
  );
};

export default AnnouncementDetail;
