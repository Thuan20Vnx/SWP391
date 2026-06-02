import React from 'react';

export const NOTIFICATION_TONE_META = {
  info: { label: 'Thông tin', icon: 'info' },
  warning: { label: 'Cần xử lý', icon: 'warning' },
  success: { label: 'Thành công', icon: 'success' },
  alert: { label: 'Cảnh báo', icon: 'alert' },
};

export const NotificationToneIcon = ({ tone = 'info' }) => {
  const icons = {
    info: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
          fill="currentColor"
        />
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
          fill="currentColor"
        />
      </svg>
    ),
    success: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          fill="currentColor"
        />
      </svg>
    ),
    alert: (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
          fill="currentColor"
        />
      </svg>
    ),
  };

  return icons[tone] || icons.info;
};
