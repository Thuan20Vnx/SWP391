import React, { useEffect, useState } from 'react';

const COPY = {
  reject: {
    title: 'Từ chối phê duyệt đối tác',
    subtitle: 'Vui lòng nêu rõ lý do từ chối để đối tác điều chỉnh hoặc liên hệ lại.',
    label: 'Lý do từ chối',
    placeholder: 'Nhập lý do từ chối đơn đăng ký…',
    confirm: 'Xác nhận từ chối',
    danger: true
  },
  supplement: {
    title: 'Bổ sung thông tin đơn đăng ký',
    subtitle: 'Ghi rõ hồ sơ, tài liệu hoặc nội dung đối tác cần bổ sung trước khi xét duyệt tiếp.',
    label: 'Nội dung cần bổ sung',
    placeholder: 'Ví dụ: Bổ sung hợp đồng dự thảo, MST doanh nghiệp…',
    confirm: 'Gửi yêu cầu bổ sung',
    danger: false
  }
};

const PartnerActionDialog = ({ open, mode, onConfirm, onCancel, loading = false }) => {
  const [reason, setReason] = useState('');
  const copy = COPY[mode] || COPY.reject;

  useEffect(() => {
    if (open) setReason('');
  }, [open, mode]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel, loading]);

  if (!open || !mode) return null;

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (!trimmed || loading) return;
    onConfirm?.(trimmed);
  };

  return (
    <div
      className="ctsv-partner-dialog-backdrop"
      role="presentation"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="ctsv-partner-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ctsv-partner-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="ctsv-partner-dialog-title" className="ctsv-partner-dialog-title">
          {copy.title}
        </h2>
        <p className="ctsv-partner-dialog-sub">{copy.subtitle}</p>
        <label className="ctsv-partner-dialog-field">
          <span>
            {copy.label} <em>*</em>
          </span>
          <textarea
            className="ctsv-textarea ctsv-partner-dialog-textarea"
            rows={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={copy.placeholder}
            disabled={loading}
            autoFocus
          />
        </label>
        <div className="ctsv-partner-dialog-actions">
          <button type="button" className="ctsv-partner-dialog-cancel" onClick={onCancel} disabled={loading}>
            Hủy
          </button>
          <button
            type="button"
            className={`ctsv-partner-dialog-submit${copy.danger ? ' ctsv-partner-dialog-submit--danger' : ''}`}
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
          >
            {loading ? 'Đang gửi…' : copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartnerActionDialog;
