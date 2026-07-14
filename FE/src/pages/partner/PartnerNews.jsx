import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { fetchPublicAnnouncements } from '../../services/announcementApi';
import { applyReadState } from '../../utils/announcementReadState';
import '../../styles/announcements-page.css';

const FILTERS = ['Tất cả', 'Chưa đọc', 'Quan trọng'];

const BellIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
      fill="currentColor"
    />
  </svg>
);

/**
 * Tin tức chung toàn trường cho đối tác (chỉ đọc).
 * Tách riêng với "Thông báo" ở sidebar (kênh trao đổi riêng của đối tác với CTSV).
 */
const PartnerNews = () => {
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchPublicAnnouncements();
      setItems(applyReadState(list));
    } catch (err) {
      showToast?.(err.message || 'Không tải được tin tức.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = items;
    if (activeFilter === 'Chưa đọc') list = list.filter((i) => i.unread);
    else if (activeFilter === 'Quan trọng') list = list.filter((i) => i.important);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((i) =>
      [i.title, i.excerpt, i.category, i.sender]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [items, activeFilter, searchQuery]);

  return (
    <div className="announcements-page announcements-page--embedded">
      <main className="announcements-page__main">
        <div className="announcements-page__container">
          <div className="announcements-page__hero">
            <h1 className="announcements-page__title">Tin tức toàn trường</h1>
            <p className="announcements-page__subtitle">
              Cập nhật thông tin, thông báo chung từ Nhà trường và CTSV dành cho tất cả đơn vị.
            </p>
          </div>

          <div className="announcements-toolbar">
            <input
              type="search"
              className="partner-news-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tin tức theo tiêu đề, chủ đề…"
              aria-label="Tìm tin tức"
            />
            <div className="announcements-tabs" role="group" aria-label="Lọc tin tức">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`announcements-tab ${activeFilter === f ? 'announcements-tab--active' : ''}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="announcements-loading" aria-busy="true" aria-label="Đang tải tin tức">
              <div className="announcements-skeleton" />
              <div className="announcements-skeleton" />
              <div className="announcements-skeleton" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="announcements-empty">
              <div className="announcements-empty__icon">
                <BellIcon />
              </div>
              <h3>{activeFilter === 'Tất cả' ? 'Chưa có tin tức' : 'Không có tin tức phù hợp'}</h3>
              <p>
                {activeFilter === 'Tất cả'
                  ? 'Tin tức từ Nhà trường và CTSV sẽ hiển thị tại đây khi được phát hành.'
                  : 'Thử chọn bộ lọc khác hoặc quay lại tab Tất cả.'}
              </p>
            </div>
          ) : (
            <div className="announcements-list">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`announcements-card ${item.unread ? 'announcements-card--unread' : ''}`}
                  onClick={() => navigate(`/partner/news/${item.id}`)}
                >
                  <div className="announcements-card__icon" aria-hidden="true">
                    <BellIcon />
                  </div>
                  <div className="announcements-card__body">
                    <div className="announcements-card__head">
                      <span className="announcements-card__title">{item.title}</span>
                      {item.unread && (
                        <span className="announcements-card__unread-dot" aria-label="Chưa đọc" />
                      )}
                    </div>
                    <p className="announcements-card__excerpt">{item.excerpt}</p>
                    <div className="announcements-card__meta">
                      {item.important && (
                        <span className="announcements-detail__badge announcements-detail__badge--important">
                          Quan trọng
                        </span>
                      )}
                      {item.category && <span className="announcements-card__category">{item.category}</span>}
                      {item.sender && <span>Từ: {item.sender}</span>}
                      {item.time && (
                        <>
                          <span>•</span>
                          <span>{item.time}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PartnerNews;
