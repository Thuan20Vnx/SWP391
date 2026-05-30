import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AdminActivityLogModal from '../components/admin/AdminActivityLogModal';
import AdminMetricDetailModal from '../components/admin/AdminMetricDetailModal';
import { ADMIN_ACTIVITY_PREVIEW_COUNT } from '../data/adminDashboardData';
import useAdminDashboardLiveData from '../hooks/useAdminDashboardLiveData';
import { getUserRole, isAdminRole } from '../utils/auth';
import { formatAdminDateTime } from '../utils/adminLiveTime';
import '../styles/admin-dashboard.css';

const StatIconTraffic = () => (
  <svg className="admin-stat-card__icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const StatIconRevenue = () => (
  <svg className="admin-stat-card__icon" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const StatIconSystem = () => (
  <svg className="admin-stat-card__icon" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#4caf50" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AdminMonitoringDashboard = () => {
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const role = getUserRole();
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const live = useAdminDashboardLiveData();
  const {
    activityLogs,
    trafficSparkline,
    trafficOverview,
    revenueOverview,
    systemOverall,
    systemServices,
    monthlyPerformance,
    chartSummary,
    peakMonthIndex,
    metricDetailMap,
  } = live;

  const previewLogs = activityLogs.slice(0, ADMIN_ACTIVITY_PREVIEW_COUNT);
  const maxSpark = useMemo(() => Math.max(...trafficSparkline), [trafficSparkline]);
  const maxBar = useMemo(
    () => Math.max(...monthlyPerformance.map((m) => m.value)),
    [monthlyPerformance],
  );
  const clockLabel = formatAdminDateTime(live.now);

  const openDetail = (variant) => setDetailModal(variant);
  const closeDetail = () => setDetailModal(null);

  const handleCardKeyDown = (e, variant) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDetail(variant);
    }
  };

  useEffect(() => {
    if (!isAdminRole(role)) {
      showToast?.('Bạn không có quyền truy cập trang quản trị!', 'error');
      navigate('/profile');
    }
  }, [role, navigate, showToast]);

  if (!isAdminRole(role)) {
    return null;
  }

  return (
    <main className="admin-main">
      <div className="admin-dashboard-grid">
        <header className="admin-page-header">
          <div>
            <h1 className="admin-main__title">Dashboard Giám sát</h1>
            <p className="admin-page-header__clock" aria-live="polite">
              Cập nhật: {clockLabel}
            </p>
          </div>
        </header>

        <section className="admin-stats-grid" aria-label="Thống kê nhanh">
          <article
            className="admin-stat-card admin-stat-card--traffic admin-stat-card--clickable"
            role="button"
            tabIndex={0}
            aria-label="Lưu lượng truy cập — nhấn để xem bảng chi tiết"
            onClick={() => openDetail('traffic')}
            onKeyDown={(e) => handleCardKeyDown(e, 'traffic')}
          >
            <div className="admin-stat-card__head">
              <p className="admin-stat-card__label">Lưu lượng truy cập hiện tại</p>
              <span className="admin-stat-card__action">
                <StatIconTraffic />
                <span className="admin-stat-card__hint">Xem chi tiết</span>
              </span>
            </div>
            <div className="admin-metric-hero">
              <div className="admin-metric-hero__main">
                <span className="admin-stat-card__value">
                  {trafficOverview.active.toLocaleString('vi-VN')}
                </span>
                <span className="admin-live-pill">
                  <span className="admin-live-pill__dot" aria-hidden="true" />
                  {trafficOverview.live.pill}
                </span>
              </div>
              <div className="admin-traffic-meta">
                <div className="admin-traffic-meta__live">
                  <span className="admin-traffic-meta__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </span>
                  <div className="admin-traffic-meta__text">
                    <span className="admin-traffic-meta__title">{trafficOverview.live.title}</span>
                    <span className="admin-traffic-meta__hint">{trafficOverview.live.hint}</span>
                  </div>
                </div>
                <div className="admin-traffic-meta__divider" aria-hidden="true" />
                <div className="admin-traffic-meta__compare">
                  <span className="admin-traffic-meta__compare-label">{trafficOverview.compare.label}</span>
                  <span className="admin-traffic-meta__compare-trend admin-traffic-meta__compare-trend--up">
                    <span aria-hidden="true">↑</span> {trafficOverview.compare.trend}
                  </span>
                  <span className="admin-traffic-meta__compare-ref">{trafficOverview.compare.reference}</span>
                </div>
              </div>
            </div>
            <ul className="admin-mini-metrics">
              {trafficOverview.metrics.map((m) => (
                <li key={m.id} className="admin-mini-metrics__item">
                  <span className="admin-mini-metrics__label">{m.label}</span>
                  <span className="admin-mini-metrics__value">{m.value}</span>
                </li>
              ))}
            </ul>
            <div className="admin-sparkline-block">
              <div className="admin-sparkline-block__head">
                <span>{trafficOverview.sparklineCaption}</span>
                <span className="admin-sparkline-block__peak">
                  Đỉnh {trafficOverview.peak.value.toLocaleString('vi-VN')} · {trafficOverview.peak.time}
                </span>
              </div>
              <div className="admin-stat-card__sparkline" aria-hidden="true">
                {trafficSparkline.map((h, i) => (
                  <span
                    key={i}
                    className={h === maxSpark ? 'admin-sparkline-bar--peak' : undefined}
                    style={{ height: `${(h / maxSpark) * 100}%` }}
                  />
                ))}
              </div>
              <div className="admin-channel-bars" aria-label="Phân bổ thiết bị">
                {trafficOverview.channels.map((ch) => (
                  <div key={ch.id} className="admin-channel-bars__row">
                    <span className="admin-channel-bars__label">{ch.label}</span>
                    <div className="admin-channel-bars__track">
                      <span className="admin-channel-bars__fill" style={{ width: `${ch.percent}%` }} />
                    </div>
                    <span className="admin-channel-bars__pct">{ch.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article
            className="admin-stat-card admin-stat-card--revenue admin-stat-card--clickable"
            role="button"
            tabIndex={0}
            aria-label="Doanh thu bán vé — nhấn để xem bảng chi tiết"
            onClick={() => openDetail('revenue')}
            onKeyDown={(e) => handleCardKeyDown(e, 'revenue')}
          >
            <div className="admin-stat-card__head">
              <p className="admin-stat-card__label">Tổng doanh thu bán vé toàn sàn</p>
              <span className="admin-stat-card__action">
                <StatIconRevenue />
                <span className="admin-stat-card__hint">Xem chi tiết</span>
              </span>
            </div>
            <div className="admin-metric-hero">
              <p className="admin-stat-card__value admin-stat-card__value--primary">
                {revenueOverview.total} {revenueOverview.currency}
              </p>
              <p className="admin-stat-card__trend admin-stat-card__trend--inline">
                <span aria-hidden="true">↑</span> {revenueOverview.trend} {revenueOverview.trendCaption}
              </p>
              <p className="admin-metric-hero__sub">Tháng trước: {revenueOverview.previousMonth}</p>
            </div>
            <div className="admin-goal-progress">
              <div className="admin-goal-progress__head">
                <span>{revenueOverview.goal.label}</span>
                <span className="admin-goal-progress__pct">{revenueOverview.goal.percent}%</span>
              </div>
              <div className="admin-goal-progress__track">
                <span className="admin-goal-progress__fill" style={{ width: `${revenueOverview.goal.percent}%` }} />
              </div>
              <p className="admin-goal-progress__target">Mục tiêu: {revenueOverview.goal.target}</p>
            </div>
            <ul className="admin-mini-metrics">
              {revenueOverview.metrics.map((m) => (
                <li key={m.id} className="admin-mini-metrics__item">
                  <span className="admin-mini-metrics__label">{m.label}</span>
                  <span className="admin-mini-metrics__value">{m.value}</span>
                </li>
              ))}
            </ul>
            <ul className="admin-revenue-breakdown">
              {revenueOverview.breakdown.map((row) => (
                <li key={row.id} className="admin-revenue-breakdown__item">
                  <div className="admin-revenue-breakdown__top">
                    <span>{row.label}</span>
                    <span>{row.amount}</span>
                  </div>
                  <div className="admin-revenue-breakdown__track">
                    <span style={{ width: `${row.percent}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="admin-stat-card admin-stat-card--system">
            <div className="admin-stat-card__head">
              <p className="admin-stat-card__label">Hệ thống Email Server &amp; Payment</p>
              <StatIconSystem />
            </div>
            <div className="admin-system-panel" role="status" aria-label="Trạng thái hạ tầng email và thanh toán">
              <div className="admin-system-panel__hero">
                <div className="admin-system-panel__indicator" aria-hidden="true">
                  <span className="admin-status-dot admin-status-dot--pulse" />
                </div>
                <div className="admin-system-panel__summary">
                  <span className="admin-system-panel__caption">Trạng thái tổng</span>
                  <span className="admin-status-badge">{systemOverall.label}</span>
                </div>
                <div className="admin-system-panel__uptime">
                  <span className="admin-system-panel__uptime-value">{systemOverall.uptime}</span>
                  <span className="admin-system-panel__uptime-caption">{systemOverall.uptimeCaption}</span>
                </div>
              </div>
              <ul className="admin-system-services">
                {systemServices.map((service) => (
                  <li key={service.id} className="admin-system-services__item">
                    <span
                      className={`admin-system-services__dot admin-system-services__dot--${service.status}`}
                      aria-hidden="true"
                    />
                    <div className="admin-system-services__body">
                      <span className="admin-system-services__name">{service.name}</span>
                      <span className="admin-system-services__meta">
                        {service.provider} · {service.metric} {service.metricLabel}
                      </span>
                    </div>
                    <span className={`admin-system-services__pill admin-system-services__pill--${service.status}`}>
                      {service.statusLabel}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="admin-system-panel__foot">{systemOverall.lastCheck}</p>
            </div>
          </article>
        </section>

        <section className="admin-charts-grid">
          <article
            className="admin-panel admin-panel--chart admin-panel--clickable"
            role="button"
            tabIndex={0}
            aria-label="Hiệu suất vận hành theo tháng — nhấn để xem bảng chi tiết"
            onClick={() => openDetail('performance')}
            onKeyDown={(e) => handleCardKeyDown(e, 'performance')}
          >
            <div className="admin-chart-header">
              <span className="admin-panel__detail-hint">Nhấn để xem bảng chi tiết</span>
              <div>
                <h2 className="admin-panel__title admin-panel__title--flush">Hiệu suất vận hành hệ thống theo tháng</h2>
                <p className="admin-chart-header__sub">
                  {chartSummary.period} · Chỉ số hiệu suất (%) · {clockLabel}
                </p>
              </div>
              <div className="admin-chart-kpis" aria-label="Tóm tắt biểu đồ">
                <div className="admin-chart-kpis__item">
                  <span className="admin-chart-kpis__label">Trung bình</span>
                  <span className="admin-chart-kpis__value">{chartSummary.avg}%</span>
                </div>
                <div className="admin-chart-kpis__item admin-chart-kpis__item--peak">
                  <span className="admin-chart-kpis__label">Cao nhất</span>
                  <span className="admin-chart-kpis__value">
                    {chartSummary.peak.label} · {chartSummary.peak.value}%
                  </span>
                </div>
                <div className="admin-chart-kpis__item admin-chart-kpis__item--growth">
                  <span className="admin-chart-kpis__label">Tăng trưởng</span>
                  <span className="admin-chart-kpis__value">{chartSummary.growth}</span>
                  <span className="admin-chart-kpis__hint">{chartSummary.growthCaption}</span>
                </div>
              </div>
            </div>
            <div className="admin-bar-chart-wrap">
              <div className="admin-bar-chart" role="img" aria-label="Biểu đồ hiệu suất theo tháng">
                <div className="admin-bar-chart__grid" aria-hidden="true">
                  {[100, 75, 50, 25, 0].map((line) => (
                    <span key={line} className="admin-bar-chart__grid-line" />
                  ))}
                </div>
                <div className="admin-bar-chart__y-labels">
                  <span>100</span>
                  <span>75</span>
                  <span>50</span>
                  <span>25</span>
                  <span>0</span>
                </div>
                <div className="admin-bar-chart__bars">
                  {monthlyPerformance.map((item, index) => (
                    <div
                      key={item.label}
                      className={`admin-bar-chart__col${index === peakMonthIndex ? ' admin-bar-chart__col--peak' : ''}`}
                    >
                      <span className="admin-bar-chart__value-label">{item.value}%</span>
                      <div
                        className="admin-bar-chart__bar"
                        style={{ height: `${(item.value / maxBar) * 200}px` }}
                        title={`${item.month}: ${item.value}%`}
                      />
                      <span className="admin-bar-chart__x">{item.label}</span>
                      <span className="admin-bar-chart__month">{item.month}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="admin-chart-legend" aria-hidden="true">
                <span className="admin-chart-legend__item">
                  <span className="admin-chart-legend__swatch admin-chart-legend__swatch--primary" />
                  Hiệu suất tháng
                </span>
                <span className="admin-chart-legend__item">
                  <span className="admin-chart-legend__swatch admin-chart-legend__swatch--peak" />
                  Tháng cao nhất ({chartSummary.peak.label})
                </span>
              </div>
            </div>
          </article>

          <article className="admin-panel admin-panel--activity">
            <div className="admin-panel__head">
              <h2 className="admin-panel__title admin-panel__title--inline">Nhật ký hoạt động</h2>
              <button
                type="button"
                className="admin-panel__link"
                onClick={() => setActivityModalOpen(true)}
              >
                Xem tất cả
              </button>
            </div>
            <ul className="admin-activity-list">
              {previewLogs.map((log) => (
                <li
                  key={log.id}
                  className={`admin-activity-item admin-activity-item--${log.tone}`}
                >
                  <p className="admin-activity-item__time">{log.time}</p>
                  <p className="admin-activity-item__actor">{log.actor}</p>
                  <p
                    className={`admin-activity-item__message${
                      log.tone === 'danger' ? ' admin-activity-item__message--danger' : ''
                    }`}
                  >
                    {log.message}
                  </p>
                </li>
              ))}
            </ul>
          </article>
        </section>
      </div>

      <AdminActivityLogModal
        open={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        logs={activityLogs}
      />

      <AdminMetricDetailModal
        variant={detailModal}
        open={Boolean(detailModal)}
        onClose={closeDetail}
        detailMap={metricDetailMap}
      />
    </main>
  );
};

export default AdminMonitoringDashboard;
