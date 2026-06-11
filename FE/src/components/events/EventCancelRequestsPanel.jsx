import React, { useMemo } from 'react';

const EventCancelRequestsPanel = ({ students = [] }) => {
  const cancelled = useMemo(
    () => students.filter((s) => s.status === 'cancelled' || s.status === 'Đã hủy'),
    [students]
  );

  const active = useMemo(
    () => students.filter((s) => s.status !== 'cancelled' && s.status !== 'Đã hủy'),
    [students]
  );

  return (
    <div className="ev-cancel-panel">
      <section className="ev-cancel-section">
        <h3 className="ev-overview-title">Vé đã hủy</h3>
        <p className="ev-cancel-hint">
          Sinh viên hủy vé trực tiếp từ trang sự kiện. Danh sách dưới đây là các vé đã được hủy.
        </p>
        <div className="ev-table-wrapper">
          <table className="ev-table">
            <thead>
              <tr>
                <th>MSSV</th>
                <th>HỌ VÀ TÊN</th>
                <th>THỜI GIAN HỦY</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {cancelled.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ev-panel-empty-cell">Chưa có yêu cầu hủy vé nào.</td>
                </tr>
              ) : (
                cancelled.map((row) => {
                  const s = row.student || {};
                  const cancelledAt = row.cancelledAt || row.updatedAt || row.createdAt;
                  return (
                    <tr key={row._id}>
                      <td>{s.studentId || '—'}</td>
                      <td>{s.fullname || '—'}</td>
                      <td>{cancelledAt ? new Date(cancelledAt).toLocaleString('vi-VN') : '—'}</td>
                      <td><span className="clb-category-text clb-category-text--rejected">Đã hủy</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ev-cancel-section">
        <h3 className="ev-overview-title">Vé đang giữ ({active.length})</h3>
        <p className="ev-cancel-hint">Sinh viên đang giữ vé và chưa hủy đăng ký.</p>
        <div className="ev-table-wrapper">
          <table className="ev-table">
            <thead>
              <tr>
                <th>MSSV</th>
                <th>HỌ VÀ TÊN</th>
                <th>THỜI GIAN ĐK</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {active.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ev-panel-empty-cell">Chưa có sinh viên đăng ký.</td>
                </tr>
              ) : (
                active.map((row) => {
                  const s = row.student || {};
                  const registeredAt = row.createdAt || row.registeredAt;
                  const checkedIn = row.status === 'checked-in' || row.status === 'attended';
                  return (
                    <tr key={row._id}>
                      <td>{s.studentId || '—'}</td>
                      <td>{s.fullname || '—'}</td>
                      <td>{registeredAt ? new Date(registeredAt).toLocaleString('vi-VN') : '—'}</td>
                      <td>
                        <span className={`clb-category-text ${checkedIn ? 'clb-category-text--approved' : 'clb-category-text--pending'}`}>
                          {checkedIn ? 'Đã check-in' : 'Chưa check-in'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default EventCancelRequestsPanel;
