import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { Link, useNavigate } from 'react-router-dom';

import {

  ADMIN_HEADER_NOTIFICATIONS,

  CLUB_HEADER_NOTIFICATIONS,

  CTSV_HEADER_NOTIFICATIONS,

  ICPDP_HEADER_NOTIFICATIONS,

  PARTNER_HEADER_NOTIFICATIONS,

} from '../data/headerNotificationsData';

import { fetchPublicAnnouncements } from '../services/announcementApi';
import { getAnnouncementDetailPathForNotifRole } from '../constants/announcementTargets';

import {

  applyReadState,

  markAllAnnouncementsRead,

  markAnnouncementRead,

} from '../utils/announcementReadState';

import { NOTIFICATION_TONE_META, NotificationToneIcon } from '../utils/notificationTone.jsx';
import useNotifications from '../hooks/useNotifications';

import '../styles/notifications.css';

const ROLES_WITH_SYS_NOTIF = ['admin', 'ctsv', 'icpdp', 'club', 'partner'];

const TYPE_TO_TONE = {
  event_submit: 'info',
  event_approve: 'success',
  event_reject: 'alert',
  partner_submit: 'info',
  club_submit: 'info',
};

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
};

const refToLink = (refType, refId, role) => {
  if (!refId) return null;
  if (refType === 'Event') {
    if (role === 'admin') return '/admin/events';
    if (role === 'ctsv') return `/ctsv/events/${refId}`;
    if (role === 'icpdp') return `/icpdp/events/${refId}`;
    return `/events/${refId}`;
  }
  return null;
};

const mapSysNotif = (n, role) => ({
  id: `sys_${n._id || n.id}`,
  _sysId: String(n._id || n.id),
  _isSys: true,
  title: n.title,
  body: n.body || '',
  time: formatRelativeTime(n.createdAt),
  unread: !n.isRead,
  tone: TYPE_TO_TONE[n.type] || 'info',
  toneLabel: 'Hệ thống',
  link: refToLink(n.refType, n.refId, role),
});



const ROLE_CONFIG = {

  public: {

    panelClass: 'header-notif-panel--public',

    subtitle: 'Cập nhật từ Nhà trường',

    allLink: '/announcements',

    allLabel: 'Xem tất cả thông báo',

  },

  admin: {

    panelClass: 'header-notif-panel--admin',

    subtitle: 'Hoạt động hệ thống & quản trị',

    allLink: '/admin/announcements',

    allLabel: 'Quản lý thông báo Admin',

  },

  ctsv: {

    panelClass: 'header-notif-panel--ctsv',

    subtitle: 'Phê duyệt, đối tác & toàn trường',

    allLink: '/ctsv/announcements/publish',

    allLabel: 'Quản lý thông báo chính thức',

  },

  club: {

    panelClass: 'header-notif-panel--club',

    subtitle: 'Trạng thái đề xuất CLB',

    allLink: '/quan-ly-clb/announcements',

    allLabel: 'Đăng thông báo CLB',

  },

  partner: {

    panelClass: 'header-notif-panel--partner',

    subtitle: 'Đề xuất, hợp đồng & phê duyệt',

    allLink: '/partner/announcements',

    allLabel: 'Quản lý thông báo đối tác',

  },

  icpdp: {

    panelClass: 'header-notif-panel--icpdp',

    subtitle: 'Duyệt nội bộ đề xuất CLB',

    allLink: '/icpdp/announcements',

    allLabel: 'Quản lý thông báo IC-PDP',

  },

};



const resolveRole = ({ variant, isAdmin, isClub, isCtsv, isPartner, isIcpdp }) => {

  if (variant) return variant;

  if (isAdmin) return 'admin';

  if (isCtsv) return 'ctsv';

  if (isClub) return 'club';

  if (isPartner) return 'partner';

  if (isIcpdp) return 'icpdp';

  return 'public';

};



