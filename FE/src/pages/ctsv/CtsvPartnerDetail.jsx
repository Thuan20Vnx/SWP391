import React, { useEffect, useState } from 'react';
import { Link, useParams, useOutletContext } from 'react-router-dom';
import {
  approveCtsvContract,
  approveCtsvPartner,
  fetchCtsvPartner,
  rejectCtsvPartner
} from '../../services/ctsvApi';
import { getUserRole } from '../../utils/auth';

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

  if (!partner) return <div className="ctsv-page"><p className="ctsv-muted">Đang tải...</p></div>;

  return (
    <div className="ctsv-page">
      <Link to="/ctsv/partners" className="ctsv-back-link">
        ← Đối tác
      </Link>
      <h1>{partner.name}</h1>
      <p className="ctsv-muted">
        {partner.email} • {partner.phone}
      </p>

      <div className="ctsv-panel">
        <p>Đại diện: {partner.representative}</p>
        <p>Địa chỉ: {partner.address || '—'}</p>
        <p>{partner.description}</p>
        <p>Trạng thái: {partner.status}</p>
      </div>

      <h2>Hợp đồng</h2>
      <div className="ctsv-table-wrap">
        <table className="ctsv-table">
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Giá trị</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c._id}>
                <td>{c.title}</td>
                <td>{c.amount?.toLocaleString('vi-VN')} đ</td>
                <td>{c.status}</td>
                <td>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {partner.status === 'pending' && isCtsv && (
        <div className="ctsv-action-panel">
          <textarea
            className="ctsv-textarea"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lý do từ chối (nếu có)"
            rows={2}
          />
          <div className="ctsv-action-buttons">
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
            <button
              type="button"
              className="ctsv-btn-danger"
              onClick={async () => {
                try {
                  await rejectCtsvPartner(id, reason);
                  showToast?.('Đã từ chối.', 'info');
                  load();
                } catch (e) {
                  showToast?.(e.message, 'error');
                }
              }}
            >
              Từ chối
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CtsvPartnerDetail;
