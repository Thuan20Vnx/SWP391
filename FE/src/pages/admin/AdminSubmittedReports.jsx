import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchAdminSubmittedCtsvReports } from '../../services/adminApi';
import { REPORT_FILL_RATE_AVG_LABEL } from '../../constants/ctsvReportLabels';

const SOURCE_META = {
  school: { label: 'Cấp trường', tone: 'school' },
  partner: { label: 'Đối tác', tone: 'partner' },
  club: { label: 'CLB', tone: 'club' },
};

const AdminSubmittedReports = () => {
  const { showToast } = useOutletContext() || {};
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchAdminSubmittedCtsvReports()
      .then((data) => setReports(data.reports || []))
      .catch((error) => showToast?.(error.message || 'Không tải được báo cáo CTSV.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((report) =>
      [report.title, report.location, report.category, report.submittedByEmail]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [reports, searchQuery]);

  const summary = useMemo(() => {
    const totalRegs = filteredReports.reduce((sum, report) => sum + Number(report.registeredCount || 0), 0);
    const avgFill = filteredReports.length
      ? Math.round(filteredReports.reduce((sum, report) => sum + Number(report.fillRate || 0), 0) / filteredReports.length)
      : 0;
    return { totalRegs, avgFill };
  }, [filteredReports]);

  return (
    <div className="ctsv-reports-page">
      <header className="ctsv-events-hero ctsv-reports-hero">
        <div>
          <span className="ctsv-events-eyebrow">Admin / Báo cáo đơn vị</span>
          <h1>Báo cáo đơn vị đã gửi lên Admin</h1>
          <p>Admin xem lại các báo cáo kết thúc sự kiện do Công tác sinh viên hoặc IC-PDP gửi lên, mở chi tiết để đối chiếu số liệu và đánh giá.</p>
        </div>
      </header>

      <section className="ctsv-reports-toolbar">
        <div className="ctsv-reports-search">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên sự kiện, địa điểm, email người gửi..."
          />
        </div>
      </section>

      <div className="ctsv-reports-summary">
        <div className="ctsv-reports-summary-card">
          <span className="ctsv-reports-summary-label">Tổng đăng ký (đã lọc)</span>
          <strong>{summary.totalRegs}</strong>
        </div>
        <div className="ctsv-reports-summary-card">
          <span className="ctsv-reports-summary-label">{REPORT_FILL_RATE_AVG_LABEL}</span>
          <strong>{summary.avgFill}%</strong>
        </div>
      </div>

      <div className="ctsv-reports-table-card">
        <table className="ctsv-reports-table">
          <thead>
            <tr>
              <th>Sự kiện</th>
              <th className="ctsv-reports-th-fill">Lấp đầy</th>
              <th className="ctsv-reports-th-actions">Admin xem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="ctsv-reports-row ctsv-reports-row--skeleton" aria-hidden>
                <td><div className="sk sk-line sk-line--md" /></td>
                <td className="ctsv-reports-fill-cell"><div className="sk sk-line sk-line--short" /></td>
                <td className="ctsv-reports-actions-cell"><div className="sk sk-btn" /></td>
              </tr>
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <div className="ctsv-reports-empty">
                    <p className="ctsv-reports-empty-title">Chưa có báo cáo được gửi</p>
                    <p className="ctsv-reports-empty-desc">Sau khi đơn vị gửi báo cáo lên Admin, danh sách sẽ hiện tại đây.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredReports.map((report) => {
                const source = SOURCE_META[report.source] || SOURCE_META.school;
                const fill = Number(report.fillRate || 0);
                return (
                  <tr key={report.reportId} className="ctsv-reports-row">
                    <td className="ctsv-reports-event-cell">
                      <strong>{report.title}</strong>
                      <div className="ctsv-reports-event-meta">
                        <span className={`ctsv-reports-source ctsv-reports-source--${source.tone}`}>{source.label}</span>
                        <span className={`ctsv-reports-phase ctsv-reports-phase--${report.reportPhase || 'ended'}`}>Đã gửi</span>
                      </div>
                      <span className="ctsv-reports-date">{report.date}</span>
                      <span className="ctsv-reports-time">{report.time}</span>
                      <span className="ctsv-reports-reg">
                        {report.registeredCount ?? 0}
                        <span className="ctsv-reports-reg-cap"> / {report.totalTickets ?? 0}</span>
                      </span>
                      <span className="ctsv-rd-muted">Gửi bởi {report.submittedByEmail || 'CTSV'}</span>
                    </td>
                    <td className="ctsv-reports-fill-cell">
                      <div className="ctsv-reports-fill">
                        <div className="ctsv-reports-fill-bar" aria-hidden>
                          <span className="ctsv-reports-fill-progress" style={{ width: `${fill}%` }} />
                        </div>
                        <span className="ctsv-reports-fill-pct">{fill}%</span>
                      </div>
                    </td>
                    <td className="ctsv-reports-actions-cell">
                      <div className="ctsv-reports-actions-stack">
                        <Link to={`/admin/ctsv-reports/${report.reportId}`} className="ctsv-reports-detail-link">
                          Xem chi tiết
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSubmittedReports;
