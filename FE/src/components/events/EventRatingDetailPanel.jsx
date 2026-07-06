import React, { useEffect, useState } from 'react';
import BentoStarRating from './BentoStarRating';
import { fetchEventRatingStats } from '../../services/eventRatingStatsApi';

const formatReviewDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const EventRatingDetailPanel = ({ eventId, eventTitle, fallbackStats }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchEventRatingStats(eventId)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || 'Tải thất bại.');
          setStats(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const averageRating = stats?.averageRating ?? fallbackStats?.value ?? 0;
  const reviewCount = stats?.reviewCount ?? fallbackStats?.count ?? 0;
  const distribution = stats?.distribution || [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 }));
  const reviews = stats?.reviews || stats?.recentReviews || [];
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <div className="ev-rating-panel">
      <div className="ev-rating-panel__header">
        <div>
          <p className="ev-rating-panel__eyebrow">Thống kê đánh giá</p>
          <h2 className="ev-rating-panel__title">{eventTitle || stats?.title || 'Sự kiện'}</h2>
        </div>
      </div>

      {loading && <p className="ev-rating-panel__hint">Đang tải dữ liệu đánh giá…</p>}
      {error && !loading && <p className="ev-rating-panel__error">{error}</p>}

      {!loading && !error && (
        <div className="ev-rating-panel__layout">
          <section className="ev-rating-panel__summary-card">
            <div className="ev-rating-panel__score">
              <span className="ev-rating-panel__score-num">
                {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
              </span>
              <BentoStarRating value={averageRating} />
            </div>
            <p className="ev-rating-panel__count">
              <strong>{reviewCount}</strong> lượt đánh giá
            </p>

            <div className="ev-rating-panel__chart" aria-label="Phân bố điểm đánh giá">
              {distribution.map((row) => (
                <div key={row.stars} className="ev-rating-chart-row">
                  <span className="ev-rating-chart-row__label">{row.stars} sao</span>
                  <div className="ev-rating-chart-row__track">
                    <div
                      className="ev-rating-chart-row__fill"
                      style={{ width: `${(row.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="ev-rating-chart-row__count">{row.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="ev-rating-panel__reviews">
            <div className="ev-rating-panel__reviews-head">
              <h3>Danh sách người đánh giá</h3>
              <span>{reviews.length} / {reviewCount}</span>
            </div>

            {reviews.length === 0 ? (
              <div className="ev-rating-panel__empty">
                <div className="ev-rating-panel__empty-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 2l2.9 6.1 6.8.6-5.1 4.5 1.5 6.7L12 17.8 5.9 19.9l1.5-6.7L2.3 8.7l6.8-.6L12 2z" />
                  </svg>
                </div>
                <p className="ev-rating-panel__empty-title">Chưa có đánh giá</p>
                <p className="ev-rating-panel__empty-desc">
                  Sinh viên tham gia sự kiện có thể đánh giá sau khi check-in hoặc khi sự kiện kết thúc.
                </p>
              </div>
            ) : (
              <div className="ev-rating-panel__table-wrap">
                <table className="ev-table ev-rating-panel__table">
                  <thead>
                    <tr>
                      <th>Người đánh giá</th>
                      <th>MSSV</th>
                      <th>Điểm</th>
                      <th>Nhận xét</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((review) => (
                      <tr key={review.id || `${review.authorName}-${review.createdAt}`}>
                        <td>
                          <div className="ev-rating-panel__author">
                            <strong>{review.authorName}</strong>
                            {review.authorEmail && (
                              <span className="ev-rating-panel__email">{review.authorEmail}</span>
                            )}
                          </div>
                        </td>
                        <td>{review.studentId || '—'}</td>
                        <td>
                          <span className="ev-rating-panel__stars">{review.rating}/5 ★</span>
                        </td>
                        <td className="ev-rating-panel__comment">
                          {review.comment?.trim() ? review.comment : 'Không có nhận xét.'}
                        </td>
                        <td className="ev-rating-panel__time">{formatReviewDate(review.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default EventRatingDetailPanel;
