import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import StudentDashboardLayout from '../components/StudentDashboardLayout';
import { getAnnouncementById } from '../data/studentMockData';

const AnnouncementDetail = ({ showToast }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const announcement = getAnnouncementById(id);

  if (!announcement) {
    return (
      <StudentDashboardLayout
        activeMenu="announcements"
        pageTitle="Không tìm thấy thông báo"
        showToast={showToast}
      >
        <div className="student-empty-state">
          <h3>Thông báo không tồn tại</h3>
          <button type="button" className="primary-button" onClick={() => navigate('/announcements')}>
            Quay lại danh sách
          </button>
        </div>
      </StudentDashboardLayout>
    );
  }

  return (
    <StudentDashboardLayout
      activeMenu="announcements"
      breadcrumbLabel="Chi tiết thông báo"
      showToast={showToast}
    >
      <button type="button" className="student-back-btn" onClick={() => navigate('/announcements')}>
        ← Quay lại danh sách
      </button>

      <article className="student-announcement-detail">
        <header>
          <h1>{announcement.title}</h1>
          <div className="student-announcement-detail__meta">
            <span className="student-badge student-badge--muted">{announcement.category}</span>
            <span>Từ: {announcement.sender}</span>
            <span>•</span>
            <span>{announcement.time}</span>
          </div>
        </header>
        <div className="student-announcement-detail__content">
          {(announcement.body || announcement.excerpt).split('\n\n').map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
      </article>
    </StudentDashboardLayout>
  );
};

export default AnnouncementDetail;
