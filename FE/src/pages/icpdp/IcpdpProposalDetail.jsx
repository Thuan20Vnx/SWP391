import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';

import EventManagementDetail from '../EventManagementDetail';
import { fetchIcpdpProposal } from '../../services/icpdpApi';

const IcpdpProposalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useOutletContext() || {};
  const listPath = location.pathname.startsWith('/admin/') ? '/admin/events' : '/icpdp/proposals';
  const [proposal, setProposal] = useState(null);

  useEffect(() => {
    fetchIcpdpProposal(id)
      .then((d) => setProposal(d.proposal))
      .catch(() => {
        showToast?.('Không tải được đề xuất.', 'error');
        navigate(listPath);
      });
  }, [id, listPath, navigate, showToast]);

  if (!proposal) {
    return (
      <div className="ev-detail-content">
        <main className="ev-detail-main">
          <p style={{ color: '#94a3b8' }}>Đang tải chi tiết đề xuất…</p>
        </main>
      </div>
    );
  }

  const eventId = proposal.linkedEventId;
  if (!eventId) {
    return (
      <div className="ev-detail-content">
        <main className="ev-detail-main">
          <p style={{ color: '#94a3b8' }}>Không tìm thấy sự kiện liên kết với đề xuất này.</p>
        </main>
      </div>
    );
  }

  return (
    <EventManagementDetail
      portal="icpdp"
      eventIdOverride={eventId}
      proposalId={id}
      proposalData={proposal}
      listPath={listPath}
    />
  );
};

export default IcpdpProposalDetail;
