import React, { useEffect, useState } from 'react';
import BentoStarRating from './BentoStarRating';
import { fetchEventRatingStats } from '../../services/eventRatingStatsApi';

const EventRatingStatsModal = ({ open, eventId, eventTitle, fallbackStats, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !eventId) return undefined;
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
  }, [open, eventId]);

  if (!open) return null;

  const averageRating = stats?.averageRating ?? fallbackStats?.value ?? 0;
  const reviewCount = stats?.reviewCount ?? fallbackStats?.count ?? 0;
  const distribution = stats?.distribution || [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 }));
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <div className="ev-rating-modal" role="dialog" aria-modal="true" aria-labelledby="ev-rating-modal-title">
      <div className="ev-rating-modal__backdrop" onClick={onClose} aria-hidden />
      <div className="ev-rating-modal__panel">
        <button type="button" className="ev-rating-modal__close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
        <p className="ev-rating-modal__eyebrow">Thống kê đánh giá</p>
        <h2 id="ev-rating-modal-title" className="ev-rating-modal__title">
          {eventTitle || stats?.title || 'Sự kiện'}
        </h2>

        {loading && <p className="ev-rating-modal__hint">Đang tải dữ liệu…</p>}
        {error && !loading && <p className="ev-rating-modal__error">{error}</p>}

        {!loading && (
          <>
            <div className="ev-rating-modal__summary">
              <div className="ev-rating-modal__score">
                <span className="ev-rating-modal__score-num">
                  {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
                </span>
                <BentoStarRating value={averageRating} />
              </div>
              <p className="ev-rating-modal__count">
                <strong>{reviewCount}</strong> lượt đánh giá
              </p>
            </div>

            <div className="ev-rating-modal__chart" aria-label="Phân bố điểm đánh giá">
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

            {stats?.recentReviews?.length > 0 && (
              <div className="ev-rating-modal__recent">
                <h3>Đánh giá gần đây</h3>
                <ul>
                  {stats.recentReviews.map((review, idx) => (
                    <li key={`${review.authorName}-${idx}`}>
                      <div className="ev-rating-review-head">
                        <strong>{review.authorName}</strong>
                        <span>{review.rating}/5 ★</span>
                      </div>
                      {review.comment?.trim() ? (
                        <p>{review.comment}</p>
                      ) : (
                        <p className="ev-rating-modal__muted">Không có nhận xét.</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reviewCount === 0 && (
              <p className="ev-rating-modal__hint">Chưa có lượt đánh giá nào cho sự kiện này.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EventRatingStatsModal;
