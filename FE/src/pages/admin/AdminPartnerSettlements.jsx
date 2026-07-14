import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAdminPartnerSettlements } from '../../services/adminApi';
import '../../styles/admin-partner-settlements.css';

const formatVnd = (n) => Number(n || 0).toLocaleString('vi-VN') + ' đ';
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—');

const STATUS_META = {
  none: { label: 'Chưa yêu cầu', cls: 'aps-pill--none' },
  requested: { label: 'Chờ tất toán', cls: 'aps-pill--requested' },
  paid: { label: 'Đã tất toán', cls: 'aps-pill--paid' },
};

export default function AdminPartnerSettlements({ showToast }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminPartnerSettlements();
      setItems(res.items || []);
    } catch (err) {
      showToast?.(err.message || 'Tải dữ liệu thất bại.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="aps-page">
      <div className="aps-head">
        <h1>Thanh toán sự kiện đối tác</h1>
        <p>Tất toán doanh thu vé cho các sự kiện do đối tác tổ chức. Bao gồm cả sự kiện miễn phí.</p>
      </div>

      {loading ? (
        <div className="aps-empty">Đang tải dữ liệu…</div>
      ) : (
        <div className="aps-card">
          <table className="aps-table">
            <thead>
              <tr>
                <th>Sự kiện</th>
                <th>Đối tác</th>
                <th>Ngày</th>
                <th style={{ textAlign: 'right' }}>Doanh thu đã thu</th>
                <th className="aps-center">Vé</th>
                <th className="aps-center">Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="aps-empty">
                    Chưa có sự kiện đối tác nào.
                  </td>
                </tr>
              )}
              {items.map((it) => {
                const meta = STATUS_META[it.settlementStatus] || STATUS_META.none;
                return (
                  <tr key={it.id} onClick={() => navigate(`/admin/partner-settlements/${it.id}`)}>
                    <td>
                      <div className="aps-row-title">{it.title}</div>
                    </td>
                    <td>{it.partnerName || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(it.startDate)}</td>
                    <td className="aps-num">{formatVnd(it.paidRevenue)}</td>
                    <td className="aps-center">
                      {it.ticketPrice > 0 ? `${it.paidCount || 0} đã trả` : 'Miễn phí'}
                    </td>
                    <td className="aps-center">
                      <span className={`aps-pill ${meta.cls}`}>{meta.label}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="aps-link">Chi tiết →</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
