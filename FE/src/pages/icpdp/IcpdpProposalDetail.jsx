import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { fetchIcpdpProposal, icpdpApproveProposal } from '../../services/icpdpApi';
import { statusClass } from '../../utils/eventStatus';

const IconCalendar = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

const IconPin = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

const IconTicket = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M3 9a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v1H3V9zm0 2h18v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-4z" />
  </svg>
);

const IconClub = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const STATUS_LABELS = {
  pending_icpdp: { label: 'Chờ IC-PDP duyệt', tone: 'warning' },
  pending_admin: { label: 'Chờ Admin duyệt', tone: 'info' },
  pending_ctsv: { label: 'Chờ CTSV duyệt', tone: 'info' },
  approved: { label: 'Đã phê duyệt', tone: 'success' },
  rejected: { label: 'Từ chối', tone: 'danger' },
  revision: { label: 'Cần chỉnh sửa', tone: 'warning' }
};

const IcpdpProposalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [proposal, setProposal] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIcpdpProposal(id)
      .then((d) => setProposal(d.proposal))
      .catch(() => {
        showToast?.('Không tải được đề xuất.', 'error');
        navigate('/icpdp/proposals');
      });
  }, [id, navigate, showToast]);

  const refresh = () => fetchIcpdpProposal(id).then((d) => setProposal(d.proposal));

  if (!proposal) {
    return (
      <div className="ctsv-ed-page">
        <div className="ctsv-ed-skeleton-hero sk" />
        <div className="ctsv-ed-skeleton-tabs">
          <div className="sk sk-line sk-line--lg" />
          <div className="sk sk-line" />
          <div className="sk sk-line sk-line--short" />
        </div>
        <div className="ctsv-ed-skeleton-panel sk" />
      </div>
    );
  }

  const canIcpdpApprove = proposal.statusKey === 'pending_icpdp';
  const statusMeta = STATUS_LABELS[proposal.statusKey] || {};

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await icpdpApproveProposal(id, note);
      showToast?.('Đã duyệt nội bộ — đề xuất chuyển sang Admin phê duyệt!', 'success');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ctsv-ed-page">
      <Link to="/icpdp/proposals" className="ctsv-ed-back">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Danh sách đề xuất CLB
      </Link>

      {/* ── Hero Section ── */}
      <section className="ctsv-ed-hero icpdp-proposal-hero">
        <div className="ctsv-ed-hero-body" style={{ flex: 1 }}>
          <div className="ctsv-ed-hero-tags">
            <span className="ctsv-ed-source ctsv-ed-source--club">Đề xuất CLB</span>
            <span className={`status-pill ${statusClass(proposal.status, proposal.statusKey)}`}>
              {proposal.status}
            </span>
          </div>
          <h1>{proposal.title}</h1>
          <ul className="ctsv-ed-meta">
            {proposal.clubName && (
              <li>
                <IconClub />
                {proposal.clubName}
              </li>
            )}
            <li>
              <IconCalendar />
              {proposal.date} {proposal.time}
            </li>
            {proposal.location && (
              <li>
                <IconPin />
                {proposal.location}
              </li>
            )}
            {proposal.totalTickets > 0 && (
              <li>
                <IconTicket />
                {proposal.totalTickets} vé dự kiến
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* ── Status Banners ── */}
      {canIcpdpApprove && (
        <div className="icpdp-view-banner" style={{ borderColor: 'rgba(242, 111, 33, 0.4)', background: '#ffffff' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p>Đề xuất này đang chờ <strong>IC-PDP duyệt nội bộ</strong>. Vui lòng xem xét và đưa ra quyết định bên dưới.</p>
        </div>
      )}

      {!canIcpdpApprove && proposal.statusKey === 'pending_ctsv' && (
        <div className="icpdp-view-banner">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p>Đề xuất đã được IC-PDP duyệt nội bộ và đang chờ <strong>Admin phê duyệt</strong> cuối cùng.</p>
        </div>
      )}

      {!canIcpdpApprove && proposal.statusKey === 'approved' && (
        <div className="icpdp-view-banner" style={{ borderColor: 'rgba(34, 197, 94, 0.3)', background: '#ffffff' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#22c55e" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <polyline points="8 12 11 15 16 9" />
          </svg>
          <p style={{ color: '#15803d' }}>Đề xuất đã được Admin phê duyệt. Sự kiện đã được tạo chính thức.</p>
        </div>
      )}

      {!canIcpdpApprove && proposal.statusKey === 'rejected' && (
        <div className="icpdp-view-banner" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: '#ffffff' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ef4444" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p style={{ color: '#ef4444' }}>Đề xuất đã bị từ chối.</p>
        </div>
      )}

      {!canIcpdpApprove && proposal.statusKey === 'revision' && (
        <div className="icpdp-view-banner" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', background: '#ffffff' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f59e0b" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12" y2="16" />
          </svg>
          <p style={{ color: '#92400e' }}>Đề xuất đang chờ CLB chỉnh sửa theo yêu cầu.</p>
        </div>
      )}

      {/* ── Detail Content ── */}
      <div className="ctsv-ed-content">
        <div className="ctsv-ed-panel">
          <h2 className="ctsv-ed-panel-title">Nội dung đề xuất</h2>
          <p className="ctsv-ed-description">
            {proposal.description?.trim() || 'Không có mô tả chi tiết cho đề xuất này.'}
          </p>

          <div className="ctsv-ed-info-grid">
            <div className="ctsv-ed-info-card">
              <span className="ctsv-ed-info-label">Câu lạc bộ</span>
              <strong>{proposal.clubName || 'Chưa xác định'}</strong>
            </div>
            <div className="ctsv-ed-info-card">
              <span className="ctsv-ed-info-label">Ngày tổ chức</span>
              <strong>{proposal.date} {proposal.time}</strong>
            </div>
            <div className="ctsv-ed-info-card">
              <span className="ctsv-ed-info-label">Địa điểm</span>
              <strong>{proposal.location || 'Chưa xác định'}</strong>
            </div>
            <div className="ctsv-ed-info-card">
              <span className="ctsv-ed-info-label">Số vé dự kiến</span>
              <strong>{proposal.totalTickets || '—'}</strong>
            </div>
            {proposal.category && (
              <div className="ctsv-ed-info-card">
                <span className="ctsv-ed-info-label">Chủ đề</span>
                <strong>{proposal.category}</strong>
              </div>
            )}
            <div className="ctsv-ed-info-card">
              <span className="ctsv-ed-info-label">Trạng thái</span>
              <strong>{statusMeta.label || proposal.status}</strong>
            </div>
          </div>

          {/* Notes Section */}
          {(proposal.ctsvNote || proposal.icpdpNote || proposal.rejectionReason) && (
            <div className="icpdp-proposal-notes">
              {proposal.icpdpNote && (
                <div className="icpdp-proposal-note-card">
                  <span className="icpdp-proposal-note-label">Ghi chú từ IC-PDP</span>
                  <p>{proposal.icpdpNote}</p>
                </div>
              )}
              {proposal.ctsvNote && (
                <div className="icpdp-proposal-note-card">
                  <span className="icpdp-proposal-note-label">Ghi chú từ Admin / CTSV</span>
                  <p>{proposal.ctsvNote}</p>
                </div>
              )}
              {proposal.rejectionReason && (
                <div className="icpdp-proposal-note-card icpdp-proposal-note-card--danger">
                  <span className="icpdp-proposal-note-label">Lý do từ chối</span>
                  <p>{proposal.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Action Panel ── */}
        {canIcpdpApprove && (
          <div className="icpdp-action-panel">
            <h3>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden style={{ verticalAlign: '-4px', marginRight: 8 }}>
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              Duyệt nội bộ IC-PDP
            </h3>
            <p className="icpdp-action-panel__desc">
              Sau khi bạn duyệt, đề xuất sẽ chuyển sang trạng thái <strong>Chờ Admin duyệt</strong>.
              Admin sẽ phê duyệt cuối cùng và tạo sự kiện chính thức.
            </p>
            <textarea
              className="ctsv-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú từ IC-PDP (tùy chọn)…"
              rows={3}
            />
            <div className="icpdp-action-panel__buttons">
              <button
                type="button"
                className="ctsv-dash-btn ctsv-dash-btn--primary"
                onClick={handleApprove}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="btn-spinner" aria-hidden />
                    Đang xử lý…
                  </>
                ) : (
                  'Duyệt nội bộ → Chuyển Admin'
                )}
              </button>
              <button
                type="button"
                className="ctsv-dash-btn ctsv-dash-btn--ghost"
                onClick={() => navigate('/icpdp/proposals')}
              >
                Quay lại
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IcpdpProposalDetail;
