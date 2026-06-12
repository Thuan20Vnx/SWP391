import React, { useEffect } from 'react';

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  onConfirm,
  onCancel,
  danger = false,
  loading = false
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel, loading]);

  if (!open) return null;

  return (
    <div className="app-confirm-backdrop" role="presentation" onClick={loading ? undefined : onCancel}>
      <div
        className="app-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="app-confirm-title" className="app-confirm-title">
          {title}
        </h3>
        {message && <p className="app-confirm-message">{message}</p>}
        <div className="app-confirm-actions">
          <button type="button" className="app-confirm-cancel" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`app-confirm-ok${danger ? ' app-confirm-ok--danger' : ''}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
