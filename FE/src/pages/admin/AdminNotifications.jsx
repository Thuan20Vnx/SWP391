import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useNotifications from '../../hooks/useNotifications';
import { mapSysNotif } from '../../utils/notificationLinks';
import { NOTIFICATION_TONE_META, NotificationToneIcon } from '../../utils/notificationTone.jsx';
import '../../styles/notifications.css';
import '../ctsv/CtsvNotifications.css';

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unread', label: 'Chưa đọc' },
];

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const AdminNotifications = () => {
  const navigate = useNavigate();
  const { notifications, markRead, markAllRead, deleteOne, deleteAll, loading } = useNotifications();
  const [filter, setFilter] = useState('all');

  const items = useMemo(
    () => notifications.map((n) => mapSysNotif(n, 'admin')),
    [notifications]
  );

  const unreadCount = items.filter((n) => n.unread).length;

  const filtered = useMemo(
    () => (filter === 'unread' ? items.filter((n) => n.unread) : items),
    [items, filter]
  );

  const handleClick = (item) => {
    markRead(item._sysId);
    if (item.link) navigate(item.link);
  };

  const handleDelete = (item) => {
    if (!window.confirm('Xóa thông báo này? Bạn sẽ không thể xem lại.')) return;
    deleteOne(item._sysId);
  };

  const handleDeleteAll = () => {
    if (!items.length) return;
    if (!window.confirm('Xóa tất cả thông báo? Bạn sẽ không thể xem lại.')) return;
    deleteAll();
  };

  return (
    <div className="ctsv-notifications-page">
      <header className="ctsv-events-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">Thông báo hệ thống</span>
          <h1>Thông báo Admin</h1>
          <p>Hoạt động quản trị hệ thống: tài khoản, phê duyệt, đối tác, tất toán và các sự kiện liên quan.</p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : items.length}</span>
            <span className="ctsv-events-hero-stat-label">Tổng thông báo</span>
          </div>
          <div className="ctsv-notifications-actions">
            {unreadCount > 0 && (
              <button type="button" className="ctsv-notifications-mark-all" onClick={markAllRead}>
                Đánh dấu tất cả đã đọc
              </button>
            )}
            {items.length > 0 && (
              <button type="button" className="ctsv-notifications-mark-all ctsv-notifications-mark-all--danger" onClick={handleDeleteAll}>
                Xóa tất cả
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="events-page__state-filters" role="group" aria-label="Lọc thông báo">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`events-page__state-pill ${filter === f.id ? 'is-active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {f.id === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      <div className="ctsv-notifications-card">
        {loading ? (
          <p className="ctsv-muted ctsv-notifications-loading">Đang tải thông báo…</p>
        ) : filtered.length === 0 ? (
          <div className="header-notif-empty">
            <span className="header-notif-empty__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="40" height="40">
                <path
                  d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"
                  fill="currentColor"
                  opacity="0.35"
                />
              </svg>
            </span>
            <strong>{filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Không có thông báo nào'}</strong>
            <p>Bạn sẽ nhận cập nhật tại đây khi có hoạt động mới.</p>
          </div>
        ) : (
          <ul className="header-notif-list ctsv-notifications-list">
            {filtered.map((item) => {
              const toneMeta = NOTIFICATION_TONE_META[item.tone] || NOTIFICATION_TONE_META.info;
              return (
                <li key={item.id} className="ctsv-notifications-row">
                  <div
                    role="button"
                    tabIndex={0}
                    className={`header-notif-item${item.unread ? ' header-notif-item--unread' : ''} header-notif-item--${item.tone || 'info'}`}
                    onClick={() => handleClick(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClick(item);
                      }
                    }}
                  >
                    <span className={`header-notif-item__tone header-notif-item__tone--${item.tone || 'info'}`}>
                      <NotificationToneIcon tone={item.tone} />
                    </span>
                    <span className="header-notif-item__body">
                      <span className="header-notif-item__top">
                        <span className="header-notif-item__title">{item.title}</span>
                        {item.unread && <span className="header-notif-item__new">Mới</span>}
                      </span>
                      <span className="header-notif-item__text">{item.body}</span>
                      <span className="header-notif-item__meta">
                        <span className={`header-notif-item__chip header-notif-item__chip--${item.tone || 'info'}`}>
                          {item.toneLabel || toneMeta.label}
                        </span>
                        <span className="header-notif-item__time">{item.time}</span>
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="ctsv-notifications-delete"
                    aria-label="Xóa thông báo"
                    title="Xóa thông báo"
                    onClick={() => handleDelete(item)}
                  >
                    <TrashIcon />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;
