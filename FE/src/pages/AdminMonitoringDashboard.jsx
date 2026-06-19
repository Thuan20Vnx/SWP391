import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AdminActivityLogModal from '../components/admin/AdminActivityLogModal';
import AdminMetricDetailModal from '../components/admin/AdminMetricDetailModal';
import { ADMIN_ACTIVITY_PREVIEW_COUNT } from '../data/adminDashboardData';
import useAdminDashboardStats from '../hooks/useAdminDashboardStats';
import { getUserRole, isAdminRole } from '../utils/auth';
import { formatAdminDateTime } from '../utils/adminLiveTime';
import { useTranslation } from '../i18n/I18nContext';
import '../styles/admin-dashboard.css';

const StatIconTraffic = () => (
  <svg className="admin-stat-card__icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const StatIconOverview = () => (
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
  const { t, language } = useTranslation();
  const { showToast } = useOutletContext() || {};
  const role = getUserRole();
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const { stats, loading, error, reload } = useAdminDashboardStats();

  const dashboardView = useMemo(() => {
    if (!stats) return null;

    const monthlyPerformance = stats.monthlyPerformance || [];
    const maxBar = Math.max(1, ...monthlyPerformance.map((m) => m.value));

    const activityLogs = (stats.activityLogs || []).map((log) => ({
      ...log,
      tone: log.tone === 'warning' ? 'danger' : log.tone || 'default',
      time: formatAdminDateTime(new Date(log.time), language),
      dateKey: formatAdminDateTime(new Date(log.time), language).split(',')[0],
    }));

    const trafficOverview = {
      totalUsers: stats.users?.total || 0,
      students: stats.users?.students || 0,
      pendingEvents: stats.events?.pending || 0,
      pendingPartners: stats.partners?.pendingAdmin || 0,
      registrations: stats.registrations?.total || 0,
      registrationsMonth: stats.registrations?.thisMonth || 0,
    };

    const dataOverview = {
      events: stats.events?.total || 0,
      clubs: stats.clubs?.total || 0,
      partners: stats.partners?.total || 0,
      announcements: stats.announcements?.total || 0,
      approvedEvents: stats.events?.approved || 0,
      liveEvents: stats.events?.live || 0,
    };

    const systemOverall = {
      status: stats.system?.status || 'stable',
      label: stats.system?.label || t('admin.monitor.stable'),
      database: stats.system?.database || 'MongoDB',
      lastCheck: formatAdminDateTime(new Date(stats.checkedAt), language),
    };

    const metricDetailMap = {
      traffic: {
        title: t('admin.monitor.detail.traffic.title'),
        subtitle: t('admin.monitor.detail.traffic.subtitle'),
        summary: [
          { label: t('admin.monitor.detail.traffic.totalAccounts'), value: String(trafficOverview.totalUsers) },
          { label: t('admin.monitor.detail.traffic.students'), value: String(trafficOverview.students) },
          {
            label: t('admin.monitor.detail.traffic.registrationsMonth'),
            value: String(trafficOverview.registrationsMonth),
          },
        ],
        columns: [t('admin.monitor.detail.traffic.col.metric'), t('admin.monitor.detail.traffic.col.value')],
        rows: [
          {
            id: '0',
            label: t('admin.monitor.detail.traffic.pendingEvents'),
            value: String(trafficOverview.pendingEvents),
          },
          {
            id: '1',
            label: t('admin.monitor.detail.traffic.pendingPartners'),
            value: String(trafficOverview.pendingPartners),
          },
          {
            id: '2',
            label: t('admin.monitor.detail.traffic.totalRegistrations'),
            value: trafficOverview.registrations.toLocaleString('vi-VN'),
          },
        ],
      },
      revenue: {
        title: t('admin.monitor.detail.overview.title'),
        subtitle: t('admin.monitor.detail.overview.subtitle'),
        summary: [
          { label: t('admin.monitor.detail.overview.totalEvents'), value: String(dataOverview.events) },
          { label: t('admin.monitor.detail.overview.totalClubs'), value: String(dataOverview.clubs) },
        ],
        columns: [t('admin.monitor.detail.overview.col.item'), t('admin.monitor.detail.overview.col.value')],
        rows: [
          {
            id: '0',
            label: t('admin.monitor.detail.overview.totalPartners'),
            value: String(dataOverview.partners),
          },
          {
            id: '1',
            label: t('admin.monitor.detail.overview.totalAnnouncements'),
            value: String(dataOverview.announcements),
          },
          {
            id: '2',
            label: t('admin.monitor.detail.overview.approvedEvents'),
            value: String(dataOverview.approvedEvents),
          },
          {
            id: '3',
            label: t('admin.monitor.detail.overview.liveEvents'),
            value: String(dataOverview.liveEvents),
          },
        ],
      },
      performance: {
        title: t('admin.monitor.detail.performance.title'),
        subtitle: stats.chartSummary?.period,
        summary: [
          { label: t('admin.monitor.avg'), value: String(stats.chartSummary?.avg) },
          {
            label: t('admin.monitor.peak'),
            value: `${stats.chartSummary?.peak?.label} · ${stats.chartSummary?.peak?.value}`,
          },
        ],
        columns: [
          t('admin.monitor.detail.performance.col.month'),
          t('admin.monitor.detail.performance.col.count'),
        ],
        rows: monthlyPerformance.map((m, i) => ({
          id: String(i),
          label: m.month,
          value: String(m.value),
        })),
      },
    };

    return {
      activityLogs,
      trafficOverview,
      dataOverview,
      systemOverall,
      monthlyPerformance,
      chartSummary: stats.chartSummary,
      peakMonthIndex: stats.peakMonthIndex ?? 0,
      metricDetailMap,
      maxBar,
    };
  }, [stats, t, language]);

  const previewLogs = (dashboardView?.activityLogs || []).slice(0, ADMIN_ACTIVITY_PREVIEW_COUNT);
  const clockLabel = stats?.checkedAt ? formatAdminDateTime(new Date(stats.checkedAt), language) : '—';

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
      showToast?.(t('admin.common.noAccess'), 'error');
      navigate('/admin');
    }
  }, [role, navigate, showToast, t]);

  useEffect(() => {
    if (error) showToast?.(error, 'error');
  }, [error, showToast]);

  if (!isAdminRole(role)) {
    return null;
  }

  if (loading && !dashboardView) {
    return (
      <main className="admin-main">
        <p className="admin-page-header__clock">{t('admin.monitor.loading')}</p>
      </main>
    );
  }

  if (!dashboardView) {
    return (
      <main className="admin-main">
        <p className="admin-page-header__clock">{t('admin.monitor.noData')}</p>
        <button type="button" className="admin-panel__link" onClick={reload}>
          {t('common.retry')}
        </button>
      </main>
    );
  }

  const {
    trafficOverview,
    dataOverview,
    systemOverall,
    monthlyPerformance,
    chartSummary,
    peakMonthIndex,
    metricDetailMap,
    activityLogs,
    maxBar,
  } = dashboardView;

  return (
    <main className="admin-main">
      <div className="admin-dashboard-grid">
        <header className="admin-page-header">
          <div>
            <h1 className="admin-main__title">{t('admin.monitor.title')}</h1>
            <p className="admin-page-header__clock" aria-live="polite">
              {t('admin.monitor.updated', { time: clockLabel })}
            </p>
          </div>
        </header>

        <section className="admin-stats-grid" aria-label={t('admin.monitor.stats')}>
          <article
            className="admin-stat-card admin-stat-card--traffic admin-stat-card--compact admin-stat-card--clickable"
            role="button"
            tabIndex={0}
            aria-label={`${t('admin.monitor.users')} — ${t('admin.monitor.chartHint')}`}
            onClick={() => openDetail('traffic')}
            onKeyDown={(e) => handleCardKeyDown(e, 'traffic')}
          >
            <div className="admin-stat-card__head">
              <p className="admin-stat-card__label">{t('admin.monitor.users')}</p>
              <StatIconTraffic />
            </div>
            <p className="admin-stat-card__value">
              {trafficOverview.totalUsers.toLocaleString('vi-VN')}
            </p>
            <p className="admin-stat-card__sub">
              {t('admin.monitor.students', {
                count: trafficOverview.students.toLocaleString('vi-VN'),
                month: trafficOverview.registrationsMonth,
              })}
            </p>
            <ul className="admin-stat-card__quick">
              <li>
                <span>{t('admin.monitor.pending')}</span>
                <strong>{trafficOverview.pendingEvents}</strong>
              </li>
              <li>
                <span>{t('admin.monitor.partners')}</span>
                <strong>{trafficOverview.pendingPartners}</strong>
              </li>
              <li>
                <span>{t('admin.monitor.tickets')}</span>
                <strong>{trafficOverview.registrations.toLocaleString('vi-VN')}</strong>
              </li>
            </ul>
          </article>

          <article
            className="admin-stat-card admin-stat-card--revenue admin-stat-card--compact admin-stat-card--clickable"
            role="button"
            tabIndex={0}
            aria-label={t('admin.monitor.overview')}
            onClick={() => openDetail('revenue')}
            onKeyDown={(e) => handleCardKeyDown(e, 'revenue')}
          >
            <div className="admin-stat-card__head">
              <p className="admin-stat-card__label">{t('admin.monitor.overview')}</p>
              <StatIconOverview />
            </div>
            <p className="admin-stat-card__value admin-stat-card__value--primary">
              {dataOverview.events.toLocaleString('vi-VN')}
            </p>
            <p className="admin-stat-card__sub">
              {t('admin.monitor.overviewSub', {
                clubs: dataOverview.clubs.toLocaleString('vi-VN'),
                partners: dataOverview.partners.toLocaleString('vi-VN'),
              })}
            </p>
            <ul className="admin-stat-card__quick">
              <li>
                <span>{t('admin.monitor.approved')}</span>
                <strong>{dataOverview.approvedEvents}</strong>
              </li>
              <li>
                <span>{t('admin.monitor.live')}</span>
                <strong>{dataOverview.liveEvents}</strong>
              </li>
              <li>
                <span>{t('admin.monitor.announcements')}</span>
                <strong>{dataOverview.announcements}</strong>
              </li>
            </ul>
          </article>

          <article className="admin-stat-card admin-stat-card--system admin-stat-card--compact">
            <div className="admin-stat-card__head">
              <p className="admin-stat-card__label">{t('admin.monitor.system')}</p>
              <StatIconSystem />
            </div>
            <div className="admin-stat-card__system">
              <span className="admin-status-badge">{systemOverall.label}</span>
              <p className="admin-stat-card__sub">
                {t('admin.monitor.systemUpdated', { time: systemOverall.lastCheck })}
              </p>
            </div>
            <ul className="admin-stat-card__quick admin-stat-card__quick--system">
              <li>
                <span>{systemOverall.database}</span>
                <strong className="admin-stat-card__ok">{t('admin.monitor.connected')}</strong>
              </li>
              <li>
                <span>API Server</span>
                <strong className="admin-stat-card__ok">{t('admin.monitor.apiActive')}</strong>
              </li>
            </ul>
          </article>
        </section>

        <section className="admin-charts-grid">
          <article
            className="admin-panel admin-panel--chart admin-panel--clickable"
            role="button"
            tabIndex={0}
            aria-label={t('admin.monitor.chartAria')}
            onClick={() => openDetail('performance')}
            onKeyDown={(e) => handleCardKeyDown(e, 'performance')}
          >
            <div className="admin-chart-header">
              <span className="admin-panel__detail-hint">{t('admin.monitor.chartHint')}</span>
              <div>
                <h2 className="admin-panel__title admin-panel__title--flush">{t('admin.monitor.chartTitle')}</h2>
                <p className="admin-chart-header__sub">
                  {t('admin.monitor.chartSub', { period: chartSummary.period, time: clockLabel })}
                </p>
              </div>
              <div className="admin-chart-kpis" aria-label={t('admin.monitor.chartSummaryAria')}>
                <div className="admin-chart-kpis__item">
                  <span className="admin-chart-kpis__label">{t('admin.monitor.avg')}</span>
                  <span className="admin-chart-kpis__value">{chartSummary.avg}</span>
                </div>
                <div className="admin-chart-kpis__item admin-chart-kpis__item--peak">
                  <span className="admin-chart-kpis__label">{t('admin.monitor.peak')}</span>
                  <span className="admin-chart-kpis__value">
                    {chartSummary.peak.label} · {t('admin.monitor.eventsCount', { count: chartSummary.peak.value })}
                  </span>
                </div>
                <div className="admin-chart-kpis__item admin-chart-kpis__item--growth">
                  <span className="admin-chart-kpis__label">{t('admin.monitor.growth')}</span>
                  <span className="admin-chart-kpis__value">{chartSummary.growth}</span>
                  <span className="admin-chart-kpis__hint">{chartSummary.growthCaption}</span>
                </div>
              </div>
            </div>
            <div className="admin-bar-chart-wrap">
              <div className="admin-bar-chart" role="img" aria-label={t('admin.monitor.chartAria')}>
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
                      <span className="admin-bar-chart__value-label">{item.value}</span>
                      <div
                        className="admin-bar-chart__bar"
                        style={{ height: `${(item.value / maxBar) * 200}px` }}
                        title={t('admin.monitor.barTitle', { month: item.month, count: item.value })}
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
                  {t('admin.monitor.eventsPerMonth')}
                </span>
                <span className="admin-chart-legend__item">
                  <span className="admin-chart-legend__swatch admin-chart-legend__swatch--peak" />
                  {t('admin.monitor.peakMonth', { label: chartSummary.peak.label })}
                </span>
              </div>
            </div>
          </article>

          <article className="admin-panel admin-panel--activity">
            <div className="admin-panel__head">
              <h2 className="admin-panel__title admin-panel__title--inline">{t('admin.monitor.activityLog')}</h2>
              <button
                type="button"
                className="admin-panel__link"
                onClick={() => setActivityModalOpen(true)}
              >
                {t('admin.monitor.viewAll')}
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
