import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import CtsvNavIcon from '../../components/ctsv/CtsvNavIcon';
import {
  fetchCtsvEvents,
  fetchCtsvPartners,
  fetchCtsvStats,
  MOCK_EVENTS,
  MOCK_STATS
} from '../../services/ctsvApi';
import { isPendingApproval, statusClass } from '../../utils/eventStatus';

const STAT_STYLES = [
  { tone: 'amber', icon: 'partners', hint: 'Đối tác & hợp đồng', link: '/ctsv/partners' },
  { tone: 'green', icon: 'publish', hint: 'Đang mở đăng ký / live', link: '/ctsv/events' },
  { tone: 'orange', icon: 'reports', hint: 'Tổng lượt đăng ký', link: '/ctsv/reports' }
];

const QUICK_ACTIONS = [
  { path: '/ctsv/events', label: 'Publish sự kiện', desc: 'Duyệt & xuất bản', icon: 'publish' },
  { path: '/ctsv/partners', label: 'Duyệt đơn đối tác', desc: 'Đơn đăng ký từ đối tác', icon: 'partners' },
  { path: '/ctsv/calendar', label: 'Lịch toàn trường', desc: 'Lịch tổng hợp', icon: 'calendar' },
  { path: '/ctsv/announcements/publish', label: 'Thông báo', desc: 'Phát hành chính thức', icon: 'announce' },
  { path: '/ctsv/reports', label: 'Báo cáo sau SK', desc: 'Tổng hợp kết quả', icon: 'reports' }
];

const getGreeting = (fullname) => {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Buổi sáng' : hour < 18 ? 'Buổi chiều' : 'Buổi tối';
  const name = fullname?.trim();
  const short = name ? name.split(/\s+/).slice(-1)[0] : 'bạn';
  return `${part}, ${short}!`;
};

const formatToday = () => {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString('vi-VN');
  }
};

const CtsvDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(MOCK_STATS);
  const [events, setEvents] = useState([]);
  const [pendingPartners, setPendingPartners] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchCtsvStats().catch(() => ({ stats: MOCK_STATS })),
      fetchCtsvEvents().catch(() => ({ events: MOCK_EVENTS })),
      fetchCtsvPartners({ status: 'pending' }).catch(() => ({ partners: [] }))
    ])
      .then(([statsRes, eventsRes, partnersRes]) => {
        if (cancelled) return;
        setStats(statsRes.stats?.length ? statsRes.stats : MOCK_STATS);
        const list = eventsRes.events?.length ? eventsRes.events : MOCK_EVENTS;
        setEvents(list);
        setPendingPartners((partnersRes.partners || []).slice(0, 4));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const recentEvents = useMemo(() => events.slice(0, 5), [events]);

  const pendingPartnerCount = pendingPartners.length;

  return (
    <div className="ctsv-dashboard">
      <section className="ctsv-dash-hero">
        <div className="ctsv-dash-hero__content">
          <span className="ctsv-dash-hero__date">{formatToday()}</span>
          <h1 className="ctsv-dash-hero__title">{getGreeting(userProfile?.fullname)}</h1>
          <p className="ctsv-dash-hero__desc">
            Tổng quan sự kiện cấp trường, đối tác tài trợ, lịch và báo cáo — CTSV không quản lý CLB.
          </p>
          <div className="ctsv-dash-hero__actions">
            <Link to="/ctsv/events" className="ctsv-dash-btn ctsv-dash-btn--primary">
              Quản lý sự kiện
            </Link>
            <Link to="/ctsv/reports" className="ctsv-dash-btn ctsv-dash-btn--ghost">
              Xuất báo cáo
            </Link>
          </div>
        </div>
        <div className="ctsv-dash-hero__badge" aria-hidden="true">
          <span className="ctsv-dash-hero__badge-value">{pendingPartnerCount}</span>
          <span className="ctsv-dash-hero__badge-label">đơn chờ duyệt</span>
        </div>
      </section>

      <Link to="/ctsv/events/create" className="ctsv-dash-create-card">
        <span className="ctsv-dash-create-card__icon">
          <CtsvNavIcon type="create" />
        </span>
        <span className="ctsv-dash-create-card__body">
          <strong>Tạo sự kiện trường</strong>
          <span>Khởi tạo sự kiện cấp trường mới — lịch, địa điểm và thông tin publish.</span>
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

      <section className="ctsv-dash-quick" aria-label="Thao tác nhanh">
        <div className="ctsv-dash-section-head">
          <h2>Thao tác nhanh</h2>
          <p>Lối tắt tới các màn quản trị thường dùng</p>
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
            <Link to="/ctsv/events" className="ctsv-dash-link">
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
              <Link to="/ctsv/events/create" className="ctsv-dash-btn ctsv-dash-btn--primary">
                Tạo sự kiện đầu tiên
              </Link>
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
                      to={`/ctsv/events/${ev.id}`}
                      className="ctsv-dash-event-cta"
                    >
                      {isPendingApproval(ev) ? 'Phê duyệt' : 'Chi tiết'}
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
                <p>Đối tác chờ xét duyệt</p>
              </div>
              {pendingPartnerCount > 0 && (
                <span className="ctsv-dash-pill-count">{pendingPartnerCount}</span>
              )}
            </div>
            {loading ? (
              <div className="ctsv-dash-pending-list">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="ctsv-dash-pending-item ctsv-dash-pending-item--skeleton" />
                ))}
              </div>
            ) : pendingPartners.length === 0 ? (
              <p className="ctsv-dash-side-empty">Không có đơn đối tác chờ duyệt. Tuyệt vời!</p>
            ) : (
              <ul className="ctsv-dash-pending-list">
                {pendingPartners.map((p) => (
                  <li key={p._id}>
                    <button
                      type="button"
                      className="ctsv-dash-pending-item"
                      onClick={() => navigate(`/ctsv/partners/${p._id}`)}
                    >
                      <span className="ctsv-dash-pending-title">{p.name}</span>
                      <span className="ctsv-dash-pending-meta">
                        {p.representative || p.email || 'Chưa có thông tin liên hệ'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/ctsv/partners" className="ctsv-dash-side-link">
              Xem tất cả đơn chờ duyệt →
            </Link>
          </section>

          <section className="ctsv-dash-panel ctsv-dash-panel--compact">
            <h2 className="ctsv-dash-side-title">Gợi ý tuần này</h2>
            <ul className="ctsv-dash-tips">
              <li>
                <CtsvNavIcon type="partners" />
                <span>Đối tác gửi đơn qua cổng riêng; CTSV xét duyệt trước khi hợp tác chính thức.</span>
              </li>
              <li>
                <CtsvNavIcon type="calendar" />
                <span>Kiểm tra lịch toàn trường trước khi tạo sự kiện mới.</span>
              </li>
              <li>
                <CtsvNavIcon type="announce" />
                <span>Phát hành thông báo sau khi publish sự kiện quan trọng.</span>
              </li>
            </ul>
            <Link to="/ctsv/calendar" className="ctsv-dash-btn ctsv-dash-btn--outline ctsv-dash-btn--block">
              Mở lịch toàn trường
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default CtsvDashboard;
