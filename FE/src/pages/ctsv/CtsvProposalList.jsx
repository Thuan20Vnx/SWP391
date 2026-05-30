import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchCtsvProposals } from '../../services/ctsvApi';
import { statusClass } from '../../utils/eventStatus';

const CtsvProposalList = () => {
  const { showToast } = useOutletContext() || {};
  const [proposals, setProposals] = useState([]);

  useEffect(() => {
    fetchCtsvProposals()
      .then((d) => setProposals(d.proposals || []))
      .catch(() => showToast?.('Không tải được đề xuất.', 'error'));
  }, [showToast]);

  return (
    <div className="ctsv-page">
      <h1>Quản lý đề xuất sự kiện từ CLB</h1>
      <p className="ctsv-muted">Danh sách đề xuất chờ ICPDP hoặc CTSV xử lý.</p>

      <div className="ctsv-table-wrap">
        <table className="ctsv-table">
          <thead>
            <tr>
              <th>Đề xuất</th>
              <th>CLB</th>
              <th>Ngày</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {proposals.length === 0 ? (
              <tr>
                <td colSpan={5} className="ctsv-muted">
                  Chưa có đề xuất. Chạy <code>node seed-events.js</code> ở BE.
                </td>
              </tr>
            ) : (
              proposals.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td>{p.clubName || '—'}</td>
                  <td>
                    {p.date} {p.time}
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(p.status, p.statusKey)}`}>{p.status}</span>
                  </td>
                  <td>
                    <Link to={`/ctsv/proposals/${p.id}`} className="ctsv-link-btn">
                      Xem &amp; duyệt
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CtsvProposalList;
