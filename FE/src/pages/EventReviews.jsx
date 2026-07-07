import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentDashboardLayout from '../components/StudentDashboardLayout';
import { API_BASE, getAuthHeaders } from '../utils/api';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80';

const RATING_LABELS = {
  1: 'Rất tệ',
  2: 'Chưa tốt',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Tuyệt vời',
};

const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const RatingIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 17.3 6.2 20.5l1.1-6.5L2.5 9.4l6.5-.9L12 2.6l3 5.9 6.5.9-4.8 4.6 1.1 6.5z" />
  </svg>
);

const EventReviews = ({ showToast }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});

  const loadReviews = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/user/event-reviews?tab=${activeTab}`, {
      headers: getAuthHeaders(false),
    })
      .then((res) => {
        if (res.status === 401) {
          navigate('/login');
          return Promise.reject(new Error('Unauthorized'));
        }
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setItems(data.items || []);
          setCounts(data.counts || { pending: 0, completed: 0 });
        } else {
          setItems([]);
        }
      })
      .catch((err) => {
        if (err.message !== 'Unauthorized') {
          showToast?.('Không thể tải danh sách đánh giá.', 'error');
        }
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [activeTab, navigate, showToast]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleSubmit = async (eventId) => {
    if (!ratings[eventId]) {
      showToast?.('Vui lòng chọn số sao đánh giá.', 'error');
      return;
    }

    setSubmittingId(eventId);
    try {
      const res = await fetch(`${API_BASE}/api/events/${eventId}/review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          rating: ratings[eventId],
          comment: comments[eventId] || '',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast?.(data.message || 'Không thể gửi đánh giá.', 'error');
        return;
      }

      showToast?.(data.message || 'Cảm ơn bạn! Đánh giá đã được gửi.', 'success');
      setRatings((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
      setComments((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
      setActiveTab('completed');
    } catch {
      showToast?.('Không thể gửi đánh giá.', 'error');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <StudentDashboardLayout
      activeMenu="reviews"
      pageTitle="Đánh giá sự kiện"
      pageSubtitle="Chia sẻ trải nghiệm của bạn để giúp chúng tôi cải thiện chất lượng các hoạt động sinh viên."
      showToast={showToast}
    >
      <div className="student-tabs">
        <button
          type="button"
          className={`student-tab ${activeTab === 'pending' ? 'student-tab--active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Chờ đánh giá ({counts.pending})
        </button>
        <button
          type="button"
          className={`student-tab ${activeTab === 'completed' ? 'student-tab--active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Đã đánh giá ({counts.completed})
        </button>
      </div>

      {loading ? (
        <div className="student-review-loading">
          <span className="student-review-spinner" aria-hidden="true" />
          <p>Đang tải danh sách đánh giá...</p>
        </div>
      ) : activeTab === 'pending' ? (
        items.length === 0 ? (
          <div className="student-review-empty">
            <RatingIcon />
            <h3>Chưa có sự kiện cần đánh giá</h3>
            <p>Tham gia và hoàn thành các sự kiện để chia sẻ trải nghiệm của bạn tại đây.</p>
          </div>
        ) : (
          <div className="student-review-grid">
            {items.map((review) => {
              const current = ratings[review.id] || 0;
              return (
                <article key={review.id} className="student-review-card">
                  <div className="student-review-card__media">
                    <img
                      src={review.image || FALLBACK_IMAGE}
                      alt=""
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
                    />
                    {review.tags?.length ? (
                      <span className="student-review-card__badge">{review.tags[0]}</span>
                    ) : null}
                  </div>
                  <div className="student-review-card__body">
                    <div className="student-review-card__head">
                      <h3>{review.title}</h3>
                      <p className="student-review-card__meta">
                        <CalendarIcon />
                        {review.date}
                      </p>
                    </div>

                    <div className="student-review-card__rate">
                      <span className="student-review-card__rate-label">
                        {RATING_LABELS[current] || 'Chọn mức đánh giá'}
                      </span>
                      <div className="student-stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={`student-star ${current >= star ? 'student-star--active' : ''}`}
                            onClick={() => setRatings((prev) => ({ ...prev, [review.id]: star }))}
                            aria-label={`${star} sao`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      className="student-review-input"
                      placeholder="Chia sẻ trải nghiệm của bạn về sự kiện này..."
                      value={comments[review.id] || ''}
                      onChange={(e) => setComments((prev) => ({ ...prev, [review.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="student-review-submit"
                      disabled={submittingId === review.id}
                      onClick={() => handleSubmit(review.id)}
                    >
                      {submittingId === review.id ? 'Đang gửi...' : 'Gửi đánh giá'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : items.length === 0 ? (
        <div className="student-review-empty">
          <RatingIcon />
          <h3>Chưa có đánh giá nào</h3>
          <p>Những sự kiện bạn đã đánh giá sẽ được lưu lại ở đây.</p>
        </div>
      ) : (
        <div className="student-review-done-list">
          {items.map((review) => (
            <article key={review.id} className="student-review-done">
              <div className="student-review-done__top">
                <div>
                  <h3>{review.title}</h3>
                  <p className="student-review-card__meta">
                    <CalendarIcon />
                    {review.date}
                  </p>
                </div>
                <div className="student-review-done__score">
                  <div className="student-stars student-stars--readonly">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={star <= review.rating ? 'is-on' : 'is-off'}>★</span>
                    ))}
                  </div>
                  <span className="student-review-done__value">{review.rating}/5</span>
                </div>
              </div>
              {review.comment ? (
                <p className="student-review-done__comment">{review.comment}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </StudentDashboardLayout>
  );
};

export default EventReviews;
