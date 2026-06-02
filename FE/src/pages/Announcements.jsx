import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnnouncementsLayout from '../components/AnnouncementsLayout';
import { fetchPublicAnnouncements } from '../services/announcementApi';
import {
  applyReadState,
  markAllAnnouncementsRead,
} from '../utils/announcementReadState';

const filters = ['Tất cả', 'Chưa đọc', 'Quan trọng'];

const BellIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
      fill="currentColor"
    />
  </svg>
);

const Announcements = ({ showToast }) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchPublicAnnouncements();
      setItems(applyReadState(list));
    } catch (err) {
      showToast?.(err.message || 'Không tải được thông báo.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'Chưa đọc') return items.filter((item) => item.unread);
    if (activeFilter === 'Quan trọng') return items.filter((item) => item.important);
    return items;
  }, [activeFilter, items]);

  const unreadCount = items.filter((item) => item.unread).length;
  const importantCount = items.filter((item) => item.important).length;

  const markAllRead = () => {
    markAllAnnouncementsRead(items.map((item) => item.id));
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
    showToast?.('Đã đánh dấu tất cả thông báo là đã đọc.', 'success');
  };

  return (
    <AnnouncementsLayout
      title="Thông báo từ Nhà trường"
      subtitle="Cập nhật các thông tin quan trọng về học tập và sự kiện tại campus."
    >
      {!loading && items.length > 0 && (
        <div className="announcements-stats">
          <div className="announcements-stat">
            <span className="announcements-stat__label">Tổng số</span>
            <span className="announcements-stat__value">{items.length}</span>
          </div>
          <div className={`announcements-stat${unreadCount ? ' announcements-stat--accent' : ''}`}>
            <span className="announcements-stat__label">Chưa đọc</span>
            <span className="announcements-stat__value">{unreadCount}</span>
          </div>
          <div className="announcements-stat">
            <span className="announcements-stat__label">Quan trọng</span>
            <span className="announcements-stat__value">{importantCount}</span>
          </div>
        </div>
      )}

      <div className="announcements-toolbar">
        <div className="announcements-tabs">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`announcements-tab ${activeFilter === filter ? 'announcements-tab--active' : ''}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="announcements-mark-read"
          onClick={markAllRead}
          disabled={loading || items.length === 0 || unreadCount === 0}
        >
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      {loading ? (
        <div className="announcements-loading" aria-busy="true" aria-label="Đang tải thông báo">
          <div className="announcements-skeleton" />
          <div className="announcements-skeleton" />
          <div className="announcements-skeleton" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="announcements-empty">
          <div className="announcements-empty__icon">
            <BellIcon />
          </div>
          <h3>{activeFilter === 'Tất cả' ? 'Chưa có thông báo' : 'Không có thông báo phù hợp'}</h3>
          <p>
            {activeFilter === 'Tất cả'
              ? 'Thông báo từ CTSV sẽ hiển thị tại đây khi được phát hành.'
              : 'Thử chọn bộ lọc khác hoặc quay lại tab Tất cả.'}
          </p>
        </div>
      ) : (
        <div className="announcements-list">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`announcements-card ${item.unread ? 'announcements-card--unread' : ''}`}
              onClick={() => navigate(`/announcements/${item.id}`)}
            >
              <div className="announcements-card__icon" aria-hidden="true">
                <BellIcon />
              </div>
              <div className="announcements-card__body">
                <div className="announcements-card__head">
                  <span className="announcements-card__title">{item.title}</span>
                  {item.unread && <span className="announcements-card__unread-dot" aria-label="Chưa đọc" />}
                </div>
                <p className="announcements-card__excerpt">{item.excerpt}</p>
                <div className="announcements-card__meta">
                  {item.important && (
                    <span className="announcements-detail__badge announcements-detail__badge--important">
                      Quan trọng
                    </span>
                  )}
                  <span className="announcements-card__category">{item.category}</span>
                  <span>Từ: {item.sender}</span>
                  <span>•</span>
                  <span>{item.time}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </AnnouncementsLayout>
  );
};

export default Announcements;
