import React, { useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';
import { transferClubChairman } from '../../services/scannerApi';

const ChevronIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" className={`clb-chairman-transfer__chevron${open ? ' is-open' : ''}`} aria-hidden>
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" fill="currentColor" />
  </svg>
);

const ClubChairmanTransfer = ({ showToast, compact = false, onTransferred }) => {
  const [email, setEmail] = useState('');
  const [presidentName, setPresidentName] = useState('');
  const [confirmStep1, setConfirmStep1] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const className = compact ? 'clb-chairman-transfer clb-chairman-transfer--compact' : 'clb-chairman-transfer';
  const canRequestTransfer = email.trim() && confirmStep1;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) { showToast?.('Vui lòng nhập email người nhận.', 'error'); return; }
    if (!confirmStep1) { showToast?.('Vui lòng tick xác nhận bước 1 trước khi tiếp tục.', 'error'); return; }
    setConfirmOpen(true);
  };

  const executeTransfer = async () => {
    setSubmitting(true);
    try {
      const data = await transferClubChairman({ targetEmail: email.trim(), president: presidentName.trim() || undefined, confirm: true });
      if (data.success) {
        showToast?.(data.message || 'Chuyển nhượng thành công.', 'success');
        setEmail(''); setPresidentName(''); setConfirmStep1(false); setConfirmOpen(false);
        onTransferred?.(data);
      } else {
        showToast?.(data.message || 'Chuyển nhượng thất bại.', 'error');
      }
    } catch {
      showToast?.('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={className} id="club-chairman-transfer">
      <button
        type="button"
        className="clb-chairman-transfer__toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="club-chairman-transfer-panel"
      >
        <div className="clb-chairman-transfer__toggle-text">
          <h2 className="clb-chairman-transfer__title">Chuyển nhượng Chủ nhiệm CLB</h2>
          <p className="clb-chairman-transfer__subtitle">Chuyển quyền quản lý CLB — yêu cầu xác nhận 2 lần.</p>
        </div>
        <ChevronIcon open={expanded} />
      </button>

      {expanded && (
        <section id="club-chairman-transfer-panel" className="clb-chairman-transfer__panel" aria-label="Form chuyển nhượng Chủ nhiệm">
          <div className="clb-chairman-transfer__alert">
            <strong>Lưu ý quan trọng</strong>
            <p>
              Sau khi chuyển nhượng, bạn sẽ <em>mất quyền quản lý CLB</em>. Người nhận phải có tài khoản email trong trường.
            </p>
          </div>
          <form className="clb-chairman-transfer__form" onSubmit={handleSubmit}>
            <div className="clb-chairman-transfer__field-row">
              <div className="clb-profile-field">
                <label htmlFor="transfer-email">Email người nhận *</label>
                <input id="transfer-email" type="email" className="clb-input" placeholder="sv@fpt.edu.vn" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="clb-profile-field">
                <label htmlFor="transfer-president">Tên hiển thị Chủ nhiệm (tuỳ chọn)</label>
                <input id="transfer-president" type="text" className="clb-input" placeholder="Nguyễn Văn A" value={presidentName} onChange={(e) => setPresidentName(e.target.value)} />
              </div>
            </div>
            <div className="clb-chairman-transfer__steps">
              <p className="clb-chairman-transfer__steps-label">Xác nhận bước 1 / 2</p>
              <label className="clb-chairman-transfer__confirm">
                <input type="checkbox" checked={confirmStep1} onChange={(e) => setConfirmStep1(e.target.checked)} />
                Tôi hiểu hành động này không thể hoàn tác tự động và đồng ý chuyển quyền Chủ nhiệm.
              </label>
            </div>
            <button type="submit" className="clb-btn-danger" disabled={submitting || !canRequestTransfer}>
              Tiếp tục xác nhận lần 2
            </button>
          </form>
        </section>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Xác nhận chuyển nhượng lần 2"
        message={`Bạn sắp chuyển quyền Chủ nhiệm CLB cho ${email.trim()}${presidentName.trim() ? ` (${presidentName.trim()})` : ''}. Hành động này có hiệu lực ngay.`}
        confirmLabel="Xác nhận chuyển nhượng"
        cancelLabel="Quay lại"
        danger
        loading={submitting}
        onCancel={() => !submitting && setConfirmOpen(false)}
        onConfirm={executeTransfer}
      />
    </div>
  );
};

export default ClubChairmanTransfer;
