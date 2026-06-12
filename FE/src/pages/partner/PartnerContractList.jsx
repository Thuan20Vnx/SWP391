import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import PortalDashHero from '../../components/portal/PortalDashHero';
import { fetchPartnerContracts, PARTNER_MOCK_CONTRACTS } from '../../services/partnerApi';
import { formatPartnerDate, formatVnd } from '../../utils/partnerDisplay';

const CONTRACT_STATUS_LABEL = {
  draft: 'Nháp',
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối'
};

const CONTRACT_STATUS_TONE = {
  draft: 'slate',
  pending: 'amber',
  approved: 'green',
  rejected: 'red'
};

const PartnerContractList = () => {
  const { showToast, userProfile } = useOutletContext() || {};
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPartnerContracts()
      .then((d) => setContracts(d.contracts || []))
      .catch(() => {
        setContracts(PARTNER_MOCK_CONTRACTS);
        showToast?.('Dùng dữ liệu demo — kiểm tra BE đang chạy.', 'info');
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  const totalAmount = useMemo(
    () => contracts.reduce((s, c) => s + (Number(c.amount) || 0), 0),
    [contracts]
  );

  return (
    <div className="ctsv-dashboard">
      <PortalDashHero
        fullname={userProfile?.fullname}
        eyebrow="Hợp đồng tài trợ"
        description="Xem và quản lý hợp đồng tài trợ, thanh toán và lịch sử giao dịch với FPT University."
        actions={
          <Link to="/partner/proposals/create" className="ctsv-dash-btn ctsv-dash-btn--primary">
            Tạo sự kiện mới
          </Link>
        }
      />

      <section className="ctsv-dash-stats" aria-label="Tổng hợp đồng">
        <div className="ctsv-dash-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="ctsv-dash-stat-card ctsv-dash-stat-card--amber">
            <div className="ctsv-dash-stat-body">
              <span className="ctsv-dash-stat-label">Tổng hợp đồng</span>
              <strong className="ctsv-dash-stat-value">{loading ? '—' : contracts.length}</strong>
            </div>
          </div>
          <div className="ctsv-dash-stat-card ctsv-dash-stat-card--green">
            <div className="ctsv-dash-stat-body">
              <span className="ctsv-dash-stat-label">Tổng giá trị</span>
              <strong className="ctsv-dash-stat-value">{loading ? '—' : formatVnd(totalAmount)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="ctsv-partners-card" aria-busy={loading}>
        {loading ? (
          <p className="ctsv-muted">Đang tải hợp đồng…</p>
        ) : contracts.length === 0 ? (
          <div className="ctsv-dash-empty">
            <p>Chưa có hợp đồng tài trợ nào.</p>
            <Link to="/partner/proposals/create" className="ctsv-dash-btn ctsv-dash-btn--primary">
              Gửi đề xuất đầu tiên
            </Link>
          </div>
        ) : (
          <div className="ctsv-table-wrap">
            <table className="ctsv-table">
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Giá trị</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  const tone = CONTRACT_STATUS_TONE[c.status] || 'slate';
                  return (
                    <tr key={c.id} className="ctsv-reports-row">
                      <td>
                        <strong>{c.title}</strong>
                        {c.proposedEventTitle && c.proposedEventTitle !== c.title && (
                          <span className="ctsv-muted" style={{ display: 'block', fontSize: 13 }}>
                            {c.proposedEventTitle}
                          </span>
                        )}
                      </td>
                      <td>{formatVnd(c.amount)}</td>
                      <td>
                        <span className={`ctsv-pd-status ctsv-pd-status--${tone}`}>
                          {CONTRACT_STATUS_LABEL[c.status] || c.status}
                        </span>
                      </td>
                      <td>{formatPartnerDate(c.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default PartnerContractList;
