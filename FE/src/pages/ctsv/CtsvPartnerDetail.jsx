import React, { useEffect, useState } from 'react';
import { Link, useParams, useOutletContext } from 'react-router-dom';
import PartnerActionDialog from '../../components/ctsv/PartnerActionDialog';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import {
  approveCtsvPartner,
  fetchCtsvPartner,
  rejectCtsvPartner,
  requestInfoCtsvPartner
} from '../../services/ctsvApi';
import { getUserRole } from '../../utils/auth';
import {
  PARTNER_STATUS_LABEL,
  PARTNER_STATUS_LABEL_DETAIL,
  PARTNER_STATUS_TONE,
  formatPartnerDate,
  formatVnd,
  partnerInitials
} from '../../utils/partnerDisplay';

const CTSV_CAN_ACT = ['pending', 'info_requested'];

const PanelIcon = ({ children }) => (
  <span className="ctsv-pd-panel-icon" aria-hidden>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  </span>
);

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

  const attachmentItems = [
    ...(eventRequest?.attachments || []).map((f, i) => ({ key: `req-att-${i}`, ...f })),
    ...(partner.attachments || []).map((f, i) => ({ key: `att-${i}`, ...f })),
    ...contracts.map((c) => ({
      key: c._id,
      name: c.title || 'Hợp đồng tài trợ',
      sizeLabel: formatVnd(c.amount),
      url: '#',
      isContract: true
    }))
  ];

  return (
    <div className="ctsv-pd-page">
      <Link to="/ctsv/partners" className="ctsv-pd-back">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Quay lại danh sách đối tác
      </Link>

      <header className="ctsv-pd-header">
        <div className="ctsv-pd-header-main">
          <div className="ctsv-pd-title-row">
            <h1>{partner.name}</h1>
            <span className={`ctsv-pd-status ctsv-pd-status--${tone}`}>
              <svg width="11" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="12" cy="12" r="5" />
              </svg>
              {statusLabel}
            </span>
          </div>
          {partner.category && <p className="ctsv-pd-category">Lĩnh vực: {partner.category}</p>}
          <p className="ctsv-pd-meta">Ngày gửi đề xuất: {formatPartnerDate(partner.createdAt)}</p>
        </div>

        <div className="ctsv-pd-contact-card">
          <span className="ctsv-pd-avatar">{partnerInitials(partner.name)}</span>
          <div>
            <strong>{partner.representative || '—'}</strong>
            <span>{repRole}</span>
            <span>{contactLine || '—'}</span>
          </div>
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

      <div className="ctsv-pd-bento">
        <section className="ctsv-pd-panel ctsv-pd-panel--wide">
          <h2 className="ctsv-pd-panel-title">
            <PanelIcon>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </PanelIcon>
            Thông tin chương trình đề xuất
          </h2>

          <div className="ctsv-pd-field">
            <span className="ctsv-pd-field-label">Tên sự kiện</span>
            <p className="ctsv-pd-field-value">{eventTitle}</p>
          </div>

          <div className="ctsv-pd-field">
            <span className="ctsv-pd-field-label">Mô tả sự kiện</span>
            <p className="ctsv-pd-field-value">{eventRequest?.description || partner.description || '—'}</p>
          </div>

          {eventRequest?.location && (
            <div className="ctsv-pd-field">
              <span className="ctsv-pd-field-label">Địa điểm / Hình thức</span>
              <p className="ctsv-pd-field-value">
                {eventRequest.location}
                {eventRequest.format ? ` · ${eventRequest.format}` : ''}
              </p>
            </div>
          )}

          {eventRequest?.startDate && (
            <div className="ctsv-pd-field">
              <span className="ctsv-pd-field-label">Thời gian dự kiến</span>
              <p className="ctsv-pd-field-value">{formatPartnerDate(eventRequest.startDate)}</p>
            </div>
          )}

          {eventRequest?.partnerMessage && (
            <div className="ctsv-pd-field">
              <span className="ctsv-pd-field-label">Tin nhắn gửi CTSV</span>
              <p className="ctsv-pd-field-value">{eventRequest.partnerMessage}</p>
            </div>
          )}

          <div className="ctsv-pd-duo">
            <div className="ctsv-pd-stat">
              <span className="ctsv-pd-stat-label">
                <svg width="16" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Giá trị tài trợ dự kiến
              </span>
              <p className="ctsv-pd-stat-value">{formatVnd(amount)}</p>
            </div>

            <div className="ctsv-pd-stat">
              <span className="ctsv-pd-stat-label">
                <svg width="15" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Quyền lợi đối tác yêu cầu
              </span>
              {eventBenefits?.length ? (
                <ul className="ctsv-pd-benefits">
                  {eventBenefits.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : (
                <p className="ctsv-pd-stat-muted">—</p>
              )}
            </div>
          </div>
        </section>

        <section className="ctsv-pd-panel">
          <h2 className="ctsv-pd-panel-title">
            <PanelIcon>
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </PanelIcon>
            Tệp đính kèm
          </h2>

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
        </section>
      </div>

      {canAct && (
        <section className="ctsv-pd-action-bar">
          <div className="ctsv-pd-action-note">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p>Hành động của bạn sẽ được ghi nhận vào lịch sử hệ thống.</p>
          </div>

          <div className="ctsv-pd-action-btns">
            <div className="ctsv-pd-action-row">
              <button
                type="button"
                className="ctsv-pd-btn ctsv-pd-btn--outline"
                disabled={actionLoading}
                onClick={() => setDialogMode('supplement')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Bổ sung thông tin
              </button>
              <button
                type="button"
                className="ctsv-pd-btn ctsv-pd-btn--danger-outline"
                disabled={actionLoading}
                onClick={() => setDialogMode('reject')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                Từ chối
              </button>
            </div>
            <button
              type="button"
              className="ctsv-pd-btn ctsv-pd-btn--primary"
              disabled={actionLoading}
              onClick={() => setConfirmApprove(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Phê duyệt đối tác
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
