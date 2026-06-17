import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchCtsvReports, MOCK_REPORTS, DEMO_REPORT_EVENT_ID } from '../../services/ctsvApi';
import { getReportDisplayStatus, reportStatusClass } from '../../constants/ctsvReportDisplay';
import { REPORT_FILL_RATE_AVG_LABEL, REPORT_FILL_RATE_LABEL } from '../../constants/ctsvReportLabels';

const PHASE_FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'live', label: 'Đang diễn ra' },
  { id: 'ended', label: 'Đã kết thúc' }
];

const SOURCE_META = {
  school: { label: 'Cấp trường', tone: 'school' },
  partner: { label: 'Đối tác', tone: 'partner' },
  club: { label: 'CLB', tone: 'club' }
};

const phaseLabel = (phase) => {
  if (phase === 'live') return 'Đang diễn ra';
  if (phase === 'ended') return 'Đã kết thúc';
  return 'Đã diễn ra';
};

const fillTier = (pct) => {
  if (pct >= 80) return 'high';
  if (pct >= 40) return 'mid';
  if (pct > 0) return 'low';
  return 'empty';
};

const ReportRowSkeleton = () => (
  <tr className="ctsv-reports-row ctsv-reports-row--skeleton" aria-hidden>
    <td><div className="sk sk-line sk-line--lg" /></td>
    <td><div className="sk sk-line" /></td>
    <td className="ctsv-reports-metric-cell"><div className="sk sk-line sk-line--short" /></td>
    <td className="ctsv-reports-actions-cell"><div className="sk sk-btn" /></td>
  </tr>
);

const CtsvReports = () => {
  const { showToast } = useOutletContext() || {};
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    fetchCtsvReports()
      .then((d) => {
        const rows = (d.reports || []).map((r) => {
          const display = getReportDisplayStatus(r.reportPhase, r.statusKey);
          return { ...r, status: display.label, statusKey: display.statusKey };
        });
        setReports(rows);
      })
      .catch(() => {
        setReports(
          MOCK_REPORTS.map((r) => {
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
          <span className="ctsv-events-eyebrow">Báo cáo CTSV</span>
          <h1>Quản lý báo cáo sau sự kiện</h1>
          <p>
            Thống kê đăng ký và {REPORT_FILL_RATE_LABEL.toLowerCase()} cho sự kiện đang diễn ra hoặc đã
            kết thúc (mọi nguồn:
            trường, đối tác, CLB).
          </p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : stats.count}</span>
            <span className="ctsv-events-hero-stat-label">Sự kiện báo cáo</span>
          </div>
          {!loading && stats.liveCount > 0 && (
            <p className="ctsv-reports-hero-live">{stats.liveCount} đang diễn ra</p>
          )}
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
        <div className="ctsv-reports-table-head">
          <p className="ctsv-reports-table-head-title">Danh sách sự kiện</p>
          {!loading && (
            <span className="ctsv-reports-table-head-count">{filtered.length} sự kiện</span>
          )}
        </div>
        <table className="ctsv-reports-table">
          <thead>
            <tr>
              <th>Sự kiện</th>
              <th className="ctsv-reports-th-date">Ngày</th>
              <th className="ctsv-reports-th-metric">Đăng ký · {REPORT_FILL_RATE_LABEL.toLowerCase()}</th>
              <th className="ctsv-reports-th-actions">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <ReportRowSkeleton />
                <ReportRowSkeleton />
                <ReportRowSkeleton />
              </>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="ctsv-reports-empty">
                    <p className="ctsv-reports-empty-title">Chưa có báo cáo phù hợp</p>
                    <p className="ctsv-reports-empty-desc">
                      Báo cáo hiển thị khi sự kiện <strong>đang diễn ra</strong>,{' '}
                      <strong>đã kết thúc</strong> hoặc <strong>đã qua ngày tổ chức</strong>.
                      Publish sự kiện live hoặc chờ sự kiện kết thúc để thấy số liệu tại đây.
                    </p>
                    <Link to="/ctsv/events" className="ctsv-events-hero-cta">
                      Xem danh sách sự kiện
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const source = SOURCE_META[r.source] || SOURCE_META.club;
                const fill = Math.min(100, Math.max(0, r.attendanceRate ?? 0));
                const tier = fillTier(fill);
                const isLive = r.reportPhase === 'live';
                const detailPath = ['ended', 'completed'].includes(r.reportPhase)
                  ? `/ctsv/reports/${r.id}`
                  : `/ctsv/events/${r.id}`;
                const detailLabel = ['ended', 'completed'].includes(r.reportPhase) ? 'Xem báo cáo' : 'Chi tiết';

                return (
                  <tr
                    key={r.id}
                    className={`ctsv-reports-row${isLive ? ' ctsv-reports-row--live' : ''}`}
                  >
                    <td className="ctsv-reports-event-cell">
                      <strong>{r.title}</strong>
                      <div className="ctsv-reports-event-meta">
                        <span className={`ctsv-reports-source ctsv-reports-source--${source.tone}`}>
                          {source.label}
                        </span>
                        <span className={`ctsv-reports-phase ctsv-reports-phase--${r.reportPhase || 'completed'}`}>
                          {phaseLabel(r.reportPhase)}
                        </span>
                      </div>
                      {r.location ? (
                        <span className="ctsv-reports-event-location">{r.location}</span>
                      ) : null}
                    </td>
                    <td>
                      <div className="ctsv-reports-date-cell">
                        <span className="ctsv-reports-date-icon" aria-hidden>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <path d="M16 2v4M8 2v4M3 10h18" />
                          </svg>
                        </span>
                        <div>
                          <span className="ctsv-reports-date">{r.date}</span>
                          <span className="ctsv-reports-time">{r.time}</span>
                        </div>
                      </div>
                    </td>
                    <td className={`ctsv-reports-metric-cell${tier === 'empty' ? ' ctsv-reports-metric-cell--empty' : ''}`}>
                      <div className="ctsv-reports-metric-top">
                        <span className="ctsv-reports-reg">
                          <strong>{r.registeredCount ?? 0}</strong>
                          <span className="ctsv-reports-reg-cap"> / {r.totalTickets ?? 0}</span>
                        </span>
                        <span className={`ctsv-reports-fill-pct ctsv-reports-fill-pct--${tier}`}>{fill}%</span>
                      </div>
                      <div
                        className={`ctsv-reports-fill${tier === 'empty' ? ' ctsv-reports-fill--empty' : ''}`}
                        title={`${REPORT_FILL_RATE_LABEL}: ${fill}%`}
                      >
                        <div className="ctsv-reports-fill-bar" aria-hidden>
                          <span
                            className={`ctsv-reports-fill-progress ctsv-reports-fill-progress--${tier}`}
                            style={{ width: `${fill}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="ctsv-reports-actions-cell">
                      <div className="ctsv-reports-actions-stack">
                        <span className={`status-pill ${reportStatusClass(r.statusKey)}`}>
                          {r.status}
                        </span>
                        <Link
                          to={detailPath}
                          className="ctsv-reports-detail-btn"
                          state={r.id === DEMO_REPORT_EVENT_ID ? { demo: true } : undefined}
                        >
                          {detailLabel}
                          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
                            <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
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

export default CtsvReports;
