import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import CtsvNavIcon from '../../components/ctsv/CtsvNavIcon';
import PortalDashHero from '../../components/portal/PortalDashHero';
import {
  fetchIcpdpEvents,
  fetchIcpdpPerformance,
  fetchIcpdpProposals,
  fetchIcpdpStats,
} from '../../services/icpdpApi';
import { isPendingApproval, statusClass } from '../../utils/eventStatus';

const STAT_STYLES = [
  { tone: 'amber', icon: 'publish', hint: 'Đề xuất từ CLB', link: '/icpdp/proposals' },
  { tone: 'green', icon: 'calendar', hint: 'Sự kiện CLB đang diễn ra', link: '/icpdp/events' },
  { tone: 'orange', icon: 'reports', hint: 'Tổng lượt đăng ký', link: '/icpdp/reports' }
];

const QUICK_ACTIONS = [
  { path: '/icpdp/proposals', label: 'Duyệt đề xuất CLB', desc: 'Xét duyệt nội bộ', icon: 'publish' },
  { path: '/icpdp/events/create', label: 'Tạo sự kiện cấp trường', desc: 'Gửi đơn như CTSV', icon: 'create' },
  { path: '/icpdp/events', label: 'Xem sự kiện', desc: 'Tất cả sự kiện', icon: 'calendar' },
  { path: '/icpdp/calendar', label: 'Lịch toàn trường', desc: 'Lịch tổng hợp', icon: 'calendar' },
  { path: '/icpdp/reports', label: 'Báo cáo sau SK', desc: 'Tổng hợp kết quả', icon: 'reports' }
];

const IcpdpDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [events, setEvents] = useState([]);
  const [pendingProposals, setPendingProposals] = useState([]);
  const [performance, setPerformance] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchIcpdpStats().catch(() => ({ stats: [] })),
      fetchIcpdpEvents().catch(() => ({ events: [] })),
      fetchIcpdpProposals({ status: 'pending_icpdp' }).catch(() => ({ proposals: [] })),
      fetchIcpdpPerformance().catch(() => ({ performance: [] })),
    ])
      .then(([statsRes, eventsRes, proposalsRes, perfRes]) => {
        if (cancelled) return;
        setStats(statsRes.stats || []);
        const list = eventsRes.events || [];
        setEvents(list);
        setPendingProposals((proposalsRes.proposals || []).slice(0, 5));
        setPerformance(perfRes.performance || []);
      })
      .catch(() => {
        if (cancelled) return;
        setEvents([]);
        setPendingProposals([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const recentEvents = useMemo(() => events.slice(0, 5), [events]);

  const pendingCount = pendingProposals.length;

  return (
    <div className="ctsv-dashboard">
      <PortalDashHero
        fullname={userProfile?.fullname}
        description="Tổng quan đề xuất CLB chờ duyệt, sự kiện CLB và báo cáo — IC-PDP quản lý hoạt động Câu lạc bộ."
        badgeValue={pendingCount}
        badgeLabel="đề xuất chờ duyệt"
        actions={
          <>
            <Link to="/icpdp/proposals" className="ctsv-dash-btn ctsv-dash-btn--primary">
              Duyệt đề xuất CLB
            </Link>
            <Link to="/icpdp/reports" className="ctsv-dash-btn ctsv-dash-btn--ghost">
              Xem báo cáo
            </Link>
          </>
        }
      />

      <Link to="/icpdp/events/create" className="ctsv-dash-create-card">
        <span className="ctsv-dash-create-card__icon">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/>
          </svg>
        </span>
        <span className="ctsv-dash-create-card__body">
          <strong>Tạo sự kiện cấp trường</strong>
          <span>Tạo sự kiện cấp trường do IC-PDP tổ chức và gửi lên Admin phê duyệt.</span>
        </span>
        <span className="ctsv-dash-create-card__arrow" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"
              fill="currentColor"
            />
          </svg>
        </span>
      </Link>

      <section className="ctsv-dash-quick" aria-label="Thao tác nhanh">
        <div className="ctsv-dash-section-head">
          <h2>Thao tác nhanh</h2>
          <p>Lối tắt tới các màn quản trị CLB</p>
        </div>
        <div className="ctsv-dash-quick-grid">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.path}
              type="button"
              className="ctsv-dash-quick-card"
              onClick={() => navigate(action.path)}
            >
              <span className="ctsv-dash-quick-icon">
                <CtsvNavIcon type={action.icon} />
              </span>
              <span className="ctsv-dash-quick-label">{action.label}</span>
              <span className="ctsv-dash-quick-desc">{action.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="ctsv-dash-stats" aria-label="Thống kê nhanh">
        <div className="ctsv-dash-stats-grid">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="ctsv-dash-stat-card ctsv-dash-stat-card--skeleton" />
              ))
            : stats.map((item, index) => {
                const meta = STAT_STYLES[index] || STAT_STYLES[0];
                return (
                  <Link
                    key={item.label}
                    to={meta.link}
                    className={`ctsv-dash-stat-card ctsv-dash-stat-card--${meta.tone}`}
                  >
                    <div className={`ctsv-dash-stat-icon ctsv-dash-stat-icon--${meta.tone}`}>
                      <CtsvNavIcon type={meta.icon} />
                    </div>
                    <div className="ctsv-dash-stat-body">
                      <span className="ctsv-dash-stat-label">{item.label}</span>
                      <div className="ctsv-dash-stat-value-row">
                        <strong className="ctsv-dash-stat-value">{item.value}</strong>
                        <span className="ctsv-dash-stat-trend">{item.trend}</span>
                      </div>
                      <span className="ctsv-dash-stat-hint">{meta.hint}</span>
                    </div>
                  </Link>
                );
              })}
        </div>
      </section>

      <section className="icpdp-perf-section" aria-label="Hiệu suất quản lý">
        <div className="icpdp-perf-grid">
          {performance.map((item, i) => {
            const accents = ['#f26f21', '#10b981', '#6366f1'];
            const accent = accents[i] || accents[0];
            const r = 36;
            const circ = 2 * Math.PI * r;
            const offset = circ - (item.rate / 100) * circ;
            return (
              <div key={item.name} className="icpdp-perf-card" style={{ '--perf-accent': accent, '--perf-track': '#e2e8f0' }}>
                <div className="icpdp-perf-card__ring-wrap">
                  <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden>
                    <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
                    <circle
                      cx="44" cy="44" r={r} fill="none"
                      stroke={accent} strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      strokeDashoffset={offset}
                      transform="rotate(-90 44 44)"
                      style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                    />
                  </svg>
                  <span className="icpdp-perf-card__ring-value">{item.rate}%</span>
                </div>
                <div className="icpdp-perf-card__body">
                  <span className="icpdp-perf-card__name">{item.name}</span>
                  <div className="icpdp-perf-card__bar-track">
                    <div className="icpdp-perf-card__bar-fill" style={{ width: `${item.rate}%` }} />
                  </div>
                  <span className="icpdp-perf-card__sub">30 ngày qua</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="ctsv-dash-columns">
        <section className="ctsv-dash-panel">
          <div className="ctsv-dash-panel__head">
            <div>
              <h2>Sự kiện gần đây</h2>
              <p>Cập nhật mới nhất từ hệ thống</p>
            </div>
            <Link to="/icpdp/events" className="ctsv-dash-link">
              Xem tất cả
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                <path
                  d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"
                  fill="currentColor"
                />
              </svg>
            </Link>
          </div>

          {loading ? (
            <div className="ctsv-dash-event-list">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="ctsv-dash-event-row ctsv-dash-event-row--skeleton" />
              ))}
            </div>
          ) : recentEvents.length === 0 ? (
            <div className="ctsv-dash-empty">
              <p>Chưa có sự kiện nào.</p>
            </div>
          ) : (
            <div className="ctsv-dash-event-list">
              {recentEvents.map((ev) => (
                <article key={ev.id} className="ctsv-dash-event-row">
                  <div className="ctsv-dash-event-thumb">
                    <img src={ev.image} alt="" loading="lazy" />
                  </div>
                  <div className="ctsv-dash-event-main">
                    <div className="ctsv-dash-event-meta-row">
                      <span className="ctsv-dash-event-category">{ev.category}</span>
                      <span className={`ctsv-dash-event-source ctsv-dash-event-source--${ev.source || 'club'}`}>
                        {ev.source === 'school' ? 'Trường' : ev.source === 'partner' ? 'Đối tác' : ev.source === 'icpdp' ? 'IC-PDP' : 'CLB'}
                      </span>
                    </div>
                    <h3>{ev.title}</h3>
                    <p>
                      {ev.date} · {ev.time}
                      {ev.location ? ` · ${ev.location}` : ''}
                    </p>
                  </div>
                  <div className="ctsv-dash-event-aside">
                    <span className={`status-pill ${statusClass(ev.status, ev.statusKey)}`}>
                      {ev.status}
                    </span>
                    <Link
                      to={`/icpdp/events/${ev.id}`}
                      className="ctsv-dash-event-cta"
                    >
                      Chi tiết
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="ctsv-dash-side">
          <section className="ctsv-dash-panel ctsv-dash-panel--accent">
            <div className="ctsv-dash-panel__head">
              <div>
                <h2>Cần xử lý</h2>
                <p>Đề xuất CLB chờ IC-PDP duyệt</p>
              </div>
              {pendingCount > 0 && (
                <span className="ctsv-dash-pill-count">{pendingCount}</span>
              )}
            </div>
            {loading ? (
              <div className="ctsv-dash-pending-list">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="ctsv-dash-pending-item ctsv-dash-pending-item--skeleton" />
                ))}
              </div>
            ) : pendingProposals.length === 0 ? (
              <p className="ctsv-dash-side-empty">Không có đề xuất CLB chờ duyệt. Tuyệt vời!</p>
            ) : (
              <ul className="ctsv-dash-pending-list">
                {pendingProposals.map((p) => (
                  <li key={p.id || p._id}>
                    <button
                      type="button"
                      className="ctsv-dash-pending-item"
                      onClick={() => navigate(`/icpdp/proposals/${p.id || p._id}`)}
                    >
                      <span className="ctsv-dash-pending-title">{p.title}</span>
                      <span className="ctsv-dash-pending-meta">
                        {p.clubName || 'Chưa xác định CLB'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/icpdp/proposals" className="ctsv-dash-side-link">
              Xem tất cả đề xuất →
            </Link>
          </section>


          <section className="ctsv-dash-panel ctsv-dash-panel--compact">
            <h2 className="ctsv-dash-side-title">Gợi ý tuần này</h2>
            <ul className="ctsv-dash-tips">
              <li>
                <CtsvNavIcon type="publish" />
                <span>CLB gửi đề xuất → IC-PDP duyệt nội bộ → Admin phê duyệt cuối cùng.</span>
              </li>
              <li>
                <CtsvNavIcon type="calendar" />
                <span>Kiểm tra lịch toàn trường để tránh xung đột thời gian khi duyệt.</span>
              </li>
              <li>
                <CtsvNavIcon type="reports" />
                <span>Nghiệm thu báo cáo CLB sau sự kiện để tính điểm hoạt động.</span>
              </li>
            </ul>
            <Link to="/icpdp/calendar" className="ctsv-dash-btn ctsv-dash-btn--outline ctsv-dash-btn--block">
              Mở lịch toàn trường
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default IcpdpDashboard;
