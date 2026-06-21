import React, { useCallback, useEffect, useRef, useState } from 'react';
import HeaderNotificationPanel from './HeaderNotificationPanel';

const AUTO_POPUP_MS = 4500;

const NotificationBell = ({
  variant,
  isAdmin = false,
  isClub = false,
  isCtsv = false,
  isPartner = false,
  isIcpdp = false,
  open: controlledOpen,
  onOpenChange,
}) => {
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const initializedUnreadRef = useRef(false);
  const previousUnreadRef = useRef(0);
  const popupTimerRef = useRef(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const handleToggle = () => {
    window.clearTimeout(popupTimerRef.current);
    setShowPopup(false);
    setOpen(!open);
  };

  const handleClose = useCallback(() => {
    window.clearTimeout(popupTimerRef.current);
    setShowPopup(false);
    setOpen(false);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (wrapRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      handleClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open, handleClose]);

  useEffect(() => {
    if (!initializedUnreadRef.current) {
      initializedUnreadRef.current = true;
      previousUnreadRef.current = unread;
      return undefined;
    }

    if (open) {
      previousUnreadRef.current = unread;
      return undefined;
    }

    if (unread > previousUnreadRef.current) {
      setShowPopup(true);
      window.clearTimeout(popupTimerRef.current);
      popupTimerRef.current = window.setTimeout(() => {
        setShowPopup(false);
      }, AUTO_POPUP_MS);
    }

    previousUnreadRef.current = unread;
    return undefined;
  }, [open, setOpen, unread]);

  useEffect(() => () => {
    window.clearTimeout(popupTimerRef.current);
  }, []);

  return (
    <div className="header-notif-wrap" ref={wrapRef}>
      {showPopup && !open && (
        <button
          type="button"
          className="notif-mini-popup"
          onClick={() => {
            window.clearTimeout(popupTimerRef.current);
            setShowPopup(false);
            setOpen(true);
          }}
        >
          <strong>Thông báo mới</strong>
          <span>{unread > 1 ? `${unread} mục chưa đọc` : 'Nhấn để mở nhanh'}</span>
        </button>
      )}
      <button
        type="button"
        className={`notif-bell-btn${open ? ' notif-bell-btn--open' : ''}${unread > 0 ? ' notif-bell-btn--has-unread' : ''}`}
        aria-label="Thông báo"
        aria-expanded={open}
        onClick={handleToggle}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"
            fill="currentColor"
          />
        </svg>
        {unread > 0 && (
          <span className="notif-badge notif-badge--count" aria-label={`${unread} thông báo chưa đọc`}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <HeaderNotificationPanel
        open={open}
        onClose={handleClose}
        panelRef={panelRef}
        variant={variant}
        isAdmin={isAdmin}
        isClub={isClub}
        isCtsv={isCtsv}
        isPartner={isPartner}
        isIcpdp={isIcpdp}
        onUnreadCountChange={setUnread}
      />
    </div>
  );
};

export default NotificationBell;
