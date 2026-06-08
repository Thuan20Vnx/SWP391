import React, { useMemo, useState } from 'react';

const getReportPhase = (event) => {
  const now = Date.now();
  const start = event.startDate ? new Date(event.startDate).getTime() : 0;
  const end = event.endDate ? new Date(event.endDate).getTime() : start;
  if (end && now > end) return 'ended';
  if (start && now >= start && (!end || now <= end)) return 'live';
  return 'upcoming';
};

const phaseLabel = (phase) => {
  if (phase === 'live') return 'Đang diễn ra';
  if (phase === 'ended') return 'Đã kết thúc';
  return 'Sắp diễn ra';
};

const ClubEventReportsPanel = ({ events = [], loadingEvents = false, onViewReport }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');

  const reportEvents = useMemo(() => {
    return events
      .filter((ev) => ev.status === 'approved')
      .map((ev) => {
        const phase = getReportPhase(ev);
        const reg = ev.registeredCount || 0;
        const cap = ev.capacity || ev.totalTickets || 0;
        const fill = cap > 0 ? Math.round((reg / cap) * 100) : 0;
        const start = ev.startDate ? new Date(ev.startDate) : null;
        return {
          id: ev._id,
          title: ev.title,
          phase,
          reg,
          cap,
          fill,
          date: start ? start.toLocaleDateString('vi-VN') : '—',
          time: start
            ? start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : '—',
        };
      })
      .sort((a, b) => {
        const order = { live: 0, ended: 1, upcoming: 2 };
        return (order[a.phase] ?? 9) - (order[b.phase] ?? 9);
      });
  }, [events]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reportEvents.filter((ev) => {
      if (phaseFilter !== 'all' && ev.phase !== phaseFilter) return false;
      if (q && !ev.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [reportEvents, searchQuery, phaseFilter]);

  const stats = useMemo(() => {
    const ended = filtered.filter((ev) => ev.phase === 'ended').length;
    const live = filtered.filter((ev) => ev.phase === 'live').length;
    const avgFill = filtered.length
      ? Math.round(filtered.reduce((sum, ev) => sum + ev.fill, 0) / filtered.length)
      : 0;
    return { total: filtered.length, ended, live, avgFill };
  }, [filtered]);

  const phaseFilters = [
    { id: 'all', label: 'Tất cả' },
    { id: 'live', label: 'Đang diễn ra' },
    { id: 'ended', label: 'Đã kết thúc' },
    { id: 'upcoming', label: 'Sắp diễn ra' },
  ];

  return (
    <div className="clb-reports-panel">
      <div className="clb-page-header">
        <div>
          <h1 className="clb-page-title">BÁO CÁO SAU SỰ KIỆN</h1>
          <p className="clb-page-subtitle">
            Tổng hợp kết quả, minh chứng và danh sách tham dự các sự kiện đã duyệt.
          </p>
        </div>
      </div>

      <div className="clb-reports-toolbar">
        <div className="clb-reports-search">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
              fill="currentColor"
            />
          </svg>
          <input
            type="search"
            placeholder="Tìm theo tên sự kiện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="clb-reports-filters" role="group" aria-label="Lọc trạng thái">
          {phaseFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`clb-reports-filter ${phaseFilter === f.id ? 'is-active' : ''}`}
              onClick={() => setPhaseFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="clb-reports-summary">
        <article className="clb-reports-summary-card">
          <span>Sự kiện (đã lọc)</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="clb-reports-summary-card">
          <span>Đang diễn ra</span>
          <strong>{stats.live}</strong>
        </article>
        <article className="clb-reports-summary-card">
          <span>Đã kết thúc</span>
          <strong>{stats.ended}</strong>
        </article>
        <article className="clb-reports-summary-card">
          <span>Tỷ lệ lấp đầy TB</span>
          <strong>{stats.avgFill}%</strong>
        </article>
      </div>

      <div className="clb-table-wrapper">
        <div className="clb-table-scroll">
          <table className="clb-table">
            <thead>
              <tr>
                <th>SỰ KIỆN</th>
                <th>THỜI GIAN</th>
                <th>ĐĂNG KÝ</th>
                <th>TỶ LỆ LẤP ĐẦY</th>
                <th>TRẠNG THÁI</th>
                <th className="clb-table-col-action">HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {loadingEvents ? (
                <tr>
                  <td colSpan={6} className="clb-panel-empty-cell">
                    Đang tải...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="clb-panel-empty-cell">
                    {reportEvents.length === 0
                      ? 'Chưa có sự kiện đã duyệt để báo cáo.'
                      : 'Không có sự kiện phù hợp bộ lọc.'}
                  </td>
                </tr>
              ) : (
                filtered.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <span className="clb-event-name">{ev.title}</span>
                    </td>
                    <td>
                      <div className="clb-table-date">
                        <strong>{ev.date}</strong>
                        <span>{ev.time}</span>
                      </div>
                    </td>
                    <td>
                      <span className="clb-slot-nums">
                        {ev.reg}/{ev.cap || '—'}
                      </span>
                    </td>
                    <td>
                      <div className="clb-slot-cell">
                        <span className="clb-slot-nums">{ev.fill}%</span>
                        <div className="clb-slot-bar-bg">
                          <div className="clb-slot-bar-fill" style={{ width: `${ev.fill}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`clb-reports-phase clb-reports-phase--${ev.phase}`}>
                        {phaseLabel(ev.phase)}
                      </span>
                    </td>
                    <td className="clb-table-col-action">
                      <button
                        type="button"
                        className="clb-btn-secondary clb-reports-view-btn"
                        onClick={() => onViewReport?.(ev.id)}
                      >
                        Xem báo cáo
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClubEventReportsPanel;
