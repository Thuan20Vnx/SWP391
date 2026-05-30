import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ADMIN_HEADER_NOTIFICATIONS,
  HEADER_NOTIFICATIONS,
} from '../data/headerNotificationsData';

const toneClass = {
  info: 'header-notif-item--info',
  warning: 'header-notif-item--warning',
  success: 'header-notif-item--success',
  alert: 'header-notif-item--alert',
};

const HeaderNotificationPanel = ({ open, onClose, isAdmin = false }) => {
  const seed = useMemo(
    () => (isAdmin ? ADMIN_HEADER_NOTIFICATIONS : HEADER_NOTIFICATIONS),
    [isAdmin],
  );
  const [items, setItems] = useState(seed);

  useEffect(() => {
    setItems(seed);
  }, [seed]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const unreadCount = items.filter((n) => n.unread).length;

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <>
      <div className="header-notif-backdrop" onClick={onClose} role="presentation" />
      <div
        className="header-notif-panel"
        role="dialog"
        aria-label="Thông báo"
        aria-modal="true"
      >
        <header className="header-notif-panel__head">
          <div>
            <h3 className="header-notif-panel__title">Thông báo</h3>
            {unreadCount > 0 && (
              <p className="header-notif-panel__sub">{unreadCount} chưa đọc</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button type="button" className="header-notif-panel__mark" onClick={markAllRead}>
              Đánh dấu đã đọc
            </button>
          )}
        </header>

        <ul className="header-notif-list">
          {items.length === 0 ? (
            <li className="header-notif-empty">Không có thông báo mới.</li>
          ) : (
            items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`header-notif-item${item.unread ? ' header-notif-item--unread' : ''} ${toneClass[item.tone] || ''}`}
                  onClick={() => {
                    setItems((prev) =>
                      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n)),
                    );
                  }}
                >
                  <span className="header-notif-item__dot" aria-hidden="true" />
                  <span className="header-notif-item__body">
                    <span className="header-notif-item__title">{item.title}</span>
                    <span className="header-notif-item__text">{item.body}</span>
                    <span className="header-notif-item__time">{item.time}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        <footer className="header-notif-panel__foot">
          <Link to="/announcements" className="header-notif-panel__link" onClick={onClose}>
            Xem tất cả thông báo
          </Link>
        </footer>
      </div>
    </>
  );
};

export default HeaderNotificationPanel;
