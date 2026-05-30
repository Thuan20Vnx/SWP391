import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { fetchIcpdpProposal, icpdpApproveProposal } from '../../services/icpdpApi';
import { statusClass } from '../../utils/eventStatus';

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
      <div className="ctsv-page">
        <p className="ctsv-muted">Đang tải...</p>
      </div>
    );
  }

  const canIcpdpApprove = proposal.statusKey === 'pending_icpdp';

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await icpdpApproveProposal(id, note);
      showToast?.('Đã duyệt nội bộ — đề xuất chuyển sang CTSV phê duyệt!', 'success');
      refresh();
    } catch (e) {
      showToast?.(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ctsv-page">
      <Link to="/icpdp/proposals" className="ctsv-back-link">
        ← Danh sách đề xuất CLB
      </Link>
      <span className={`status-pill ${statusClass(proposal.status, proposal.statusKey)}`}>
        {proposal.status}
      </span>
      <h1>{proposal.title}</h1>
      <p className="ctsv-muted">
        {proposal.clubName} • {proposal.date} {proposal.time} • {proposal.location}
      </p>

      <div className="ctsv-panel">
        <p>{proposal.description || 'Không có mô tả.'}</p>
        <p>Số vé dự kiến: {proposal.totalTickets}</p>
        {proposal.ctsvNote && <p>Ghi chú CTSV: {proposal.ctsvNote}</p>}
        {proposal.icpdpNote && <p>Ghi chú IC-PDP: {proposal.icpdpNote}</p>}
        {proposal.rejectionReason && (
          <p style={{ color: '#ef4444' }}>Lý do từ chối: {proposal.rejectionReason}</p>
        )}
      </div>

      {canIcpdpApprove && (
        <div className="icpdp-action-panel">
          <h3>Duyệt nội bộ IC-PDP</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 12 }}>
            Sau khi bạn duyệt, đề xuất sẽ chuyển sang trạng thái <strong>Chờ CTSV duyệt</strong>.
            CTSV sẽ phê duyệt cuối cùng và tạo sự kiện chính thức.
          </p>
          <textarea
            className="ctsv-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú từ IC-PDP (tùy chọn)…"
            rows={3}
          />
          <div className="ctsv-action-buttons" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="ctsv-btn-primary"
              onClick={handleApprove}
              disabled={submitting}
            >
              {submitting ? 'Đang xử lý…' : 'Duyệt nội bộ → Chuyển CTSV'}
            </button>
          </div>
        </div>
      )}

      {!canIcpdpApprove && proposal.statusKey === 'pending_ctsv' && (
        <div className="icpdp-view-banner">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p>Đề xuất đã được IC-PDP duyệt nội bộ và đang chờ CTSV phê duyệt cuối cùng.</p>
        </div>
      )}

      {!canIcpdpApprove && proposal.statusKey === 'approved' && (
        <div className="icpdp-view-banner">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <polyline points="8 12 11 15 16 9" />
          </svg>
          <p>Đề xuất đã được CTSV phê duyệt. Sự kiện đã được tạo chính thức.</p>
        </div>
      )}

      {!canIcpdpApprove && proposal.statusKey === 'rejected' && (
        <div className="icpdp-view-banner" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.06)' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ef4444" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p style={{ color: '#ef4444' }}>Đề xuất đã bị từ chối.</p>
        </div>
      )}

      {!canIcpdpApprove && proposal.statusKey === 'revision' && (
        <div className="icpdp-view-banner" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.06)' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f59e0b" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12" y2="16" />
          </svg>
          <p style={{ color: '#92400e' }}>Đề xuất đang chờ CLB chỉnh sửa theo yêu cầu.</p>
        </div>
      )}
    </div>
  );
};

export default IcpdpProposalDetail;
