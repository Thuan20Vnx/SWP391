import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import CtsvNavIcon from '../../components/ctsv/CtsvNavIcon';
import PortalDashHero from '../../components/portal/PortalDashHero';
import {
  fetchPartnerEvents,
  fetchPartnerStats,
  PARTNER_MOCK_EVENTS,
  PARTNER_MOCK_STATS,
  PARTNER_RECENT_ACTIVITY,
  PARTNER_PERFORMANCE
} from '../../services/partnerApi';
import { statusClass } from '../../utils/eventStatus';

const STAT_STYLES = [
  { tone: 'amber', icon: 'calendar', hint: 'Tổng sự kiện đã tổ chức', link: '/partner/events' },
  { tone: 'green', icon: 'reports', hint: 'Lượt đăng ký tích lũy', link: '/partner/analytics' },
  { tone: 'orange', icon: 'publish', hint: 'Sắp khởi động trong 48h', link: '/partner/events' },
  { tone: 'amber', icon: 'partners', hint: 'Kỳ tài trợ hiện tại', link: '/partner/contracts' }
];

const QUICK_ACTIONS = [
  {
    path: '/partner/proposals/create',
    label: 'Tạo đề xuất mới',
    desc: 'Gửi đề xuất sự kiện tài trợ',
    icon: 'create'
  },
  { path: '/partner/contracts', label: 'Xem hợp đồng', desc: 'Quản lý hợp đồng tài trợ', icon: 'partners' },
  { path: '/partner/events', label: 'Quản lý sự kiện', desc: 'Theo dõi sự kiện của bạn', icon: 'calendar' },
  { path: '/partner/analytics', label: 'Phân tích báo cáo', desc: 'ROI & hiệu suất chiến dịch', icon: 'reports' }
];

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(PARTNER_MOCK_STATS);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchPartnerStats().catch(() => ({ stats: PARTNER_MOCK_STATS })),
      fetchPartnerEvents().catch(() => ({ events: PARTNER_MOCK_EVENTS }))
    ])
      .then(([statsRes, eventsRes]) => {
        if (cancelled) return;
        setStats(statsRes.stats?.length ? statsRes.stats : PARTNER_MOCK_STATS);
        setEvents(eventsRes.events?.length ? eventsRes.events : PARTNER_MOCK_EVENTS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const recentEvents = useMemo(() => events.slice(0, 4), [events]);
  const upcomingCount = useMemo(
    () => events.filter((ev) => ev.statusKey === 'approved').length,
    [events]
  );

  return (
    <div className="ctsv-dashboard">
      <PortalDashHero
        fullname={userProfile?.fullname}
        description="Tổng quan sự kiện tài trợ, hợp đồng và hiệu suất chiến dịch của doanh nghiệp bạn."
        badgeValue={upcomingCount}
        badgeLabel="sự kiện sắp diễn ra"
        actions={
          <>
            <Link to="/partner/proposals/create" className="ctsv-dash-btn ctsv-dash-btn--primary">
              Tạo đề xuất mới
            </Link>
            <Link to="/partner/contracts" className="ctsv-dash-btn ctsv-dash-btn--ghost">
              Xem hợp đồng
            </Link>
          </>
        }
      />

      <Link to="/partner/proposals/create" className="ctsv-dash-create-card">
        <span className="ctsv-dash-create-card__icon">
          <CtsvNavIcon type="create" />
        </span>
        <span className="ctsv-dash-create-card__body">
          <strong>Tạo đề xuất sự kiện mới</strong>
          <span>Gửi đề xuất tài trợ hoặc đồng tổ chức sự kiện — CTSV sẽ xem xét và phê duyệt.</span>
        </span>
        <span className="ctsv-dash-create-card__arrow" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor" />
          </svg>
        </span>
      </Link>

      <section className="ctsv-dash-stats" aria-label="Thống kê nhanh">
        <div className="ctsv-dash-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
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

      <section className="partner-perf-section" aria-label="Hiệu suất">
        <div className="partner-perf-grid">
          <div className="partner-perf-card">
            <h3 className="partner-perf-card__title">Tỷ lệ check-in</h3>
            <div className="partner-perf-ring">
              <span className="partner-perf-ring__value">88%</span>
              <span className="partner-perf-ring__label">Trung bình các sự kiện gần đây</span>
            </div>
          </div>
          <div className="partner-perf-card">
            <h3 className="partner-perf-card__title">Hiệu suất sự kiện</h3>
            {PARTNER_PERFORMANCE.map((item) => (
              <div key={item.name} className="partner-perf-bar-row">
                <div className="partner-perf-bar-head">
                  <span>{item.name}</span>
                  <strong>{item.rate}%</strong>
                </div>
                <div className="partner-perf-bar-track">
                  <div className="partner-perf-bar-fill" style={{ width: `${item.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ctsv-dash-quick" aria-label="Thao tác nhanh">
        <div className="ctsv-dash-section-head">
          <h2>Thao tác nhanh</h2>
          <p>Lối tắt tới các màn quản lý đối tác</p>
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
            <Link to="/partner/events" className="ctsv-dash-link">
              Quản lý sự kiện
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor" />
              </svg>
            </Link>
          </div>

          {loading ? (
            <div className="ctsv-dash-event-list">
              {Array.from({ length: 3 }).map((_, i) => (
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
                    <span className={`status-pill ${statusClass(ev.status, ev.statusKey)}`}>{ev.status}</span>
                    <Link to={`/partner/events/${ev.id}`} className="ctsv-dash-event-cta">
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
                <h2>Hoạt động gần đây</h2>
                <p>Cập nhật từ CTSV & hệ thống</p>
              </div>
            </div>
            <ul className="partner-activity-list">
              {PARTNER_RECENT_ACTIVITY.map((item) => (
                <li key={item.id} className="partner-activity-item">
                  <span className="partner-activity-dot" aria-hidden />
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
                <CtsvNavIcon type="create" />
                <span>Gửi đề xuất sớm để CTSV có thời gian duyệt trước ngày sự kiện.</span>
              </li>
              <li>
                <CtsvNavIcon type="partners" />
                <span>Kiểm tra hợp đồng tài trợ trước khi sự kiện được publish.</span>
              </li>
              <li>
                <CtsvNavIcon type="reports" />
                <span>Xem báo cáo hiệu suất sau sự kiện để tối ưu chiến dịch tiếp theo.</span>
              </li>
            </ul>
            <Link to="/partner/profile" className="ctsv-dash-btn ctsv-dash-btn--outline ctsv-dash-btn--block">
              Cập nhật hồ sơ doanh nghiệp
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default PartnerDashboard;
