import React, { useEffect, useMemo, useState } from 'react';
import { ANALYTICS_VIEW_ALL_META } from '../../data/adminAnalyticsData';

const IconStar = ({ filled, size = 14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
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
  <span className="admin-analytics-stars" aria-hidden="true">
    {Array.from({ length: max }, (_, i) => (
      <span key={i} className={i < Math.round(value) ? 'admin-analytics-stars__on' : ''}>
        <IconStar filled={i < Math.round(value)} />
      </span>
    ))}
  </span>
);

const AdminAnalyticsViewAllModal = ({
  section,
  open,
  onClose,
  starDistribution = [],
  starDetailRows = [],
  maxStarCount = 1,
  categoryRatings = [],
  maxCategoryReviews = 1,
  allEvents = [],
  allClubs = [],
  allReviews = [],
}) => {
  const [search, setSearch] = useState('');
  const meta = section ? ANALYTICS_VIEW_ALL_META[section] : null;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const q = search.trim().toLowerCase();

  const filteredEvents = useMemo(() => {
    if (!q) return allEvents;
    return allEvents.filter((row) =>
      [row.name, row.org, row.category, String(row.rating), String(row.reviews)].join(' ').toLowerCase().includes(q),
    );
  }, [allEvents, q]);

  const filteredClubs = useMemo(() => {
    if (!q) return allClubs;
    return allClubs.filter((row) =>
      [row.name, row.code, String(row.avg), String(row.reviews)].join(' ').toLowerCase().includes(q),
    );
  }, [allClubs, q]);

  const filteredReviews = useMemo(() => {
    if (!q) return allReviews;
    return allReviews.filter((row) =>
      [row.user, row.event, row.excerpt, row.time, String(row.stars)].join(' ').toLowerCase().includes(q),
    );
  }, [allReviews, q]);

  const filteredCategories = useMemo(() => {
    if (!q) return categoryRatings;
    return categoryRatings.filter((row) =>
      [row.label, String(row.avg), String(row.reviews)].join(' ').toLowerCase().includes(q),
    );
  }, [categoryRatings, q]);

  if (!open || !section || !meta) return null;

  const showSearch = section !== 'stars';
  const resultCount =
    section === 'events'
      ? filteredEvents.length
      : section === 'clubs'
        ? filteredClubs.length
        : section === 'reviews'
          ? filteredReviews.length
          : section === 'categories'
            ? filteredCategories.length
            : starDetailRows.length;

  return (
    <div className="admin-log-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="admin-log-modal admin-analytics-view-modal"
        role="dialog"
        aria-labelledby="admin-analytics-view-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-log-modal__header">
          <div>
            <h2 id="admin-analytics-view-modal-title">{meta.title}</h2>
            <p>{meta.subtitle}</p>
          </div>
          <button type="button" className="admin-log-modal__close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </header>

        {showSearch && (
          <div className="admin-analytics-view-modal__search">
            <div className="admin-log-search admin-analytics-view-modal__search-field">
              <span className="admin-log-search__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <input
                type="search"
                className="admin-log-search__input"
                placeholder="Tìm trong danh sách..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Tìm kiếm"
              />
            </div>
            <span className="admin-analytics-view-modal__count">{resultCount} mục</span>
          </div>
        )}

        <div className="admin-log-modal__table-wrap admin-analytics-view-modal__body">
          {section === 'stars' && (
            <table className="admin-analytics-table admin-analytics-table--modal">
              <thead>
                <tr>
                  <th>Mức sao</th>
                  <th>Số đánh giá</th>
                  <th>Tỷ lệ</th>
                  <th>Sự kiện liên quan</th>
                </tr>
              </thead>
              <tbody>
                {starDetailRows.map((row) => (
                  <tr key={row.stars}>
                    <td>
                      <span className="admin-analytics-star-bars__label">
                        {row.stars} <IconStar filled />
                      </span>
                    </td>
                    <td>
                      <div className="admin-analytics-view-modal__bar-cell">
                        <div className="admin-analytics-star-bars__track">
                          <span
                            className="admin-analytics-star-bars__fill"
                            style={{ width: `${(row.count / maxStarCount) * 100}%` }}
                          />
                        </div>
                        <span>{row.count.toLocaleString('vi-VN')}</span>
                      </div>
                    </td>
                    <td>{row.percent}%</td>
                    <td>{row.events} sự kiện</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {section === 'categories' && (
            <ul className="admin-analytics-cat-list admin-analytics-cat-list--modal">
              {filteredCategories.map((cat) => (
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
          )}

          {section === 'events' && (
            <table className="admin-analytics-table admin-analytics-table--modal">
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
                {filteredEvents.map((row) => (
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
          )}

          {section === 'clubs' && (
            <table className="admin-analytics-table admin-analytics-table--modal">
              <thead>
                <tr>
                  <th>Mã CLB</th>
                  <th>Tên câu lạc bộ</th>
                  <th>Điểm TB</th>
                  <th>Phản hồi</th>
                </tr>
              </thead>
              <tbody>
                {filteredClubs.map((row) => (
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
          )}

          {section === 'reviews' && (
            <ul className="admin-activity-list admin-analytics-review-list admin-analytics-review-list--modal">
              {filteredReviews.map((review) => (
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
          )}
        </div>

        <footer className="admin-log-modal__footer">
          <p className="admin-detail-modal__hint">Dữ liệu mô phỏng · Sẽ kết nối API khi triển khai backend</p>
          <button type="button" className="admin-log-modal__btn-close" onClick={onClose}>
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AdminAnalyticsViewAllModal;
