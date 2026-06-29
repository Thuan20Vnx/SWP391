import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import {
  approveCtsvProposal,
  fetchCtsvProposal,
  rejectCtsvProposal,
  revisionCtsvProposal,
} from '../../services/ctsvApi';
import useAdminEventsLiveStream from '../../hooks/useAdminEventsLiveStream';
import { PORTAL_EVENTS_LIVE_EVENT } from '../../utils/adminEventsLiveEvents';import EventPlanFilePanel from '../../components/events/EventPlanFilePanel';
import ProposalTicketsTable from '../../components/admin/ProposalTicketsTable';
import { canCtsvFinalApprove, getUserRole, isAdminRole } from '../../utils/auth';
import { statusClass } from '../../utils/eventStatus';

const CtsvProposalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const basePath = isAdminRole() ? '/admin/ctsv' : '/ctsv';
  const [proposal, setProposal] = useState(null);
  const [note, setNote] = useState('');
  const isCtsv = getUserRole() === 'ctsv';
  const canFinalApprove = canCtsvFinalApprove();

  useAdminEventsLiveStream(true);

  const refresh = useCallback(
    () => fetchCtsvProposal(id).then((d) => setProposal(d.proposal)),
    [id]
  );

  useEffect(() => {
    fetchCtsvProposal(id)
      .then((d) => setProposal(d.proposal))
      .catch(() => {
        showToast?.('Không tải được đề xuất.', 'error');
        navigate(`${basePath}/proposals`);
      });
  }, [id, navigate, showToast, basePath]);

  useEffect(() => {
    const onLive = () => {
      refresh().catch(() => {});
    };
    window.addEventListener(PORTAL_EVENTS_LIVE_EVENT, onLive);
    return () => window.removeEventListener(PORTAL_EVENTS_LIVE_EVENT, onLive);
  }, [refresh]);

  if (!proposal) {
    return (
      <div className="ctsv-ed-page">
        <div className="ctsv-ed-skeleton-hero sk" />
        <div className="ctsv-ed-skeleton-panel sk" />
      </div>
    );
  }

  const canCtsvAct =
    proposal.statusKey === 'pending_admin' ||
    (proposal.statusKey === 'pending_ctsv' && !proposal.linkedEventId);

  return (
    <div className="ctsv-ed-page">
      <Link to={`${basePath}/proposals`} className="ctsv-ed-back">
        ← Đề xuất CLB
      </Link>

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
            <li>{proposal.clubName || 'CLB'}</li>
            <li>{proposal.date} {proposal.time}</li>
            <li>{proposal.location || '—'}</li>
          </ul>
        </div>
      </section>

      <div className="ctsv-ed-content">
        <div className="ctsv-ed-panel">
          <h2 className="ctsv-ed-panel-title">Nội dung đề xuất</h2>
          <p className="ctsv-ed-description">
            {proposal.description?.trim() || 'Không có mô tả chi tiết.'}
          </p>

          <EventPlanFilePanel
            fileUrl={proposal.eventPlanUrl || proposal.eventPlanFile}
            fileName={proposal.eventPlanFileName}
            mimeType={proposal.eventPlanFileMime}
            externalLink={proposal.eventPlanLink}
          />

          <div className="ctsv-ed-info-grid">
            <div className="ctsv-ed-info-card">
              <span className="ctsv-ed-info-label">Câu lạc bộ</span>
              <strong>{proposal.clubName || '—'}</strong>
            </div>
            <div className="ctsv-ed-info-card">
              <span className="ctsv-ed-info-label">Số vé dự kiến</span>
              <strong>{proposal.totalTickets || '—'}</strong>
            </div>
            <div className="ctsv-ed-info-card">
              <span className="ctsv-ed-info-label">Danh mục</span>
              <strong>{proposal.category || '—'}</strong>
            </div>
          </div>

          <ProposalTicketsTable
            ticketTypes={proposal.ticketTypes}
            ticketPrice={proposal.ticketPrice}
          />

          {proposal.ctsvNote && (
            <div className="icpdp-proposal-note-card" style={{ marginTop: 16 }}>
              <span className="icpdp-proposal-note-label">Ghi chú CTSV</span>
              <p>{proposal.ctsvNote}</p>
            </div>
          )}
          {proposal.icpdpNote && (
            <div className="icpdp-proposal-note-card" style={{ marginTop: 16 }}>
              <span className="icpdp-proposal-note-label">Ghi chú IC-PDP</span>
              <p>{proposal.icpdpNote}</p>
            </div>
          )}
        </div>
      </div>

      {canCtsvAct && canFinalApprove && (
        <div className="ctsv-action-panel">
          <textarea
            className="ctsv-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ý kiến từ Cán bộ CTSV"
            rows={3}
          />
          <div className="ctsv-action-buttons">
            <button
              type="button"
              className="ctsv-btn-primary"
              onClick={async () => {
                try {
                  const res = await approveCtsvProposal(id, note);
                  showToast?.('Đã phê duyệt — sự kiện đã được tạo!', 'success');
                  if (res.event?.id) navigate(`${basePath}/events/${res.event.id}`);
                  else refresh();
                } catch (e) {
                  showToast?.(e.message, 'error');
                }
              }}
            >
              Phê duyệt
            </button>
            <button
              type="button"
              className="ctsv-btn-danger"
              onClick={async () => {
                if (!note.trim()) return showToast?.('Nhập lý do từ chối.', 'error');
                try {
                  await rejectCtsvProposal(id, note);
                  showToast?.('Đã từ chối đề xuất.', 'info');
                  refresh();
                } catch (e) {
                  showToast?.(e.message, 'error');
                }
              }}
            >
              Từ chối
            </button>
            <button
              type="button"
              className="ctsv-btn-secondary"
              onClick={async () => {
                try {
                  await revisionCtsvProposal(id, note);
                  showToast?.('Đã yêu cầu CLB chỉnh sửa.', 'info');
                  refresh();
                } catch (e) {
                  showToast?.(e.message, 'error');
                }
              }}
            >
              Yêu cầu chỉnh sửa
            </button>
          </div>
        </div>
      )}

      {!isCtsv && canCtsvAct && (
        <p className="ctsv-muted">Tài khoản ICPDP/Admin: dùng luồng duyệt tương ứng trên cổng của bạn.</p>
      )}
    </div>
  );
};

export default CtsvProposalDetail;
