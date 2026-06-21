import React, { useEffect, useState } from 'react';
import { Link, useParams, useOutletContext } from 'react-router-dom';
import PartnerActionDialog from '../../components/ctsv/PartnerActionDialog';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  approveCtsvPartner,
  fetchCtsvPartner,
  rejectCtsvPartner
} from '../../services/ctsvApi';
import { getUserRole } from '../../utils/auth';
import {
  PARTNER_STATUS_LABEL,
  PARTNER_STATUS_LABEL_DETAIL,
  PARTNER_STATUS_TONE,
  formatPartnerDate,
  formatVnd,
} from '../../utils/partnerDisplay';
import PartnerAvatar from '../../components/partner/PartnerAvatar';
import '../../styles/admin-dashboard.css';

const CTSV_CAN_ACT = ['pending', 'info_requested'];

const FileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const CtsvPartnerDetail = () => {
  const { id } = useParams();
  const { showToast } = useOutletContext() || {};
  const [partner, setPartner] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [eventRequest, setEventRequest] = useState(null);
  const [dialogMode, setDialogMode] = useState(null);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const isCtsv = getUserRole() === 'ctsv';

  const load = () =>
    fetchCtsvPartner(id).then((d) => {
      setPartner(d.partner);
      setContracts(d.contracts || []);
      setEventRequest(d.eventRequest || null);
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
      <div className="ctsv-pd-page">
        <p className="ctsv-muted">Đang tải...</p>
      </div>
    );
  }

  const tone = PARTNER_STATUS_TONE[partner.status] || 'slate';
  const statusLabel =
    PARTNER_STATUS_LABEL_DETAIL[partner.status] || PARTNER_STATUS_LABEL[partner.status] || partner.status;
  const mainContract = contracts[0];
  const eventTitle = eventRequest?.title || partner.proposedEventTitle || mainContract?.title || '—';
  const amount = eventRequest?.expectedSponsorAmount ?? partner.expectedSponsorAmount ?? mainContract?.amount;
  const eventBenefits = eventRequest?.benefits?.length ? eventRequest.benefits : partner.benefits;
  const canAct = CTSV_CAN_ACT.includes(partner.status) && isCtsv;
  const repRole = partner.representativeTitle
    ? `Đại diện liên hệ (${partner.representativeTitle})`
    : 'Đại diện liên hệ';
  const contactLine = [partner.email, partner.phone].filter(Boolean).join(' • ');

  const attachmentItems = (eventRequest?.attachments || []).map((f, i) => ({ key: `req-att-${i}`, ...f }));

  return (
    <div className="ctsv-pd-page">
      <Link to="/ctsv/partners" className="ctsv-pd-back">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Quay lại danh sách đối tác
      </Link>

      <header className="ctsv-pd-hero-card">
        <div className="ctsv-pd-hero-left">
          <PartnerAvatar partner={partner} className="ctsv-pd-hero-avatar" />
          <div className="ctsv-pd-hero-info">
            <div className="ctsv-pd-hero-top">
              <h1 className="ctsv-pd-hero-name">{partner.name}</h1>
              <span className={`ctsv-pd-status ctsv-pd-status--${tone}`}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <circle cx="12" cy="12" r="6" />
                </svg>
                {statusLabel}
              </span>
            </div>
            {partner.category && (
              <p className="ctsv-pd-hero-cat">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                {partner.category}
              </p>
            )}
            <p className="ctsv-pd-hero-date">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              Gửi ngày {formatPartnerDate(partner.createdAt)}
            </p>
          </div>
        </div>

        <div className="ctsv-pd-hero-contact">
          <p className="ctsv-pd-hero-contact-label">Người đại diện</p>
          <p className="ctsv-pd-hero-contact-name">{partner.representative || '—'}</p>
          <p className="ctsv-pd-hero-contact-role">{repRole}</p>
          {contactLine && (
            <p className="ctsv-pd-hero-contact-line">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.1 19.79 19.79 0 0 1 1.63 2.48a2 2 0 0 1 2-2.18h3a2 2 0 0 1 2 1.72c.127.96.36 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              {contactLine}
            </p>
          )}
        </div>
      </header>

      {partner.status === 'pending_admin' && (
        <div className="ctsv-pd-banner ctsv-pd-banner--info">
          Đơn đã được CTSV phê duyệt
          {partner.ctsvApprovedByEmail ? ` (${partner.ctsvApprovedByEmail})` : ''}. Đang chờ{' '}
          <strong>Admin</strong> phê duyệt lần cuối.
        </div>
      )}
      {partner.status === 'rejected' && partner.rejectionReason && (
        <div className="ctsv-pd-banner ctsv-pd-banner--danger">
          <strong>Lý do từ chối:</strong> {partner.rejectionReason}
        </div>
      )}
      {partner.status === 'info_requested' && partner.supplementReason && (
        <div className="ctsv-pd-banner ctsv-pd-banner--warn">
          <strong>Yêu cầu bổ sung:</strong> {partner.supplementReason}
        </div>
      )}

      <ul className="admin-proposal-list">
        <li className="admin-proposal-card">
          <div className="admin-proposal-card__head">
            <div className="admin-proposal-card__head-main">
              <h2 className="admin-proposal-card__title">{eventTitle}</h2>
            </div>
            <span className="admin-proposal-card__badge">{formatVnd(amount)}</span>
          </div>

          <div className="admin-proposal-card__body">
            <div className="admin-proposal-card__thumb-wrap">
              {eventRequest?.image ? (
                <img src={eventRequest.image} alt="" className="admin-proposal-card__thumb" />
              ) : (
                <PartnerAvatar partner={partner} className="admin-proposal-card__thumb" />
              )}
            </div>

            <div className="admin-proposal-card__details">
              <dl className="admin-proposal-meta">
                <div className="admin-proposal-meta__row">
                  <dt>Địa điểm / Hình thức</dt>
                  <dd>
                    {eventRequest?.location || '—'}
                    {eventRequest?.format ? ` · ${eventRequest.format}` : ''}
                  </dd>
                </div>
                <div className="admin-proposal-meta__row">
                  <dt>Thời gian dự kiến</dt>
                  <dd>{eventRequest?.startDate ? formatPartnerDate(eventRequest.startDate) : '—'}</dd>
                </div>
                <div className="admin-proposal-meta__row admin-proposal-meta__row--full">
                  <dt>Tin nhắn gửi CTSV</dt>
                  <dd>{eventRequest?.partnerMessage || '—'}</dd>
                </div>
                <div className="admin-proposal-meta__row admin-proposal-meta__row--full">
                  <dt>Quyền lợi đối tác yêu cầu</dt>
                  <dd>
                    {eventBenefits?.length ? (
                      <ul className="ctsv-pd-benefits">
                        {eventBenefits.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {(eventRequest?.description || partner.description) && (
            <div className="admin-proposal-card__full">
              <div className="admin-proposal-card__desc">
                <p className="admin-proposal-card__desc-label">Mô tả sự kiện</p>
                <p className="admin-proposal-card__desc-text">
                  {eventRequest?.description || partner.description}
                </p>
              </div>
            </div>
          )}

          <div className="admin-proposal-card__full">
            <p className="admin-proposal-card__desc-label" style={{ marginBottom: 8 }}>Tệp đính kèm</p>
            {attachmentItems.length ? (
              <ul className="ctsv-pd-files">
                {attachmentItems.map((f) => (
                  <li key={f.key}>
                    <a href={f.url || '#'} className="ctsv-pd-file" target="_blank" rel="noreferrer">
                      <span className="ctsv-pd-file-icon">
                        <FileIcon />
                      </span>
                      <span className="ctsv-pd-file-body">
                        <span className="ctsv-pd-file-name">{f.name}</span>
                        <span className="ctsv-pd-file-size">{f.sizeLabel || (f.isContract ? 'Hợp đồng' : '—')}</span>
                      </span>
                      <span className="ctsv-pd-file-arrow" aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ctsv-muted">Chưa có tệp đính kèm.</p>
            )}
          </div>
        </li>
      </ul>

      {canAct && (
        <div className="admin-proposal-card__actions-bar">
          <p className="admin-proposal-card__actions-note">
            Hành động của bạn sẽ được ghi nhận vào lịch sử hệ thống.
          </p>
          <div className="admin-proposal-card__actions">
            <button
              type="button"
              className="admin-proposal-btn admin-proposal-btn--reject"
              disabled={actionLoading}
              onClick={() => setDialogMode('reject')}
            >
              <span className="admin-proposal-btn__icon" aria-hidden="true">✕</span>
              Từ chối
            </button>
            <button
              type="button"
              className="admin-proposal-btn admin-proposal-btn--approve"
              disabled={actionLoading}
              onClick={() => setConfirmApprove(true)}
            >
              <span className="admin-proposal-btn__icon" aria-hidden="true">✓</span>
              {actionLoading ? 'Đang xử lý...' : 'Phê duyệt đối tác'}
            </button>
          </div>
        </div>
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
          }
        }}
      />

      <ConfirmDialog
        open={confirmApprove}
        title="Phê duyệt đối tác"
        message="Đơn sẽ chuyển sang Admin để phê duyệt lần cuối. Chỉ khi Admin xác nhận, đối tác mới được coi là đã duyệt thành công."
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
