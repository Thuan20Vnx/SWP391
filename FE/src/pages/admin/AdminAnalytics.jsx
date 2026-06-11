import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AdminAnalyticsViewAllModal from '../../components/admin/AdminAnalyticsViewAllModal';
import {
  ADMIN_ANALYTICS_PERIODS,
  ANALYTICS_PREVIEW_LIMITS,
  ANALYTICS_VIEW_ALL_META,
} from '../../data/adminAnalyticsData';
import useAdminAnalyticsLiveData from '../../hooks/useAdminAnalyticsLiveData';
import { getUserRole, isAdminRole } from '../../utils/auth';
import { formatAdminDateTime } from '../../utils/adminLiveTime';
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

const StarRating = ({ value, max = 5 }) => (
  <span className="admin-analytics-stars" aria-label={`${value} trên ${max} sao`}>
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

const PanelHead = ({ title, onViewAll, showViewAll = true }) => (
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
        Xem tất cả
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

const AnalyticsPanel = ({ section, className = '', onOpen, children }) => {
  const label = ANALYTICS_VIEW_ALL_META[section]?.title || 'Xem chi tiết';
  return (
    <article
      className={`admin-panel admin-panel--clickable admin-analytics-panel--lift ${className}`.trim()}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={panelKeyOpen(onOpen)}
      aria-label={`${label} — bấm để xem đầy đủ`}
    >
      {children}
    </article>
  );
};

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const role = getUserRole();
  const [period, setPeriod] = useState('month');
  const [viewAllSection, setViewAllSection] = useState(null);
  const live = useAdminAnalyticsLiveData(period);
  const {
    overview,
    starDistribution,
    starDetailRows,
    categoryRatings,
    topEvents,
    topClubs,
    allEvents,
    allClubs,
    recentReviews,
    allReviews,
    maxStarCount,
    maxCategoryReviews,
  } = live;

  const previewCategories = categoryRatings.slice(0, ANALYTICS_PREVIEW_LIMITS.categories);
  const previewEvents = topEvents.slice(0, ANALYTICS_PREVIEW_LIMITS.events);
  const previewClubs = topClubs.slice(0, ANALYTICS_PREVIEW_LIMITS.clubs);
  const previewReviews = recentReviews.slice(0, ANALYTICS_PREVIEW_LIMITS.reviews);

  useEffect(() => {
    if (!isAdminRole(role)) {
      showToast?.('Bạn không có quyền truy cập trang quản trị!', 'error');
      navigate('/profile');
    }
  }, [role, navigate, showToast]);

  const handleExport = () => {
    showToast?.('Đang chuẩn bị báo cáo xuất file (mock).', 'info');
  };

  const openSection = (section) => () => setViewAllSection(section);

  if (!isAdminRole(role)) return null;

  return (
    <main className="admin-main">
      <div className="admin-dashboard-grid admin-analytics-grid">
        <header className="admin-page-header admin-analytics-header">
          <div>
            <h1 className="admin-main__title">Đánh giá & Phân tích</h1>
            <p className="admin-page-header__clock">
              Báo cáo hiệu suất và phân tích vận hành · Cập nhật: {formatAdminDateTime(live.now)}
            </p>
          </div>
          <div className="admin-analytics-toolbar">
            <div className="admin-analytics-period" role="tablist" aria-label="Kỳ báo cáo">
              {ADMIN_ANALYTICS_PERIODS.map((opt) => (
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
            <button type="button" className="admin-analytics-export" onClick={handleExport}>
              <IconExport />
              Xuất báo cáo
            </button>
          </div>
        </header>

        <section className="admin-analytics-kpis" aria-label="Chỉ số đánh giá">
          <article className="admin-stat-card admin-analytics-kpi">
            <p className="admin-stat-card__label">Điểm đánh giá trung bình</p>
            <p className="admin-stat-card__value admin-stat-card__value--primary">
              {overview.avgRating}
              <span className="admin-analytics-kpi__suffix">/{overview.avgRatingMax}</span>
            </p>
            <p className="admin-stat-card__trend admin-stat-card__trend--inline">
              <span aria-hidden="true">↑</span> {overview.trendAvg} {overview.trendCaption}
            </p>
            <StarRating value={overview.avgRating} />
          </article>
          <article className="admin-stat-card admin-analytics-kpi">
            <p className="admin-stat-card__label">Tổng phản hồi</p>
            <p className="admin-stat-card__value">{overview.totalReviews.toLocaleString('vi-VN')}</p>
            <p className="admin-stat-card__trend admin-stat-card__trend--inline">
              <span aria-hidden="true">↑</span> {overview.trendReviews} {overview.trendCaption}
            </p>
          </article>
          <article className="admin-stat-card admin-analytics-kpi">
            <p className="admin-stat-card__label">Tỷ lệ hài lòng (4–5 sao)</p>
            <p className="admin-stat-card__value">{overview.satisfactionRate}%</p>
            <div className="admin-goal-progress">
              <div className="admin-goal-progress__track">
                <span className="admin-goal-progress__fill" style={{ width: `${overview.satisfactionRate}%` }} />
              </div>
            </div>
          </article>
          <article className="admin-stat-card admin-analytics-kpi">
            <p className="admin-stat-card__label">Sự kiện có đánh giá</p>
            <p className="admin-stat-card__value">{overview.reviewedEvents}</p>
            <p className="admin-metric-hero__sub">Trên toàn hệ thống F-Events</p>
          </article>
        </section>

        <section className="admin-analytics-charts">
          <AnalyticsPanel
            section="stars"
            className="admin-panel--chart admin-analytics-panel--stars"
            onOpen={openSection('stars')}
          >
            <PanelHead title="Phân bổ điểm sao" onViewAll={openSection('stars')} />
            <p className="admin-chart-header__sub">Số lượng đánh giá theo mức sao trong kỳ đã chọn</p>
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
                  <span className="admin-analytics-star-bars__count">{row.count.toLocaleString('vi-VN')}</span>
                  <span className="admin-analytics-star-bars__pct">{row.percent}%</span>
                </li>
              ))}
            </ul>
          </AnalyticsPanel>

          <AnalyticsPanel section="categories" className="admin-analytics-panel--categories" onOpen={openSection('categories')}>
            <PanelHead title="Đánh giá theo danh mục" onViewAll={openSection('categories')} />
            <p className="admin-chart-header__sub">Điểm TB và số phản hồi theo danh mục sự kiện</p>
            <ul className="admin-analytics-cat-list">
              {previewCategories.map((cat) => (
                <li key={cat.id} className="admin-analytics-cat-list__item">
                  <div className="admin-analytics-cat-list__head">
                    <span className="admin-analytics-cat-list__name">{cat.label}</span>
                    <span className="admin-analytics-cat-list__avg">{cat.avg}/5</span>
                  </div>
                  <div className="admin-analytics-cat-list__track">
                    <span
                      className="admin-analytics-cat-list__fill"
                      style={{ width: `${(cat.reviews / maxCategoryReviews) * 100}%` }}
                    />
                  </div>
                  <span className="admin-analytics-cat-list__reviews">{cat.reviews} phản hồi</span>
                </li>
              ))}
            </ul>
          </AnalyticsPanel>
        </section>

        <section className="admin-analytics-tables">
          <AnalyticsPanel section="events" className="admin-analytics-panel--table" onOpen={openSection('events')}>
            <PanelHead title="Top sự kiện được đánh giá cao" onViewAll={openSection('events')} />
            <div className="admin-analytics-table-wrap">
              <table className="admin-analytics-table">
                <thead>
                  <tr>
                    <th>Sự kiện</th>
                    <th>Đơn vị tổ chức</th>
                    <th>Danh mục</th>
                    <th>Điểm TB</th>
                    <th>Phản hồi</th>
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
                        <StarRating value={row.rating} />
                        <span className="admin-analytics-table__rating-num">{row.rating}</span>
                      </td>
                      <td>{row.reviews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AnalyticsPanel>

          <AnalyticsPanel section="clubs" className="admin-analytics-panel--table" onOpen={openSection('clubs')}>
            <PanelHead title="CLB nhiều phản hồi nhất" onViewAll={openSection('clubs')} />
            <div className="admin-analytics-table-wrap">
              <table className="admin-analytics-table">
                <thead>
                  <tr>
                    <th>Mã CLB</th>
                    <th>Tên câu lạc bộ</th>
                    <th>Điểm TB</th>
                    <th>Phản hồi</th>
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
                        <StarRating value={row.avg} />
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
        >
          <PanelHead title="Đánh giá gần đây" onViewAll={openSection('reviews')} />
          <ul className="admin-activity-list admin-analytics-review-list">
            {previewReviews.map((review) => (
              <li key={review.id} className="admin-activity-item admin-activity-item--primary">
                <p className="admin-activity-item__time">{review.time}</p>
                <p className="admin-activity-item__actor">
                  {review.user} · {review.event}
                </p>
                <div className="admin-analytics-review-meta">
                  <StarRating value={review.stars} />
                  <span className="admin-analytics-review-stars-label">{review.stars}/5</span>
                </div>
                <p className="admin-activity-item__message">{review.excerpt}</p>
              </li>
            ))}
          </ul>
        </AnalyticsPanel>
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
      />
    </main>
  );
};

export default AdminAnalytics;
