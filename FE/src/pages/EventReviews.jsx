import React, { useState } from 'react';
import StudentDashboardLayout from '../components/StudentDashboardLayout';
import { pendingReviews, completedReviews } from '../data/studentMockData';

const EventReviews = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});

  const handleSubmit = (id) => {
    if (!ratings[id]) {
      showToast?.('Vui lòng chọn số sao đánh giá.', 'error');
      return;
    }
    showToast?.('Cảm ơn bạn! Đánh giá đã được gửi.', 'success');
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
          Chờ đánh giá ({pendingReviews.length})
        </button>
        <button
          type="button"
          className={`student-tab ${activeTab === 'completed' ? 'student-tab--active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Đã đánh giá ({completedReviews.length})
        </button>
      </div>

      {activeTab === 'pending' ? (
        <div className="student-review-grid">
          {pendingReviews.map((review) => (
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
                <button type="button" className="primary-button" onClick={() => handleSubmit(review.id)}>
                  Gửi đánh giá
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="student-review-done-list">
          {completedReviews.map((review) => (
            <article key={review.id} className="student-review-done">
              <div>
                <h3>{review.title}</h3>
                <p>{review.date}</p>
              </div>
              <div className="student-stars student-stars--readonly">
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </div>
              <p>{review.comment}</p>
            </article>
          ))}
        </div>
      )}
    </StudentDashboardLayout>
  );
};

export default EventReviews;
