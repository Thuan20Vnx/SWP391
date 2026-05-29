import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentDashboardLayout from '../components/StudentDashboardLayout';
import { API_BASE, getAuthHeaders } from '../utils/api';

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
        <p className="student-empty-hint">Đang tải...</p>
      ) : activeTab === 'pending' ? (
        items.length === 0 ? (
          <p className="student-empty-hint">
            Bạn chưa có sự kiện nào cần đánh giá. Tham gia sự kiện đã kết thúc để chia sẻ trải nghiệm.
          </p>
        ) : (
          <div className="student-review-grid">
            {items.map((review) => (
              <article key={review.id} className="student-review-card">
                <img src={review.image} alt="" />
                <div>
                  <h3>{review.title}</h3>
                  <p>{review.date}</p>
                  <div className="student-tag-list">
                    {review.tags.map((tag) => (
                      <span key={tag} className="student-tag">{tag}</span>
                    ))}
                  </div>
                  <div className="student-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`student-star ${(ratings[review.id] || 0) >= star ? 'student-star--active' : ''}`}
                        onClick={() => setRatings((prev) => ({ ...prev, [review.id]: star }))}
                        aria-label={`${star} sao`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="student-review-input"
                    placeholder="Chia sẻ trải nghiệm của bạn..."
                    value={comments[review.id] || ''}
                    onChange={(e) => setComments((prev) => ({ ...prev, [review.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="primary-button"
                    disabled={submittingId === review.id}
                    onClick={() => handleSubmit(review.id)}
                  >
                    {submittingId === review.id ? 'Đang gửi...' : 'Gửi đánh giá'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      ) : items.length === 0 ? (
        <p className="student-empty-hint">Bạn chưa đánh giá sự kiện nào.</p>
      ) : (
        <div className="student-review-done-list">
          {items.map((review) => (
            <article key={review.id} className="student-review-done">
              <div>
                <h3>{review.title}</h3>
                <p>{review.date}</p>
              </div>
              <div className="student-stars student-stars--readonly">
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </div>
              {review.comment ? <p>{review.comment}</p> : null}
            </article>
          ))}
        </div>
      )}
    </StudentDashboardLayout>
  );
};

export default EventReviews;
