import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import CtsvNavIcon from '../../components/ctsv/CtsvNavIcon';
import PortalDashHero from '../../components/portal/PortalDashHero';
import {
  fetchPartnerEvents,
  fetchPartnerStats,
} from '../../services/partnerApi';
import { statusClass } from '../../utils/eventStatus';

const STAT_STYLES = [
  { tone: 'amber', icon: 'calendar', hint: 'Sự kiện doanh nghiệp đã gửi', link: '/partner/events' },
  { tone: 'green', icon: 'reports', hint: 'Theo dõi hiệu quả chiến dịch', link: '/partner/analytics' },
  { tone: 'orange', icon: 'partners', hint: 'Tiến trình hợp tác tài trợ', link: '/partner/contracts' }
];

const QUICK_ACTIONS = [
  { path: '/partner/events', label: 'Quản lý sự kiện', desc: 'Theo dõi các sự kiện tài trợ', icon: 'publish' },
  { path: '/partner/contracts', label: 'Hợp đồng tài trợ', desc: 'Theo dõi thỏa thuận hợp tác', icon: 'partners' },
  { path: '/partner/proposals/create', label: 'Tạo đề xuất mới', desc: 'Gửi đề xuất sự kiện tài trợ', icon: 'create' },
  { path: '/partner/announcements', label: 'Thông báo', desc: 'Xem cập nhật từ CTSV', icon: 'announce' },
  { path: '/partner/analytics', label: 'Báo cáo sau SK', desc: 'Xem ROI và hiệu suất', icon: 'reports' }
];

const PartnerDashboard = () => {
  const navigate = useNavigate();
  const { userProfile, showToast } = useOutletContext() || {};
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [events, setEvents] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([fetchPartnerStats(), fetchPartnerEvents()])
      .then(([statsRes, eventsRes]) => {
        if (cancelled) return;
        setStats(statsRes.stats || []);
        setEvents(eventsRes.events || []);
        setActivity(statsRes.activity || []);
      })
      .catch(() => {
        if (cancelled) return;
        setStats([]);
        setEvents([]);
        setActivity([]);
        showToast?.('Không kết nối được API đối tác.', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const pendingEvents = useMemo(
    () => events.filter((ev) => ['pending', 'pending_admin', 'info_requested'].includes(ev.statusKey)).slice(0, 4),
    [events]
  );
  const pendingCount = pendingEvents.length;
  const attentionEvents = useMemo(
    () =>
      events
        .filter((ev) => ['pending', 'pending_admin', 'info_requested', 'rejected'].includes(ev.statusKey))
        .slice(0, 4),
    [events]
  );
  const recentEvents = useMemo(() => events.slice(0, 4), [events]);
  const statItems = useMemo(() => stats.slice(0, 3), [stats]);
  const feedItems = activity;

  return (
    <div className="ctsv-dashboard partner-dashboard-mobile-like">
      <PortalDashHero
        fullname={userProfile?.fullname}
        description="Tổng quan sự kiện tài trợ, đối tác tài trợ, lịch và báo cáo của doanh nghiệp bạn."
        badgeValue={pendingCount}
        badgeLabel="đơn chờ duyệt"
        actions={
          <>
            <Link to="/partner/events" className="ctsv-dash-btn ctsv-dash-btn--primary">
              Quản lý sự kiện
            </Link>
            <Link to="/partner/analytics" className="ctsv-dash-btn ctsv-dash-btn--ghost">
              Xuất báo cáo
            </Link>
          </>
        }
      />

      {attentionEvents.length > 0 && (
        <div className="ctsv-pd-banner ctsv-pd-banner--amber" style={{ marginBottom: 16 }}>
          <strong>Sự kiện cần chú ý:</strong>{' '}
          {attentionEvents.map((ev, i) => (
            <React.Fragment key={ev.id}>
              {i > 0 && ', '}
              <Link to={`/partner/events/${ev.id}`}>{ev.title}</Link> ({ev.status})
            </React.Fragment>
          ))}
        </div>
      )}

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
            : statItems.map((item, index) => {
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

      <div className="ctsv-dash-columns">
        <section className="ctsv-dash-panel">
          <div className="ctsv-dash-panel__head">
            <div>
              <h2>Sự kiện gần đây</h2>
              <p>Cập nhật mới nhất từ hệ thống</p>
            </div>
            <Link to="/partner/events" className="ctsv-dash-link">
              Xem tất cả
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
              {feedItems.map((item) => (
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
                <CtsvNavIcon type="partners" />
                <span>Đối tác gửi đề xuất sớm để CTSV có thời gian phản hồi trước ngày triển khai.</span>
              </li>
              <li>
                <CtsvNavIcon type="calendar" />
                <span>Kiểm tra lịch toàn trường trước khi chốt mốc tổ chức với CTSV.</span>
              </li>
              <li>
                <CtsvNavIcon type="announce" />
                <span>Theo dõi thông báo sau khi sự kiện được duyệt hoặc cần bổ sung hồ sơ.</span>
              </li>
            </ul>
            <Link to="/partner/contracts" className="ctsv-dash-btn ctsv-dash-btn--outline ctsv-dash-btn--block">
              Mở hợp đồng tài trợ
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default PartnerDashboard;
