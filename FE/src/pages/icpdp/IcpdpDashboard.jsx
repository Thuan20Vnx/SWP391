import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import CtsvNavIcon from '../../components/ctsv/CtsvNavIcon';
import PortalDashHero from '../../components/portal/PortalDashHero';
import {
  fetchIcpdpEvents,
  fetchIcpdpProposals,
  fetchIcpdpStats,
  ICPDP_MOCK_EVENTS,
  ICPDP_MOCK_STATS,
  ICPDP_PERFORMANCE,
  ICPDP_RECENT_ACTIVITY
} from '../../services/icpdpApi';
import { isPendingApproval, statusClass } from '../../utils/eventStatus';

const STAT_STYLES = [
  { tone: 'amber', icon: 'publish', hint: 'Đề xuất từ CLB', link: '/icpdp/proposals' },
  { tone: 'green', icon: 'calendar', hint: 'Sự kiện CLB đang diễn ra', link: '/icpdp/events' },
  { tone: 'orange', icon: 'reports', hint: 'Tổng lượt đăng ký', link: '/icpdp/reports' }
];

const QUICK_ACTIONS = [
  { path: '/icpdp/proposals', label: 'Duyệt đề xuất CLB', desc: 'Xét duyệt nội bộ', icon: 'publish' },
  { path: '/icpdp/events', label: 'Xem sự kiện', desc: 'Tất cả sự kiện', icon: 'calendar' },
  { path: '/icpdp/calendar', label: 'Lịch toàn trường', desc: 'Lịch tổng hợp', icon: 'calendar' },
  { path: '/icpdp/reports', label: 'Báo cáo sau SK', desc: 'Tổng hợp kết quả', icon: 'reports' }
];

const IcpdpDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(ICPDP_MOCK_STATS);
  const [events, setEvents] = useState([]);
  const [pendingProposals, setPendingProposals] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchIcpdpStats().catch(() => ({ stats: ICPDP_MOCK_STATS })),
      fetchIcpdpEvents().catch(() => ({ events: [] })),
      fetchIcpdpProposals({ status: 'pending_icpdp' }).catch(() => ({ proposals: [] }))
    ])
      .then(([statsRes, eventsRes, proposalsRes]) => {
        if (cancelled) return;
        setStats(statsRes.stats?.length ? statsRes.stats : ICPDP_MOCK_STATS);
        const list = eventsRes.events || [];
        setEvents(list);
        setPendingProposals((proposalsRes.proposals || []).slice(0, 5));
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

      <Link to="/icpdp/proposals" className="ctsv-dash-create-card">
        <span className="ctsv-dash-create-card__icon">
          <CtsvNavIcon type="publish" />
        </span>
        <span className="ctsv-dash-create-card__body">
          <strong>Duyệt đề xuất CLB</strong>
          <span>Xét duyệt nội bộ các đề xuất sự kiện từ Ban chủ nhiệm CLB trước khi chuyển CTSV.</span>
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

      <section className="partner-perf-section" aria-label="Hiệu suất quản lý">
        <div className="partner-perf-grid">
          <div className="partner-perf-card">
            <h3 className="partner-perf-card__title">Tỷ lệ duyệt đúng hạn</h3>
            <div className="partner-perf-ring">
              <span className="partner-perf-ring__value" style={{ color: 'var(--icpdp-accent)' }}>95%</span>
              <span className="partner-perf-ring__label">Trung bình 30 ngày qua</span>
            </div>
          </div>
          <div className="partner-perf-card">
            <h3 className="partner-perf-card__title">Đánh giá chung</h3>
            {ICPDP_PERFORMANCE.map((item) => (
              <div key={item.name} className="partner-perf-bar-row">
                <div className="partner-perf-bar-head">
                  <span>{item.name}</span>
                  <strong>{item.rate}%</strong>
                </div>
                <div className="partner-perf-bar-track">
                  <div className="partner-perf-bar-fill" style={{ width: `${item.rate}%`, background: 'var(--icpdp-accent)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
                    <span className="ctsv-dash-event-category">{ev.category}</span>
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

          <section className="ctsv-dash-panel">
            <div className="ctsv-dash-panel__head">
              <div>
                <h2>Hoạt động gần đây</h2>
                <p>Nhật ký hoạt động hệ thống</p>
              </div>
            </div>
            <ul className="partner-activity-list">
              {ICPDP_RECENT_ACTIVITY.map((item) => (
                <li key={item.id} className="partner-activity-item">
                  <span className="partner-activity-dot" aria-hidden style={{ background: 'var(--icpdp-accent)' }} />
                  <div>
                    {item.text}
                    <span className="partner-activity-time">{item.time}</span>
                  </div>
                </li>
              ))}
            </ul>
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
