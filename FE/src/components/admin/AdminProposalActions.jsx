import React, { useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';
import PartnerActionDialog from '../ctsv/PartnerActionDialog';

const AdminProposalActions = ({
  itemTitle,
  busy = false,
  disabled = false,
  onApprove,
  onReject,
}) => {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const handleApprove = async () => {
    try {
      await onApprove?.();
      setApproveOpen(false);
    } catch {
      /* parent shows toast */
    }
  };

  const handleReject = async (reason) => {
    try {
      await onReject?.(reason);
      setRejectOpen(false);
    } catch {
      /* parent shows toast */
    }
  };

  return (
    <>
      <div className="admin-proposal-card__actions-bar">
        <p className="admin-proposal-card__actions-note">
          Xác nhận trước khi phê duyệt hoặc từ chối — thao tác sẽ gửi thông báo tới CLB.
        </p>
        <div className="admin-proposal-card__actions">
          <button
            type="button"
            className="admin-proposal-btn admin-proposal-btn--reject"
            disabled={disabled || busy}
            onClick={() => setRejectOpen(true)}
          >
            <span className="admin-proposal-btn__icon" aria-hidden="true">
              ✕
            </span>
            Từ chối
          </button>
          <button
            type="button"
            className="admin-proposal-btn admin-proposal-btn--approve"
            disabled={disabled || busy}
            onClick={() => setApproveOpen(true)}
          >
            <span className="admin-proposal-btn__icon" aria-hidden="true">
              ✓
            </span>
            {busy ? 'Đang xử lý…' : 'Phê duyệt'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={approveOpen}
        title="Xác nhận phê duyệt"
        message={
          itemTitle
            ? `Bạn có chắc muốn phê duyệt "${itemTitle}"? Sự kiện sẽ được tạo hoặc chuyển sang bước tiếp theo.`
            : 'Bạn có chắc muốn phê duyệt đề xuất này?'
        }
        confirmLabel="Xác nhận phê duyệt"
        loading={busy}
        onCancel={() => !busy && setApproveOpen(false)}
        onConfirm={handleApprove}
      />

      <PartnerActionDialog
        open={rejectOpen}
        mode="proposalReject"
        loading={busy}
        onCancel={() => !busy && setRejectOpen(false)}
        onConfirm={handleReject}
      />
    </>
  );
};

export default AdminProposalActions;
