import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCtsvReports } from '../../services/ctsvApi';

const CtsvReports = () => {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetchCtsvReports()
      .then((d) => setReports(d.reports || []))
      .catch(() => setReports([]));
  }, []);

  return (
    <div className="ctsv-page">
      <h1>Quản lý báo cáo sau sự kiện</h1>
      <p className="ctsv-muted">Thống kê tham dự và tình trạng sự kiện đã/đang diễn ra.</p>

      <div className="ctsv-table-wrap">
        <table className="ctsv-table">
          <thead>
            <tr>
              <th>Sự kiện</th>
              <th>Ngày</th>
              <th>Đăng ký</th>
              <th>Tỷ lệ lấp đầy</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={5} className="ctsv-muted">
                  Chưa có báo cáo. Sự kiện <code>live</code> hoặc <code>ended</code> sẽ hiển thị tại đây.
                </td>
              </tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>
                    {r.date} {r.time}
                  </td>
                  <td>
                    {r.registeredCount ?? 0}/{r.totalTickets}
                  </td>
                  <td>{r.attendanceRate ?? 0}%</td>
                  <td>
                    <Link to={`/ctsv/events/${r.id}`} className="ctsv-link-btn">
                      Chi tiết
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

export default CtsvReports;
