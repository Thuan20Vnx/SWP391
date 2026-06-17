import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  approveCtsvProposal,
  fetchCtsvProposal,
  rejectCtsvProposal,
  revisionCtsvProposal
} from '../../services/ctsvApi';
import ProposalTicketsTable from '../../components/admin/ProposalTicketsTable';
import { canCtsvFinalApprove, getUserRole } from '../../utils/auth';
import { statusClass } from '../../utils/eventStatus';

const CtsvProposalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [proposal, setProposal] = useState(null);
  const [note, setNote] = useState('');
  const isCtsv = getUserRole() === 'ctsv';
  const canFinalApprove = canCtsvFinalApprove();

  useEffect(() => {
    fetchCtsvProposal(id)
      .then((d) => setProposal(d.proposal))
      .catch(() => {
        showToast?.('Không tải được đề xuất.', 'error');
        navigate('/ctsv/proposals');
      });
  }, [id, navigate, showToast]);

  const refresh = () => fetchCtsvProposal(id).then((d) => setProposal(d.proposal));

  if (!proposal) return <div className="ctsv-page"><p className="ctsv-muted">Đang tải...</p></div>;

  const canCtsvAct =
    proposal.statusKey === 'pending_admin' ||
    (['pending_ctsv', 'pending_icpdp'].includes(proposal.statusKey) && !proposal.linkedEventId);

  return (
    <div className="ctsv-page">
      <Link to="/ctsv/proposals" className="ctsv-back-link">
        ← Đề xuất CLB
      </Link>
      <span className={`status-pill ${statusClass(proposal.status, proposal.statusKey)}`}>{proposal.status}</span>
      <h1>{proposal.title}</h1>
      <p className="ctsv-muted">
        {proposal.clubName} • {proposal.date} {proposal.time} • {proposal.location}
      </p>

      <div className="ctsv-panel">
        <p>{proposal.description || 'Không có mô tả.'}</p>
        <p>Số vé dự kiến: {proposal.totalTickets}</p>
        <ProposalTicketsTable
          ticketTypes={proposal.ticketTypes}
          ticketPrice={proposal.ticketPrice}
        />
        {proposal.ctsvNote && <p>Ghi chú CTSV: {proposal.ctsvNote}</p>}
        {proposal.icpdpNote && <p>Ghi chú ICPDP: {proposal.icpdpNote}</p>}
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
                  if (res.event?.id) navigate(`/ctsv/events/${res.event.id}`);
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
        <p className="ctsv-muted">Tài khoản ICPDP: dùng bước duyệt nội bộ trước khi chuyển CTSV (API icpdp-approve).</p>
      )}
    </div>
  );
};

export default CtsvProposalDetail;
