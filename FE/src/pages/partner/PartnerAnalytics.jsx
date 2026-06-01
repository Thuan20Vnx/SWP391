import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchPartnerReports, PARTNER_MOCK_REPORTS } from '../../services/partnerApi';
import { getReportDisplayStatus, reportStatusClass } from '../../constants/ctsvReportDisplay';
import { REPORT_FILL_RATE_AVG_LABEL, REPORT_FILL_RATE_LABEL } from '../../constants/ctsvReportLabels';

const PHASE_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'live', label: 'Đang diễn ra' },
  { id: 'ended', label: 'Đã kết thúc' }
];

const phaseLabel = (phase) => {
  if (phase === 'live') return 'Đang diễn ra';
  if (phase === 'ended') return 'Đã kết thúc';
  return 'Đã diễn ra';
};

const ReportRowSkeleton = () => (
  <tr className="ctsv-reports-row ctsv-reports-row--skeleton" aria-hidden>
    <td><div className="sk sk-line sk-line--lg" /></td>
    <td><div className="sk sk-line" /></td>
    <td><div className="sk sk-line sk-line--short" /></td>
    <td className="ctsv-reports-fill-cell"><div className="sk sk-line sk-line--short" /></td>
    <td className="ctsv-reports-actions-cell"><div className="sk sk-btn" /></td>
  </tr>
);

const PartnerAnalytics = () => {
  const { showToast } = useOutletContext() || {};
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    fetchPartnerReports()
      .then((d) => {
        const rows = (d.reports || []).map((r) => {
          const display = getReportDisplayStatus(r.reportPhase, r.statusKey);
          return { ...r, status: display.label, statusKey: display.statusKey };
        });
        setReports(rows);
      })
      .catch(() => {
        setReports(
          PARTNER_MOCK_REPORTS.map((r) => {
            const display = getReportDisplayStatus(r.reportPhase, r.statusKey);
            return { ...r, status: display.label, statusKey: display.statusKey };
          })
        );
        showToast?.('Dùng dữ liệu demo — kiểm tra BE đang chạy.', 'info');
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reports.filter((r) => {
      if (phaseFilter === 'live' && r.reportPhase !== 'live') return false;
      if (phaseFilter === 'ended' && !['ended', 'completed'].includes(r.reportPhase)) return false;
      if (!q) return true;
      return (
        (r.title || '').toLowerCase().includes(q) ||
        (r.location || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q)
      );
    });
  }, [reports, searchQuery, phaseFilter]);

  const stats = useMemo(() => {
    const totalRegistered = filtered.reduce((s, r) => s + (r.registeredCount ?? 0), 0);
    const rates = filtered.map((r) => r.attendanceRate ?? 0).filter((n) => n > 0);
    const avgFill =
      rates.length > 0 ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
    const liveCount = filtered.filter((r) => r.reportPhase === 'live').length;
    return { count: filtered.length, totalRegistered, avgFill, liveCount };
  }, [filtered]);

  return (
    <div className="ctsv-reports-page">
      <header className="ctsv-events-hero ctsv-reports-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">Phân tích báo cáo</span>
          <h1>Hiệu suất sự kiện tài trợ</h1>
          <p>
            Báo cáo hiệu suất sự kiện, tỷ lệ check-in, ROI tài trợ và đánh giá từ sinh viên.
          </p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : stats.count}</span>
            <span className="ctsv-events-hero-stat-label">Sự kiện báo cáo</span>
          </div>
        </div>
      </header>

      <section className="ctsv-reports-toolbar">
        <div className="ctsv-reports-search">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
          <input
            type="search"
            placeholder="Tìm theo tên, địa điểm, chủ đề…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm báo cáo"
          />
        </div>
        <div className="ctsv-reports-phase-filters" role="group" aria-label="Lọc trạng thái">
          {PHASE_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ctsv-reports-phase-chip ${phaseFilter === f.id ? 'is-active' : ''}`}
              onClick={() => setPhaseFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <div className="ctsv-reports-summary">
        <div className="ctsv-reports-summary-card">
          <span className="ctsv-reports-summary-label">Tổng đăng ký (đã lọc)</span>
          <strong>{loading ? '—' : stats.totalRegistered.toLocaleString('vi-VN')}</strong>
        </div>
        <div className="ctsv-reports-summary-card">
          <span className="ctsv-reports-summary-label">{REPORT_FILL_RATE_AVG_LABEL}</span>
          <strong>{loading ? '—' : `${stats.avgFill}%`}</strong>
        </div>
      </div>

      <div className="ctsv-reports-table-card">
        <table className="ctsv-reports-table">
          <thead>
            <tr>
              <th>Sự kiện</th>
              <th>Ngày</th>
              <th>Đăng ký</th>
              <th className="ctsv-reports-th-fill">{REPORT_FILL_RATE_LABEL}</th>
              <th className="ctsv-reports-th-actions">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <ReportRowSkeleton />
                <ReportRowSkeleton />
              </>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="ctsv-reports-empty">
                    <p className="ctsv-reports-empty-title">Chưa có báo cáo phù hợp</p>
                    <Link to="/partner/events" className="ctsv-events-hero-cta">
                      Xem danh sách sự kiện
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const fill = Math.min(100, Math.max(0, r.attendanceRate ?? 0));
                return (
                  <tr key={r.id} className="ctsv-reports-row">
                    <td className="ctsv-reports-event-cell">
                      <strong>{r.title}</strong>
                      <div className="ctsv-reports-event-meta">
                        <span className="ctsv-reports-source ctsv-reports-source--partner">
                          Đối tác
                        </span>
                        <span className={`ctsv-reports-phase ctsv-reports-phase--${r.reportPhase || 'completed'}`}>
                          {phaseLabel(r.reportPhase)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="ctsv-reports-date">{r.date}</span>
                      <span className="ctsv-reports-time">{r.time}</span>
                    </td>
                    <td>
                      <span className="ctsv-reports-reg">
                        {r.registeredCount ?? 0}
                        <span className="ctsv-reports-reg-cap"> / {r.totalTickets ?? 0}</span>
                      </span>
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
                        <span className={`status-pill ${reportStatusClass(r.statusKey)}`}>
                          {r.status}
                        </span>
                        {['ended', 'completed'].includes(r.reportPhase) ? (
                          <Link to={`/partner/analytics/${r.id}`} className="ctsv-reports-detail-link">
                            Xem báo cáo
                          </Link>
                        ) : (
                          <Link to={`/partner/events/${r.id}`} className="ctsv-reports-detail-link">
                            Chi tiết
                          </Link>
                        )}
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

export default PartnerAnalytics;
