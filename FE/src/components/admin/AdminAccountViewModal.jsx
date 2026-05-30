import React, { useEffect } from 'react';
import {
  ADMIN_ACCOUNT_ROLE_META,
  formatAccountDate,
  getAccountInitials,
} from '../../data/adminAccountsData';

const AdminAccountViewModal = ({ open, account, onClose, onEdit }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !account) return null;

  const meta = ADMIN_ACCOUNT_ROLE_META[account.role] || {
    label: account.role,
    badgeClass: 'admin-acc-badge--attendee',
  };

  const rows = [
    { label: 'Họ và tên', value: account.name },
    { label: 'Email', value: account.email },
    { label: 'Vai trò', value: meta.label, badge: meta.badgeClass },
    { label: 'Mã số SV', value: account.mssv || '—' },
    { label: 'Số điện thoại', value: account.phone || '—' },
    { label: 'Khóa học', value: account.course || '—' },
    { label: 'Cơ sở', value: account.campus || '—' },
    { label: 'Đơn vị / Chuyên ngành', value: account.unitInfo || '—' },
    { label: 'Ngày tạo', value: formatAccountDate(account.createdAt) },
    {
      label: 'Trạng thái',
      value: account.active ? 'Đang hoạt động' : 'Đã khóa',
      status: account.active ? 'active' : 'inactive',
    },
  ];

  return (
    <div className="admin-acc-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="admin-acc-modal admin-acc-modal--view"
        role="dialog"
        aria-labelledby="admin-view-account-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-acc-modal__header">
          <div className="admin-acc-modal__profile">
            <span className="admin-acc-modal__avatar" aria-hidden="true">
              {getAccountInitials(account.name)}
            </span>
            <div>
              <h2 id="admin-view-account-title">{account.name}</h2>
              <p className="admin-acc-modal__sub">{account.email}</p>
            </div>
          </div>
          <button type="button" className="admin-acc-modal__close" onClick={onClose} aria-label="Đóng">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="admin-acc-detail-grid">
          {rows.map((row) => (
            <div key={row.label} className="admin-acc-detail-grid__item">
              <span className="admin-acc-detail-grid__label">{row.label}</span>
              {row.badge ? (
                <span className={`admin-acc-badge ${row.badge}`}>{row.value}</span>
              ) : row.status ? (
                <span
                  className={`admin-acc-detail-status admin-acc-detail-status--${row.status}`}
                >
                  {row.value}
                </span>
              ) : (
                <span className="admin-acc-detail-grid__value">{row.value}</span>
              )}
            </div>
          ))}
        </div>

        <footer className="admin-acc-modal__footer">
          <button type="button" className="admin-acc-btn admin-acc-btn--ghost" onClick={onClose}>
            Đóng
          </button>
          <button
            type="button"
            className="admin-acc-btn admin-acc-btn--primary"
            onClick={() => {
              onClose();
              onEdit?.(account);
            }}
          >
            Chỉnh sửa
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AdminAccountViewModal;
