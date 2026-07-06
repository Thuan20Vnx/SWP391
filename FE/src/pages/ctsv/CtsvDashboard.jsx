import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import CtsvNavIcon from '../../components/ctsv/CtsvNavIcon';
import PortalDashHero from '../../components/portal/PortalDashHero';
import {
  fetchCtsvEvents,
  fetchCtsvPartners,
  fetchCtsvStats,
} from '../../services/ctsvApi';
import { isPendingApproval, statusClass } from '../../utils/eventStatus';
import { getCategoryDisplayLabel } from '../../constants/eventCategories';

const STAT_STYLES = [
  { tone: 'amber', icon: 'partners', hint: 'Đối tác & hợp đồng', link: '/ctsv/partners' },
  { tone: 'green', icon: 'publish', hint: 'Đang mở đăng ký / live', link: '/ctsv/events' },
  { tone: 'orange', icon: 'reports', hint: 'Tổng lượt đăng ký', link: '/ctsv/reports' }
];

const QUICK_ACTIONS = [
  { path: '/ctsv/events', label: 'Quản lý sự kiện', desc: 'Duyệt & quản lý', icon: 'publish' },
  {
    path: '/ctsv/partners',
    label: 'Duyệt đơn đối tác',
    mobileLabel: 'Duyệt đối tác',
    desc: 'Đơn đăng ký từ đối tác',
    icon: 'partners',
  },
  { path: '/ctsv/calendar', label: 'Lịch toàn trường', desc: 'Lịch tổng hợp', icon: 'calendar' },
  { path: '/ctsv/notifications', label: 'Thông báo', desc: 'Xem thông báo hệ thống', icon: 'announce' },
  { path: '/ctsv/reports', label: 'Báo cáo sau SK', desc: 'Tổng hợp kết quả', icon: 'reports' }
];

const CtsvDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useOutletContext() || {};
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [stats, setStats] = useState([]);
  const [events, setEvents] = useState([]);
  const [pendingPartners, setPendingPartners] = useState([]);

  useEffect(() => {
    let cancelled = false;

    setLoadingStats(true);
    fetchCtsvStats()
      .catch(() => ({ stats: [] }))
      .then((res) => {
        if (cancelled) return;
        setStats(res.stats || []);
        setLoadingStats(false);
      });

    setLoadingEvents(true);
    fetchCtsvEvents({ sort: 'newest', limit: 5 })
      .catch(() => ({ events: [] }))
      .then((res) => {
        if (cancelled) return;
        setEvents(res.events || []);
        setLoadingEvents(false);
      });

    setLoadingPartners(true);
    fetchCtsvPartners({ status: 'pending' })
      .catch(() => ({ partners: [] }))
      .then((res) => {
        if (cancelled) return;
        setPendingPartners((res.partners || []).slice(0, 4));
        setLoadingPartners(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const recentEvents = useMemo(() => events.slice(0, 5), [events]);
  const pendingPartnerCount = pendingPartners.length;

  return (
    <div className="ctsv-dashboard">
      {/* 1. Hero */}
      <PortalDashHero
        fullname={userProfile?.fullname}
        description="Tổng quan sự kiện cấp trường, đối tác tài trợ, lịch và báo cáo — CTSV không quản lý CLB."
        badgeValue={pendingPartnerCount}
        badgeLabel="đơn chờ duyệt"
        actions={
          <>
            <Link to="/ctsv/events" className="ctsv-dash-btn ctsv-dash-btn--primary">
              Quản lý sự kiện
            </Link>
            <Link to="/ctsv/reports" className="ctsv-dash-btn ctsv-dash-btn--ghost">
              Xuất báo cáo
            </Link>
          </>
        }
      />

      {/* 2. Thao tác nhanh — ngay dưới hero */}
      <section className="ctsv-dash-quick" aria-label="Thao tác nhanh">
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
              <span className="ctsv-dash-quick-label">
                <span className="ctsv-dash-quick-label__full">{action.label}</span>
                <span className="ctsv-dash-quick-label__short">{action.mobileLabel || action.label}</span>
              </span>
              <span className="ctsv-dash-quick-desc">{action.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Cần xử lý — đối tác chờ duyệt (dạng inline ngang) */}
      <section className="ctsv-dash-panel ctsv-dash-panel--accent ctsv-dash-panel--inline">
        <div className="ctsv-dash-panel__head">
          <div>
            <h2>Cần xử lý</h2>
            <p>Đối tác chờ xét duyệt</p>
          </div>
          {pendingPartnerCount > 0 && (
            <span className="ctsv-dash-pill-count">{pendingPartnerCount}</span>
          )}
        </div>
        {loadingPartners ? (
          <div className="ctsv-dash-pending-list ctsv-dash-pending-list--row">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="ctsv-dash-pending-item ctsv-dash-pending-item--skeleton" />
            ))}
          </div>
        ) : pendingPartners.length === 0 ? (
          <p className="ctsv-dash-side-empty">Không có đơn đối tác chờ duyệt. Tuyệt vời!</p>
        ) : (
          <ul className="ctsv-dash-pending-list ctsv-dash-pending-list--row">
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

      {/* 4. Thống kê nhanh */}
      <section className="ctsv-dash-stats" aria-label="Thống kê nhanh">
        <div className="ctsv-dash-stats-grid">
          {loadingStats
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

      {/* 6. Sự kiện gần đây + Gợi ý */}
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

          {loadingEvents ? (
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
                    <div className="ctsv-dash-event-meta-row">
                      <span className="ctsv-dash-event-category">
                        {getCategoryDisplayLabel(ev.category) || ev.category}
                      </span>
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
                      to={`/ctsv/events/${ev.id}`}
                      className="ctsv-dash-event-cta"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="ctsv-dash-side">
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
                <span>Phát hành thông báo sau khi duyệt sự kiện quan trọng.</span>
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
