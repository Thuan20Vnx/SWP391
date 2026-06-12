import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnnouncementsLayout from '../components/AnnouncementsLayout';
import { fetchPublicAnnouncements } from '../services/announcementApi';
import { useTranslation } from '../i18n/I18nContext';
import {
  applyReadState,
  markAllAnnouncementsRead,
} from '../utils/announcementReadState';
import { localizePublicAnnouncement } from '../utils/localizeAnnouncement';

const FILTER_OPTIONS = [
  { id: 'all', labelKey: 'announce.public.filter.all' },
  { id: 'unread', labelKey: 'announce.public.filter.unread' },
  { id: 'important', labelKey: 'announce.public.filter.important' },
];

const BellIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
      fill="currentColor"
    />
  </svg>
);

const Announcements = ({ showToast }) => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [activeFilter, setActiveFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchPublicAnnouncements();
      setItems(applyReadState(list));
    } catch (err) {
      showToast?.(err.message || t('announce.public.loadFail'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const localizedItems = useMemo(
    () => items.map((item) => localizePublicAnnouncement(item, t, language)),
    [items, t, language],
  );

  const filteredItems = useMemo(() => {
    if (activeFilter === 'unread') return localizedItems.filter((item) => item.unread);
    if (activeFilter === 'important') return localizedItems.filter((item) => item.important);
    return localizedItems;
  }, [activeFilter, localizedItems]);

  const unreadCount = localizedItems.filter((item) => item.unread).length;
  const importantCount = localizedItems.filter((item) => item.important).length;

  const markAllRead = () => {
    markAllAnnouncementsRead(items.map((item) => item.id));
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
    showToast?.(t('announce.public.markAllReadSuccess'), 'success');
  };

  return (
    <AnnouncementsLayout
      title={t('announce.public.title')}
      subtitle={t('announce.public.subtitle')}
    >
      {!loading && items.length > 0 && (
        <div className="announcements-stats">
          <div className="announcements-stat">
            <span className="announcements-stat__label">{t('announce.public.stat.total')}</span>
            <span className="announcements-stat__value">{items.length}</span>
          </div>
          <div className={`announcements-stat${unreadCount ? ' announcements-stat--accent' : ''}`}>
            <span className="announcements-stat__label">{t('announce.public.stat.unread')}</span>
            <span className="announcements-stat__value">{unreadCount}</span>
          </div>
          <div className="announcements-stat">
            <span className="announcements-stat__label">{t('announce.public.stat.important')}</span>
            <span className="announcements-stat__value">{importantCount}</span>
          </div>
        </div>
      )}

      <div className="announcements-toolbar">
        <div className="announcements-tabs">
          {FILTER_OPTIONS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`announcements-tab ${activeFilter === filter.id ? 'announcements-tab--active' : ''}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {t(filter.labelKey)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="announcements-mark-read"
          onClick={markAllRead}
          disabled={loading || items.length === 0 || unreadCount === 0}
        >
          {t('announce.public.markAllRead')}
        </button>
      </div>

      {loading ? (
        <div className="announcements-loading" aria-busy="true" aria-label={t('announce.public.loading')}>
          <div className="announcements-skeleton" />
          <div className="announcements-skeleton" />
          <div className="announcements-skeleton" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="announcements-empty">
          <div className="announcements-empty__icon">
            <BellIcon />
          </div>
          <h3>
            {activeFilter === 'all'
              ? t('announce.public.emptyAllTitle')
              : t('announce.public.emptyFilterTitle')}
          </h3>
          <p>
            {activeFilter === 'all'
              ? t('announce.public.emptyAllDesc')
              : t('announce.public.emptyFilterDesc')}
          </p>
        </div>
      ) : (
        <div className="announcements-list">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`announcements-card ${item.unread ? 'announcements-card--unread' : ''}`}
              onClick={() => navigate(`/announcements/${item.id}`)}
            >
              <div className="announcements-card__icon" aria-hidden="true">
                <BellIcon />
              </div>
              <div className="announcements-card__body">
                <div className="announcements-card__head">
                  <span className="announcements-card__title">{item.title}</span>
                  {item.unread && (
                    <span className="announcements-card__unread-dot" aria-label={t('announce.public.unreadAria')} />
                  )}
                </div>
                <p className="announcements-card__excerpt">{item.excerpt}</p>
                <div className="announcements-card__meta">
                  {item.important && (
                    <span className="announcements-detail__badge announcements-detail__badge--important">
                      {t('announce.public.importantBadge')}
                    </span>
                  )}
                  <span className="announcements-card__category">{item.category}</span>
                  <span>{t('announce.public.from', { sender: item.sender })}</span>
                  <span>•</span>
                  <span>{item.time}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </AnnouncementsLayout>
  );
};

export default Announcements;
