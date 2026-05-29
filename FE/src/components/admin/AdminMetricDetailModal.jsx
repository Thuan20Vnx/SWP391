import React, { useEffect } from 'react';
import { ADMIN_METRIC_DETAIL_MAP } from '../../data/adminDashboardData';

const STATUS_BADGE = {
  active: 'admin-log-badge admin-log-badge--primary',
  pending: 'admin-log-badge admin-log-badge--default',
  done: 'admin-log-badge admin-log-badge--default',
};

const DELTA_BADGE = {
  up: 'admin-detail-delta admin-detail-delta--up',
  down: 'admin-detail-delta admin-detail-delta--down',
};

const AdminMetricDetailModal = ({ variant, open, onClose }) => {
  const config = variant ? ADMIN_METRIC_DETAIL_MAP[variant] : null;

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

  if (!open || !config) return null;

  const renderCell = (row, colIndex) => {
    if (variant === 'traffic') {
      const values = [
        row.time,
        row.online?.toLocaleString('vi-VN'),
        row.sessions?.toLocaleString('vi-VN'),
        row.views,
        row.avg,
        <span key="delta" className={DELTA_BADGE[row.deltaTone] || DELTA_BADGE.up}>
          {row.delta}
        </span>,
      ];
      return values[colIndex];
    }

    if (variant === 'revenue') {
      const values = [
        <strong key="e">{row.event}</strong>,
        row.org,
        row.tickets?.toLocaleString('vi-VN'),
        row.revenue,
        row.channel,
        <span key="s" className={STATUS_BADGE[row.statusTone] || STATUS_BADGE.default}>
          {row.status}
        </span>,
      ];
      return values[colIndex];
    }

    if (variant === 'performance') {
      const values = [
        row.month,
        <strong key="s" className="admin-detail-score">{row.score}</strong>,
        row.events,
        row.sessions,
        row.cpu,
        row.note,
      ];
      return values[colIndex];
    }

    return '—';
  };

  return (
    <div className="admin-log-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="admin-log-modal admin-detail-modal"
        role="dialog"
        aria-labelledby="admin-detail-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-log-modal__header">
          <div>
            <h2 id="admin-detail-modal-title">{config.title}</h2>
            <p>{config.subtitle}</p>
          </div>
          <button type="button" className="admin-log-modal__close" onClick={onClose} aria-label="Đóng">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="admin-detail-summary">
          {config.summary.map((item) => (
            <div key={item.label} className="admin-detail-summary__item">
              <span className="admin-detail-summary__label">{item.label}</span>
              <span className="admin-detail-summary__value">{item.value}</span>
            </div>
          ))}
        </div>

        <div className="admin-log-modal__table-wrap admin-detail-modal__table-wrap">
          <table className="admin-log-table admin-detail-table">
            <thead>
              <tr>
                {config.columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.rows.map((row) => (
                <tr
                  key={row.id}
                  className={row.highlight ? 'admin-detail-table__row--highlight' : undefined}
                >
                  {config.columns.map((col, colIndex) => (
                    <td key={col} data-label={col}>
                      {renderCell(row, colIndex)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="admin-log-modal__footer">
          <p className="admin-detail-modal__hint">Dữ liệu mô phỏng · Sẽ kết nối API khi triển khai backend</p>
          <button type="button" className="admin-log-modal__btn-close" onClick={onClose}>
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AdminMetricDetailModal;
