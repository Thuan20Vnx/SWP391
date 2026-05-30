import React, { useEffect, useState } from 'react';
import { Link, useParams, useOutletContext } from 'react-router-dom';
import {
  approveCtsvContract,
  approveCtsvPartner,
  fetchCtsvPartner,
  rejectCtsvPartner
} from '../../services/ctsvApi';
import { getUserRole } from '../../utils/auth';
import {
  PARTNER_STATUS_LABEL,
  PARTNER_STATUS_TONE,
  formatPartnerDate,
  formatVnd,
  partnerInitials
} from '../../utils/partnerDisplay';

const CtsvPartnerDetail = () => {
  const { id } = useParams();
  const { showToast } = useOutletContext() || {};
  const [partner, setPartner] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [reason, setReason] = useState('');
  const isCtsv = getUserRole() === 'ctsv';

  const load = () =>
    fetchCtsvPartner(id).then((d) => {
      setPartner(d.partner);
      setContracts(d.contracts || []);
    });

  useEffect(() => {
    load().catch(() => showToast?.('Không tải đối tác.', 'error'));
  }, [id, showToast]);

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

  return (
    <div className="ctsv-partner-detail-page">
      <Link to="/ctsv/partners" className="ctsv-partner-detail-back">
        ← Quay lại danh sách đối tác
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
                    {c.status === 'pending' && isCtsv && (
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

      {partner.status === 'pending' && isCtsv && (
        <section className="ctsv-partner-detail-actions">
          <p className="ctsv-partner-detail-actions-note">
            Hành động của bạn sẽ được ghi nhận vào lịch sử hệ thống.
          </p>
          <div className="ctsv-partner-detail-actions-row">
            <textarea
              className="ctsv-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Lý do từ chối (nếu từ chối đề xuất)"
              rows={2}
            />
            <button
              type="button"
              className="ctsv-btn-danger"
              onClick={async () => {
                try {
                  await rejectCtsvPartner(id, reason);
                  showToast?.('Đã từ chối đề xuất.', 'info');
                  load();
                } catch (e) {
                  showToast?.(e.message, 'error');
                }
              }}
            >
              Từ chối đề xuất
            </button>
            <button
              type="button"
              className="ctsv-btn-primary"
              onClick={async () => {
                try {
                  await approveCtsvPartner(id);
                  showToast?.('Đã phê duyệt đối tác.', 'success');
                  load();
                } catch (e) {
                  showToast?.(e.message, 'error');
                }
              }}
            >
              Phê duyệt đối tác
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default CtsvPartnerDetail;
