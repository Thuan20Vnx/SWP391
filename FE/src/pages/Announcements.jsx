import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentDashboardLayout from '../components/StudentDashboardLayout';
import { announcements } from '../data/studentMockData';

const filters = ['Tất cả', 'Chưa đọc', 'Quan trọng'];

const Announcements = ({ showToast }) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('Chưa đọc');
  const [items, setItems] = useState(announcements);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'Chưa đọc') return items.filter((item) => item.unread);
    if (activeFilter === 'Quan trọng') return items.filter((item) => item.important);
    return items;
  }, [activeFilter, items]);

  const markAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
    showToast?.('Đã đánh dấu tất cả thông báo là đã đọc.', 'success');
  };

  return (
    <StudentDashboardLayout
      activeMenu="announcements"
      pageTitle="Thông báo từ Nhà trường"
      pageSubtitle="Cập nhật các thông tin quan trọng về học tập và sự kiện tại campus."
      showToast={showToast}
    >
      <div className="student-page-actions">
        <button type="button" className="student-outline-btn" onClick={markAllRead}>
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      <div className="student-tabs">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`student-tab ${activeFilter === filter ? 'student-tab--active' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="student-announcement-list">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`student-announcement-item ${item.unread ? 'student-announcement-item--unread' : ''}`}
            onClick={() => navigate(`/announcements/${item.id}`)}
          >
            <div className="student-announcement-item__icon" aria-hidden="true">🔔</div>
            <div className="student-announcement-item__body">
              <div className="student-announcement-item__title-row">
                {item.urgent && <span className="student-badge student-badge--danger">KHẨN</span>}
                {item.important && !item.urgent && <span className="student-badge student-badge--warning">Quan trọng</span>}
                <strong>{item.title}</strong>
              </div>
              <p>{item.excerpt}</p>
              <div className="student-announcement-item__meta">
                <span>Từ: {item.sender}</span>
                <span>•</span>
                <span>{item.time}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </StudentDashboardLayout>
  );
};

export default Announcements;
