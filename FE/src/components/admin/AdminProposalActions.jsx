import React, { useState } from 'react';
import { useTranslation } from '../../i18n/I18nContext';
import ConfirmDialog from '../ui/ConfirmDialog';
import PartnerActionDialog from '../ctsv/PartnerActionDialog';

const AdminProposalActions = ({
  itemTitle,
  busy = false,
  disabled = false,
  onApprove,
  onReject,
  hideApprove = false,
}) => {
  const { t } = useTranslation();
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
          {hideApprove ? t('admin.proposal.actionsNoteIcpdp') : t('admin.proposal.actionsNote')}
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
            {t('admin.common.reject')}
          </button>
          {!hideApprove && (
            <button
              type="button"
              className="admin-proposal-btn admin-proposal-btn--approve"
              disabled={disabled || busy}
              onClick={() => setApproveOpen(true)}
            >
              <span className="admin-proposal-btn__icon" aria-hidden="true">
                ✓
              </span>
              {busy ? t('admin.common.processing') : t('admin.proposal.approve')}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={approveOpen}
        title={t('admin.proposal.approveTitle')}
        message={
          itemTitle
            ? t('admin.proposal.approveMessageNamed', { title: itemTitle })
            : t('admin.proposal.approveMessage')
        }
        confirmLabel={t('admin.proposal.approveConfirm')}
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
