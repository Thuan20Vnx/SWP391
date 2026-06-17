import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AdminAnalyticsViewAllModal from '../../components/admin/AdminAnalyticsViewAllModal';
import {
  ADMIN_ANALYTICS_PERIODS,
  ANALYTICS_PREVIEW_LIMITS,
  ANALYTICS_VIEW_ALL_META,
  getAnalyticsViewAllMeta,
} from '../../data/adminAnalyticsData';
import useAdminAnalyticsLiveData from '../../hooks/useAdminAnalyticsLiveData';
import { downloadAdminAnalyticsReport } from '../../utils/exportAdminAnalyticsReport';
import { useTranslation } from '../../i18n/I18nContext';
import { mapSelectOptions, resolveLabel } from '../../i18n/helpers';
import { getUserRole, isAdminRole } from '../../utils/auth';
import {
  formatAnalyticsDateTime,
  localizeAnalyticsCategory,
  localizeAnalyticsEvent,
  localizeAnalyticsList,
  localizeAnalyticsOverview,
  localizeAnalyticsReview,
} from '../../utils/localizeAdminAnalytics';
import '../../styles/admin-dashboard.css';
import '../../styles/admin-analytics.css';

const IconStar = ({ filled }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

const StarRating = ({ value, max = 5, t }) => (
  <span className="admin-analytics-stars" aria-label={t('admin.analytics.starsAria', { value, max })}>
    {Array.from({ length: max }, (_, i) => (
      <span key={i} className={i < Math.round(value) ? 'admin-analytics-stars__on' : ''}>
        <IconStar filled={i < Math.round(value)} />
      </span>
    ))}
  </span>
);

const IconExport = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M12 3v12M8 11l4 4 4-4M5 21h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PanelHead = ({ title, onViewAll, showViewAll = true, t }) => (
  <div className="admin-panel__head">
    <h2 className="admin-panel__title admin-panel__title--inline">{title}</h2>
    {showViewAll && (
      <button
        type="button"
        className="admin-panel__link admin-analytics-view-all-btn"
        onClick={(e) => {
          e.stopPropagation();
          onViewAll();
        }}
      >
        {t('admin.analytics.viewAll')}
      </button>
    )}
  </div>
);

const panelKeyOpen = (onOpen) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onOpen();
  }
};

