import React, { useEffect, useState } from 'react';
import { Link, useParams, useOutletContext } from 'react-router-dom';
import PartnerActionDialog from '../../components/ctsv/PartnerActionDialog';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  approveCtsvContract,
  approveCtsvPartner,
  fetchCtsvPartner,
  rejectCtsvPartner,
  requestInfoCtsvPartner
} from '../../services/ctsvApi';
import { getUserRole } from '../../utils/auth';
import {
  PARTNER_STATUS_LABEL,
  PARTNER_STATUS_TONE,
  formatPartnerDate,
  formatVnd,
  partnerInitials
} from '../../utils/partnerDisplay';

const CTSV_CAN_ACT = ['pending', 'info_requested'];

const CtsvPartnerDetail = () => {
  const { id } = useParams();
  const { showToast } = useOutletContext() || {};
  const [partner, setPartner] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [dialogMode, setDialogMode] = useState(null);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const isCtsv = getUserRole() === 'ctsv';

  const load = () =>
    fetchCtsvPartner(id).then((d) => {
      setPartner(d.partner);
      setContracts(d.contracts || []);
    });

  useEffect(() => {
    load().catch(() => showToast?.('Không tải đơn đăng ký.', 'error'));
  }, [id, showToast]);

  const runAction = async (fn) => {
    setActionLoading(true);
    try {
      await fn();
      await load();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setActionLoading(false);
      setDialogMode(null);
      setConfirmApprove(false);
    }
  };

  if (!partner) {
    return (
      <div className="ctsv-partner-detail-page">
        <p className="ctsv-muted">Đang tải...</p>
      </div>
    );
  }

  const tone = PARTNER_STATUS_TONE[partner.status] || 'slate';
  const mainContract = contracts[0];
  const eventTitle = partner.proposedEventTitle || mainContract?.title || '—';
  const amount = partner.expectedSponsorAmount || mainContract?.amount;
  const canAct = CTSV_CAN_ACT.includes(partner.status) && isCtsv;

  return (
    <div className="ctsv-partner-detail-page">
      <Link to="/ctsv/partners" className="ctsv-partner-detail-back">
        ← Quay lại danh sách đơn
      </Link>

      <header className="ctsv-partner-detail-header">
        <div>
          <div className="ctsv-partner-detail-title-row">
            <h1>{partner.name}</h1>
            <span className={`ctsv-partners-badge ctsv-partners-badge--${tone}`}>
              {PARTNER_STATUS_LABEL[partner.status] || partner.status}
            </span>
          </div>
          {partner.category && (
            <p className="ctsv-partner-detail-category">Lĩnh vực: {partner.category}</p>
          )}
        </div>
        <div className="ctsv-partner-detail-contact">
          <span className="ctsv-partners-avatar">{partnerInitials(partner.name)}</span>
          <div>
            <strong>{partner.representative || '—'}</strong>
            <span>{partner.representativeTitle || 'Đại diện liên hệ'}</span>
            <span>
              {partner.email}
              {partner.phone ? ` • ${partner.phone}` : ''}
            </span>
          </div>
        </div>
      </header>

      {partner.status === 'pending_admin' && (
        <div className="ctsv-partner-detail-banner ctsv-partner-detail-banner--info">
          Đơn đã được CTSV phê duyệt
          {partner.ctsvApprovedByEmail ? ` (${partner.ctsvApprovedByEmail})` : ''}. Đang chờ{' '}
          <strong>Admin</strong> phê duyệt lần cuối để hoàn tất.
        </div>
      )}

      {partner.status === 'rejected' && partner.rejectionReason && (
        <div className="ctsv-partner-detail-banner ctsv-partner-detail-banner--danger">
          <strong>Lý do từ chối:</strong> {partner.rejectionReason}
        </div>
      )}

      {partner.status === 'info_requested' && partner.supplementReason && (
        <div className="ctsv-partner-detail-banner ctsv-partner-detail-banner--warn">
          <strong>Yêu cầu bổ sung:</strong> {partner.supplementReason}
        </div>
      )}

      <div className="ctsv-partner-detail-bento">
        <section className="ctsv-partner-detail-panel">
          <h2>Thông tin chương trình đề xuất</h2>
          <div className="ctsv-partner-detail-field">
            <label>Tên sự kiện / chương trình</label>
            <p>{eventTitle}</p>
          </div>
          <div className="ctsv-partner-detail-metrics">
            <div className="ctsv-partner-detail-metric">
              <h3>Giá trị tài trợ dự kiến</h3>
              <p>{formatVnd(amount)}</p>
            </div>
            <div className="ctsv-partner-detail-metric">
              <h3>Ngày gửi đề xuất</h3>
              <p style={{ color: '#0f172a', fontSize: '1rem' }}>{formatPartnerDate(partner.createdAt)}</p>
            </div>
          </div>
          {partner.benefits?.length > 0 && (
            <div className="ctsv-partner-detail-field">
              <label>Quyền lợi đối tác yêu cầu</label>
              <ul className="ctsv-partner-detail-benefits">
                {partner.benefits.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          {partner.description && (
            <div className="ctsv-partner-detail-field">
              <label>Ghi chú</label>
              <p style={{ fontWeight: 500 }}>{partner.description}</p>
            </div>
          )}
        </section>

        <section className="ctsv-partner-detail-panel">
          <h2>Tệp đính kèm</h2>
          {partner.attachments?.length ? (
            <ul className="ctsv-partner-detail-files">
              {partner.attachments.map((f, i) => (
                <li key={i}>
                  <a href={f.url || '#'} target="_blank" rel="noreferrer">
                    <span>{f.name}</span>
                    <span className="ctsv-muted">{f.sizeLabel}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ctsv-muted">Chưa có tệp đính kèm.</p>
          )}

          {contracts.length > 0 && (
            <>
              <h2 style={{ marginTop: 24 }}>Hợp đồng</h2>
              <ul className="ctsv-partner-detail-files">
                {contracts.map((c) => (
                  <li key={c._id}>
                    <span>
                      {c.title} — {formatVnd(c.amount)} ({c.status})
                    </span>
                    {c.status === 'pending' && isCtsv && partner.status === 'approved' && (
                      <button
                        type="button"
                        className="ctsv-link-btn"
                        onClick={async () => {
                          try {
                            await approveCtsvContract(c._id);
                            showToast?.('Đã phê duyệt hợp đồng.', 'success');
                            load();
                          } catch (e) {
                            showToast?.(e.message, 'error');
                          }
                        }}
                      >
                        Phê duyệt HĐ
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {canAct && (
        <section className="ctsv-partner-detail-actions">
          <p className="ctsv-partner-detail-actions-note">
            Sau khi CTSV phê duyệt, đơn chuyển sang Admin để xác nhận lần cuối trước khi đối tác chính thức
            hợp tác.
          </p>
          <div className="ctsv-partner-detail-actions-btns">
            <button
              type="button"
              className="ctsv-partner-action-btn ctsv-partner-action-btn--approve"
              disabled={actionLoading}
              onClick={() => setConfirmApprove(true)}
            >
              Phê duyệt
            </button>
            <button
              type="button"
              className="ctsv-partner-action-btn ctsv-partner-action-btn--reject"
              disabled={actionLoading}
              onClick={() => setDialogMode('reject')}
            >
              Từ chối
            </button>
            <button
              type="button"
              className="ctsv-partner-action-btn ctsv-partner-action-btn--supplement"
              disabled={actionLoading}
              onClick={() => setDialogMode('supplement')}
            >
              Bổ sung thông tin
            </button>
          </div>
        </section>
      )}

      <PartnerActionDialog
        open={Boolean(dialogMode)}
        mode={dialogMode}
        loading={actionLoading}
        onCancel={() => !actionLoading && setDialogMode(null)}
        onConfirm={(reason) => {
          if (dialogMode === 'reject') {
            runAction(async () => {
              await rejectCtsvPartner(id, reason);
              showToast?.('Đã từ chối đơn đăng ký.', 'info');
            });
          } else if (dialogMode === 'supplement') {
            runAction(async () => {
              await requestInfoCtsvPartner(id, reason);
              showToast?.('Đã gửi yêu cầu bổ sung thông tin.', 'success');
            });
          }
        }}
      />

      <ConfirmDialog
        open={confirmApprove}
        title="Phê duyệt đơn đăng ký đối tác"
        message="Đơn sẽ được chuyển sang Admin để phê duyệt lần cuối. Chỉ khi Admin xác nhận, đối tác mới được coi là đã duyệt thành công."
        confirmLabel="Gửi lên Admin"
        cancelLabel="Hủy"
        loading={actionLoading}
        onCancel={() => !actionLoading && setConfirmApprove(false)}
        onConfirm={() =>
          runAction(async () => {
            const res = await approveCtsvPartner(id);
            showToast?.(res.message || 'Đã phê duyệt — chờ Admin xác nhận.', 'success');
          })
        }
      />
    </div>
  );
};

export default CtsvPartnerDetail;
