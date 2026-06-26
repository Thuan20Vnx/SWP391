import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import ApprovalListPagination from '../../components/approval/ApprovalListPagination';
import ClubProposalReviewCard from '../../components/approval/ClubProposalReviewCard';
import useAdminEventsLiveStream from '../../hooks/useAdminEventsLiveStream';
import { fetchCtsvProposalsForApproval } from '../../services/ctsvApi';
import { isAdminRole } from '../../utils/auth';
import { PORTAL_EVENTS_LIVE_EVENT } from '../../utils/adminEventsLiveEvents';
import '../../styles/admin-dashboard.css';
import '../../styles/admin-public-pages.css';

const PAGE_SIZE = 6;

const CtsvProposalList = () => {
  const { showToast } = useOutletContext() || {};
  const navigate = useNavigate();
  const basePath = isAdminRole() ? '/admin/ctsv' : '/ctsv';
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useAdminEventsLiveStream(true);

  const load = useCallback(({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    return fetchCtsvProposalsForApproval({ status: 'all' })
      .then((d) => setProposals(d.proposals || []))
      .catch(() => showToast?.('Không tải được đề xuất.', 'error'))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onLive = () => load({ silent: true });
    window.addEventListener(PORTAL_EVENTS_LIVE_EVENT, onLive);
    return () => window.removeEventListener(PORTAL_EVENTS_LIVE_EVENT, onLive);
  }, [load]);

  const pending = useMemo(
    () => proposals.filter((p) => ['pending_ctsv', 'pending_admin', 'pending_icpdp'].includes(p.statusKey)),
    [proposals]
  );

  const totalPages = Math.max(1, Math.ceil(pending.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return pending.slice(start, start + PAGE_SIZE);
  }, [pending, pageSafe]);

  return (
    <div className="ctsv-page admin-events-page">
      <header className="ctsv-events-hero" style={{ marginBottom: 20 }}>
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">CTSV</span>
          <h1>Đề xuất sự kiện từ CLB</h1>
          <p className="ctsv-muted">
            Danh sách đề xuất chờ xử lý — xem bảng kế hoạch trực tiếp trên thẻ trước khi phê duyệt.
          </p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : pending.length}</span>
            <span className="ctsv-events-hero-stat-label">Chờ xử lý</span>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="admin-events-page__loading">
          <span className="btn-spinner admin-events-page__spinner" aria-hidden="true" />
          <p>Đang tải…</p>
        </div>
      ) : pending.length === 0 ? (
        <p className="ctsv-muted">Chưa có đề xuất chờ duyệt.</p>
      ) : (
        <>
          <ul className="admin-proposal-list">
            {pageItems.map((p, idx) => {
              const listIndex = (pageSafe - 1) * PAGE_SIZE + idx;
              const detailPath = p.linkedEventId
                ? `${basePath}/events/${p.linkedEventId}`
                : `${basePath}/proposals/${p.id}`;
              return (
                <ClubProposalReviewCard
                  key={p.id}
                  proposal={p}
                  index={listIndex}
                  footer={(
                    <div className="adm-ev-detail-bar">
                      <button
                        type="button"
                        className="adm-ev-detail-btn"
                        onClick={() => navigate(detailPath)}
                      >
                        Xem &amp; duyệt
                      </button>
                    </div>
                  )}
                />
              );
            })}
          </ul>
          <ApprovalListPagination
            page={pageSafe}
            totalItems={pending.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
};

export default CtsvProposalList;