const AnalyticsPanel = ({ section, className = '', onOpen, children, t }) => {
  const meta = ANALYTICS_VIEW_ALL_META[section];
  const label = meta?.titleKey ? t(meta.titleKey) : t('admin.analytics.viewDetail');
  return (
    <article
      className={`admin-panel admin-panel--clickable admin-analytics-panel--lift ${className}`.trim()}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={panelKeyOpen(onOpen)}
      aria-label={t('admin.analytics.panelAria', { label })}
    >
      {children}
    </article>
  );
};

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const { t, language } = useTranslation();
  const role = getUserRole();
  const [period, setPeriod] = useState('month');
  const [viewAllSection, setViewAllSection] = useState(null);
  const live = useAdminAnalyticsLiveData(period, language);
  const {
    overview: rawOverview,
    starDistribution,
    starDetailRows,
    categoryRatings: rawCategoryRatings,
    topEvents: rawTopEvents,
    topClubs,
    allEvents: rawAllEvents,
    allClubs,
    recentReviews: rawRecentReviews,
    allReviews: rawAllReviews,
    maxStarCount,
    maxCategoryReviews,
    now,
    loading,
    exportPayload,
    periodLabel,
  } = live;

  const periodOptions = useMemo(() => mapSelectOptions(ADMIN_ANALYTICS_PERIODS, t), [t]);
  const numberLocale = language === 'en' ? 'en-US' : 'vi-VN';

  const overview = useMemo(
    () => localizeAnalyticsOverview(rawOverview, t, language),
    [rawOverview, t, language],
  );

  const categoryRatings = useMemo(
    () => localizeAnalyticsList(rawCategoryRatings, localizeAnalyticsCategory, t, language),
    [rawCategoryRatings, t, language],
  );

  const topEvents = useMemo(
    () => localizeAnalyticsList(rawTopEvents, localizeAnalyticsEvent, t, language),
    [rawTopEvents, t, language],
  );

  const allEvents = useMemo(
    () => localizeAnalyticsList(rawAllEvents, localizeAnalyticsEvent, t, language),
    [rawAllEvents, t, language],
  );

  const recentReviews = useMemo(
    () => localizeAnalyticsList(rawRecentReviews, localizeAnalyticsReview, t, language),
    [rawRecentReviews, t, language],
  );

  const allReviews = useMemo(
    () => localizeAnalyticsList(rawAllReviews, localizeAnalyticsReview, t, language),
    [rawAllReviews, t, language],
  );

  const previewCategories = categoryRatings.slice(0, ANALYTICS_PREVIEW_LIMITS.categories);
  const previewEvents = topEvents.slice(0, ANALYTICS_PREVIEW_LIMITS.events);
  const previewClubs = topClubs.slice(0, ANALYTICS_PREVIEW_LIMITS.clubs);
  const previewReviews = recentReviews.slice(0, ANALYTICS_PREVIEW_LIMITS.reviews);

  useEffect(() => {
    if (!isAdminRole(role)) {
      showToast?.(t('admin.common.noAccess'), 'error');
      navigate('/profile');
    }
  }, [role, navigate, showToast, t]);

  const handleExport = () => {
    if (!exportPayload || loading) {
      showToast?.(t('admin.analytics.exportEmpty'), 'error');
      return;
    }
    try {
      const activePeriodLabel =
        periodOptions.find((opt) => opt.value === period)?.label || periodLabel || period;
      downloadAdminAnalyticsReport(exportPayload, {
        periodLabel: activePeriodLabel,
        language,
      });
      showToast?.(t('admin.analytics.exportSuccess'), 'success');
    } catch {
      showToast?.(t('admin.analytics.exportFail'), 'error');
    }
  };

  const openSection = (section) => () => setViewAllSection(section);

  if (!isAdminRole(role)) return null;

  return (
    <main className="admin-main">
      <div className="admin-dashboard-grid admin-analytics-grid">
        <header className="admin-page-header admin-analytics-header">
          <div>
            <h1 className="admin-main__title">{t('admin.analytics.title')}</h1>
            <p className="admin-page-header__clock">
              {t('admin.analytics.subtitle', { time: formatAnalyticsDateTime(now, language) })}
            </p>
          </div>
          <div className="admin-analytics-toolbar">
            <div className="admin-analytics-period" role="tablist" aria-label={t('admin.analytics.periodAria')}>
              {periodOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={period === opt.value}
                  className={`admin-analytics-period__btn${period === opt.value ? ' admin-analytics-period__btn--active' : ''}`}
                  onClick={() => setPeriod(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button type="button" className="admin-analytics-export" onClick={handleExport} disabled={loading}>
              <IconExport />
              {t('admin.analytics.export')}
            </button>
          </div>
        </header>

        {loading ? (
          <p className="admin-page-header__clock">{t('admin.analytics.loading')}</p>
        ) : (
          <>
        <section className="admin-analytics-kpis" aria-label={t('admin.analytics.kpisAria')}>
          <article className="admin-stat-card admin-analytics-kpi">
            <p className="admin-stat-card__label">{t('admin.analytics.kpi.avgRating')}</p>
            <p className="admin-stat-card__value admin-stat-card__value--primary">
              {overview.avgRating}
              <span className="admin-analytics-kpi__suffix">/{overview.avgRatingMax}</span>
            </p>
            <p className="admin-stat-card__trend admin-stat-card__trend--inline">
              <span aria-hidden="true">↑</span> {overview.trendAvg} {overview.trendCaption}
            </p>
            <StarRating value={overview.avgRating} t={t} />
          </article>
          <article className="admin-stat-card admin-analytics-kpi">
            <p className="admin-stat-card__label">{t('admin.analytics.kpi.totalReviews')}</p>
            <p className="admin-stat-card__value">{overview.totalReviews.toLocaleString(numberLocale)}</p>
            <p className="admin-stat-card__trend admin-stat-card__trend--inline">
              <span aria-hidden="true">↑</span> {overview.trendReviews} {overview.trendCaption}
            </p>
          </article>
          <article className="admin-stat-card admin-analytics-kpi">
            <p className="admin-stat-card__label">{t('admin.analytics.kpi.satisfaction')}</p>
            <p className="admin-stat-card__value">{overview.satisfactionRate}%</p>
            <div className="admin-goal-progress">
              <div className="admin-goal-progress__track">
                <span className="admin-goal-progress__fill" style={{ width: `${overview.satisfactionRate}%` }} />
              </div>
            </div>
          </article>
          <article className="admin-stat-card admin-analytics-kpi">
            <p className="admin-stat-card__label">{t('admin.analytics.kpi.reviewedEvents')}</p>
            <p className="admin-stat-card__value">{overview.reviewedEvents}</p>
            <p className="admin-metric-hero__sub">{t('admin.analytics.kpi.systemWide')}</p>
          </article>
        </section>

        <section className="admin-analytics-charts">
          <AnalyticsPanel
            section="stars"
            className="admin-panel--chart admin-analytics-panel--stars"
            onOpen={openSection('stars')}
            t={t}
          >
            <PanelHead title={t('admin.analytics.panel.stars.title')} onViewAll={openSection('stars')} t={t} />
            <p className="admin-chart-header__sub">{t('admin.analytics.panel.stars.sub')}</p>
            <ul className="admin-analytics-star-bars">
              {starDistribution.map((row) => (
                <li key={row.stars} className="admin-analytics-star-bars__row">
                  <span className="admin-analytics-star-bars__label">
                    {row.stars} <IconStar filled />
                  </span>
                  <div className="admin-analytics-star-bars__track">
                    <span
                      className="admin-analytics-star-bars__fill"
                      style={{ width: `${(row.count / maxStarCount) * 100}%` }}
                    />
                  </div>
                  <span className="admin-analytics-star-bars__count">{row.count.toLocaleString(numberLocale)}</span>
                  <span className="admin-analytics-star-bars__pct">{row.percent}%</span>
                </li>
              ))}
            </ul>
          </AnalyticsPanel>

          <AnalyticsPanel
            section="categories"
            className="admin-analytics-panel--categories"
            onOpen={openSection('categories')}
            t={t}
          >
            <PanelHead
              title={t('admin.analytics.panel.categories.title')}
              onViewAll={openSection('categories')}
              t={t}
            />
            <p className="admin-chart-header__sub">{t('admin.analytics.panel.categories.sub')}</p>
            <ul className="admin-analytics-cat-list">
              {previewCategories.map((cat) => (
                <li key={cat.id} className="admin-analytics-cat-list__item">
                  <div className="admin-analytics-cat-list__head">
                    <span className="admin-analytics-cat-list__name">{resolveLabel(cat, t)}</span>
                    <span className="admin-analytics-cat-list__avg">{cat.avg}/5</span>
                  </div>
                  <div className="admin-analytics-cat-list__track">
                    <span
                      className="admin-analytics-cat-list__fill"
                      style={{ width: `${(cat.reviews / maxCategoryReviews) * 100}%` }}
                    />
                  </div>
                  <span className="admin-analytics-cat-list__reviews">
                    {t('admin.analytics.reviewsCount', { count: cat.reviews })}
                  </span>
                </li>
              ))}
            </ul>
          </AnalyticsPanel>
        </section>

        <section className="admin-analytics-tables">
          <AnalyticsPanel section="events" className="admin-analytics-panel--table" onOpen={openSection('events')} t={t}>
            <PanelHead title={t('admin.analytics.panel.events.title')} onViewAll={openSection('events')} t={t} />
            <div className="admin-analytics-table-wrap">
              <table className="admin-analytics-table">
                <thead>
                  <tr>
                    <th>{t('admin.analytics.table.event')}</th>
                    <th>{t('admin.analytics.table.org')}</th>
                    <th>{t('admin.analytics.table.category')}</th>
                    <th>{t('admin.analytics.table.avgRating')}</th>
                    <th>{t('admin.analytics.table.feedback')}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewEvents.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.name}</strong>
                      </td>
                      <td>{row.org}</td>
                      <td className="admin-analytics-table__muted">{row.category}</td>
                      <td>
                        <StarRating value={row.rating} t={t} />
                        <span className="admin-analytics-table__rating-num">{row.rating}</span>
                      </td>
                      <td>{row.reviews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnalyticsPanel>

          <AnalyticsPanel section="clubs" className="admin-analytics-panel--table" onOpen={openSection('clubs')} t={t}>
            <PanelHead title={t('admin.analytics.panel.clubs.title')} onViewAll={openSection('clubs')} t={t} />
            <div className="admin-analytics-table-wrap">
              <table className="admin-analytics-table">
                <thead>
                  <tr>
                    <th>{t('admin.analytics.table.clubCode')}</th>
                    <th>{t('admin.analytics.table.clubName')}</th>
                    <th>{t('admin.analytics.table.avgRating')}</th>
                    <th>{t('admin.analytics.table.feedback')}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewClubs.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <code className="admin-analytics-code">{row.code}</code>
                      </td>
                      <td>
                        <strong>{row.name}</strong>
                      </td>
                      <td>
                        <StarRating value={row.avg} t={t} />
                        <span className="admin-analytics-table__rating-num">{row.avg}</span>
                      </td>
                      <td>{row.reviews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnalyticsPanel>
        </section>

        <AnalyticsPanel
          section="reviews"
          className="admin-panel--activity admin-analytics-reviews"
          onOpen={openSection('reviews')}
          t={t}
        >
          <PanelHead title={t('admin.analytics.panel.reviews.title')} onViewAll={openSection('reviews')} t={t} />
          <ul className="admin-activity-list admin-analytics-review-list">
            {previewReviews.map((review) => (
              <li key={review.id} className="admin-activity-item admin-activity-item--primary">
                <p className="admin-activity-item__time">{review.time}</p>
                <p className="admin-activity-item__actor">
                  {review.user} · {review.event}
                </p>
                <div className="admin-analytics-review-meta">
                  <StarRating value={review.stars} t={t} />
                  <span className="admin-analytics-review-stars-label">{review.stars}/5</span>
                </div>
                <p className="admin-activity-item__message">{review.excerpt}</p>
              </li>
            ))}
          </ul>
        </AnalyticsPanel>
          </>
        )}
      </div>

      <AdminAnalyticsViewAllModal
        section={viewAllSection}
        open={Boolean(viewAllSection)}
        onClose={() => setViewAllSection(null)}
        starDetailRows={starDetailRows}
        maxStarCount={maxStarCount}
        categoryRatings={categoryRatings}
        maxCategoryReviews={maxCategoryReviews}
        allEvents={allEvents}
        allClubs={allClubs}
        allReviews={allReviews}
        viewAllMeta={getAnalyticsViewAllMeta(t)}
        language={language}
      />
    </main>
  );
};

export default AdminAnalytics;