const HeaderNotificationPanel = ({

  open,

  onClose,

  panelRef,

  variant,

  isAdmin = false,

  isClub = false,

  isCtsv = false,

  isPartner = false,

  isIcpdp = false,

  onUnreadCountChange,

}) => {

  const navigate = useNavigate();

  const role = resolveRole({ variant, isAdmin, isClub, isCtsv, isPartner, isIcpdp });

  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.public;

  const useLiveAnnouncements = true;

  const hasSysNotif = ROLES_WITH_SYS_NOTIF.includes(role);

  const {
    notifications: sysNotifs,
    markRead: sysMarkRead,
    markAllRead: sysMarkAllRead,
  } = useNotifications();



  const seed = useMemo(() => {

    if (role === 'admin') return ADMIN_HEADER_NOTIFICATIONS;

    if (role === 'club') return CLUB_HEADER_NOTIFICATIONS;

    if (role === 'ctsv') return CTSV_HEADER_NOTIFICATIONS;

    if (role === 'partner') return PARTNER_HEADER_NOTIFICATIONS;

    if (role === 'icpdp') return ICPDP_HEADER_NOTIFICATIONS;

    return [];

  }, [role]);



  const [annItems, setAnnItems] = useState(seed);



  const loadPublicAnnouncements = useCallback(async () => {
    try {
      const list = applyReadState(await fetchPublicAnnouncements(8));
      setAnnItems(
        list.map((a) => ({
          id: a.id,
          title: a.title,
          body: a.excerpt,
          time: a.time,
          unread: a.unread,
          tone: a.notificationTone || (a.urgent ? 'alert' : a.important ? 'warning' : 'info'),
          toneLabel: a.noticeCategoryLabel || null,
          link: getAnnouncementDetailPathForNotifRole(role, a.id),
        })),
      );
    } catch {
      setAnnItems([]);
    }
  }, [role]);



  useEffect(() => {

    if (useLiveAnnouncements) {

      loadPublicAnnouncements();

      return;

    }

    setAnnItems(seed);

  }, [seed, useLiveAnnouncements, loadPublicAnnouncements]);



  useEffect(() => {

    if (!open || !useLiveAnnouncements) return;

    loadPublicAnnouncements();

  }, [open, useLiveAnnouncements, loadPublicAnnouncements]);

  const sysItems = useMemo(
    () => (hasSysNotif ? sysNotifs.map((n) => mapSysNotif(n, role)) : []),
    [sysNotifs, hasSysNotif, role],
  );

  const items = useMemo(
    () => [...sysItems, ...annItems],
    [sysItems, annItems],
  );



  useEffect(() => {

    if (!open) return undefined;

    const onKey = (e) => {

      if (e.key === 'Escape') onClose();

    };

    document.addEventListener('keydown', onKey);

    return () => document.removeEventListener('keydown', onKey);

  }, [open, onClose]);



  const unreadCount = items.filter((n) => n.unread).length;



  useEffect(() => {

    onUnreadCountChange?.(unreadCount);

  }, [unreadCount, onUnreadCountChange]);



  if (!open) return null;



  const markAllRead = () => {

    if (useLiveAnnouncements) {

      markAllAnnouncementsRead(annItems.map((n) => n.id));

    }

    setAnnItems((prev) => prev.map((n) => ({ ...n, unread: false })));

    if (hasSysNotif) sysMarkAllRead();

  };



  const handleItemClick = (item) => {

    if (item._isSys) {
      sysMarkRead(item._sysId);
    } else if (useLiveAnnouncements) {
      markAnnouncementRead(item.id);
      setAnnItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n)));
    }

    if (item.link) {

      onClose();

      navigate(item.link);

      return;

    }



    if (role === 'admin') {

      onClose();

      navigate('/admin/events');

    } else if (role === 'club') {

      onClose();

      navigate('/quan-ly-clb');

    }

  };



  return createPortal(

    <>

      <div className="header-notif-backdrop" onClick={onClose} role="presentation" aria-hidden="true" />

      <div

        ref={panelRef}

        className={`header-notif-panel ${roleConfig.panelClass}`}

        role="dialog"

        aria-label="Thông báo"

        aria-modal="true"

        onMouseDown={(e) => e.stopPropagation()}

      >

        <header className="header-notif-panel__head">

          <div className="header-notif-panel__head-main">

            <div className="header-notif-panel__title-row">

              <span className="header-notif-panel__icon" aria-hidden="true">

                <svg viewBox="0 0 24 24" width="20" height="20">

                  <path

                    d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"

                    fill="currentColor"

                  />

                </svg>

              </span>

              <div>

                <h3 className="header-notif-panel__title">Thông báo</h3>

                <p className="header-notif-panel__role-sub">{roleConfig.subtitle}</p>

              </div>

            </div>

            {unreadCount > 0 && (

              <span className="header-notif-panel__count-pill">{unreadCount} chưa đọc</span>

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

            <li className="header-notif-empty">

              <span className="header-notif-empty__icon" aria-hidden="true">

                <svg viewBox="0 0 24 24" width="40" height="40">

                  <path

                    d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"

                    fill="currentColor"

                    opacity="0.35"

                  />

                </svg>

              </span>

              <strong>Không có thông báo mới</strong>

              <p>Bạn sẽ nhận cập nhật tại đây khi có hoạt động mới.</p>

            </li>

          ) : (

            items.map((item) => {

              const toneMeta = NOTIFICATION_TONE_META[item.tone] || NOTIFICATION_TONE_META.info;

              return (

                <li key={item.id}>

                  <button

                    type="button"

                    className={`header-notif-item${item.unread ? ' header-notif-item--unread' : ''} header-notif-item--${item.tone || 'info'}`}

                    onClick={() => handleItemClick(item)}

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

                  </button>

                </li>

              );

            })

          )}

        </ul>



        <footer className="header-notif-panel__foot">

          <Link to={roleConfig.allLink} className="header-notif-panel__link" onClick={onClose}>

            {roleConfig.allLabel}

            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">

              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" fill="currentColor" />

            </svg>

          </Link>

        </footer>

      </div>

    </>,

    document.body,

  );

};



export default HeaderNotificationPanel;

