import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AnnouncementsLayout from '../components/AnnouncementsLayout';
import { getAnnouncementById } from '../data/studentMockData';

const AnnouncementDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const announcement = getAnnouncementById(id);

  if (!announcement) {
    return (
      <AnnouncementsLayout title="Không tìm thấy thông báo">
        <div className="student-empty-state">
          <h3>Thông báo không tồn tại</h3>
          <button type="button" className="primary-button" onClick={() => navigate('/announcements')}>
            Quay lại danh sách
          </button>
        </div>
      </AnnouncementsLayout>
    );
  }

  return (
    <AnnouncementsLayout>
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
    </AnnouncementsLayout>
  );
};

export default AnnouncementDetail;
