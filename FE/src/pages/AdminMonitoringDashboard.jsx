import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AdminActivityLogModal from '../components/admin/AdminActivityLogModal';
import AdminMetricDetailModal from '../components/admin/AdminMetricDetailModal';
import { ADMIN_ACTIVITY_PREVIEW_COUNT } from '../data/adminDashboardData';
import useAdminDashboardStats from '../hooks/useAdminDashboardStats';
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
  const { stats, loading, error, reload } = useAdminDashboardStats();

  const dashboardView = useMemo(() => {
    if (!stats) return null;

    const monthlyPerformance = stats.monthlyPerformance || [];
    const maxBar = Math.max(1, ...monthlyPerformance.map((m) => m.value));

    const activityLogs = (stats.activityLogs || []).map((log) => ({
      ...log,
      tone: log.tone === 'warning' ? 'danger' : log.tone || 'default',
      time: formatAdminDateTime(new Date(log.time)),
      dateKey: formatAdminDateTime(new Date(log.time)).split(',')[0],
    }));

    const trafficOverview = {
      totalUsers: stats.users?.total || 0,
      students: stats.users?.students || 0,
      pendingEvents: stats.events?.pending || 0,
      pendingPartners: stats.partners?.pendingAdmin || 0,
      registrations: stats.registrations?.total || 0,
      registrationsMonth: stats.registrations?.thisMonth || 0,
    };

    const revenueOverview = {
      total: stats.revenue?.totalFormatted || '0',
      currency: stats.revenue?.currency || 'VND',
      trend: stats.revenue?.trend || '0%',
      thisMonth: stats.revenue?.thisMonthFormatted || '0 VND',
      approvedEvents: stats.events?.approved || 0,
      liveEvents: stats.events?.live || 0,
    };

    const systemOverall = {
      status: stats.system?.status || 'stable',
      label: stats.system?.label || 'ỔN ĐỊNH',
      database: stats.system?.database || 'MongoDB',
      lastCheck: formatAdminDateTime(new Date(stats.checkedAt)),
    };

    const metricDetailMap = {
      traffic: {
        title: 'Chi tiết hoạt động',
        subtitle: 'Dữ liệu từ MongoDB',
        summary: [
          { label: 'Tổng tài khoản', value: String(trafficOverview.totalUsers) },
          { label: 'Sinh viên', value: String(trafficOverview.students) },
          { label: 'Đăng ký tháng này', value: String(trafficOverview.registrationsMonth) },
        ],
        columns: ['Chỉ số', 'Giá trị'],
        rows: [
          { id: '0', label: 'Sự kiện chờ duyệt', value: String(trafficOverview.pendingEvents) },
          { id: '1', label: 'Đối tác chờ Admin', value: String(trafficOverview.pendingPartners) },
          { id: '2', label: 'Tổng đăng ký vé', value: trafficOverview.registrations.toLocaleString('vi-VN') },
        ],
      },
      revenue: {
        title: 'Chi tiết doanh thu',
        subtitle: 'Ước tính từ giá vé × lượt đăng ký',
        summary: [
          { label: 'Tổng', value: `${stats.revenue?.totalFormatted} VND` },
          { label: 'Tháng này', value: `${stats.revenue?.thisMonthFormatted} VND` },
        ],
        columns: ['Hạng mục', 'Giá trị'],
        rows: [
          { id: '0', label: 'Sự kiện đã duyệt', value: String(revenueOverview.approvedEvents) },
          { id: '1', label: 'Đang diễn ra', value: String(revenueOverview.liveEvents) },
          { id: '2', label: 'Chờ Admin duyệt', value: String(stats.events?.pendingAdmin || 0) },
          { id: '3', label: 'Đề xuất CLB', value: String(stats.proposals?.pendingTotal || 0) },
        ],
      },
      performance: {
        title: 'Sự kiện theo tháng',
        subtitle: stats.chartSummary?.period,
        summary: [
          { label: 'Trung bình', value: String(stats.chartSummary?.avg) },
          { label: 'Cao nhất', value: `${stats.chartSummary?.peak?.label} · ${stats.chartSummary?.peak?.value}` },
        ],
        columns: ['Tháng', 'Số sự kiện'],
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
      revenueOverview,
      systemOverall,
      monthlyPerformance,
      chartSummary: stats.chartSummary,
      peakMonthIndex: stats.peakMonthIndex ?? 0,
      metricDetailMap,
      maxBar,
    };
  }, [stats]);

  const previewLogs = (dashboardView?.activityLogs || []).slice(0, ADMIN_ACTIVITY_PREVIEW_COUNT);
  const clockLabel = stats?.checkedAt ? formatAdminDateTime(new Date(stats.checkedAt)) : '—';

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
      navigate('/admin');
    }
  }, [role, navigate, showToast]);

  useEffect(() => {
    if (error) showToast?.(error, 'error');
  }, [error, showToast]);

  if (!isAdminRole(role)) {
    return null;
  }

  if (loading && !dashboardView) {
    return (
      <main className="admin-main">
        <p className="admin-page-header__clock">Đang tải thống kê từ máy chủ…</p>
      </main>
    );
  }

  if (!dashboardView) {
    return (
      <main className="admin-main">
        <p className="admin-page-header__clock">Không có dữ liệu thống kê.</p>
        <button type="button" className="admin-panel__link" onClick={reload}>
          Thử lại
        </button>
      </main>
    );
  }

  const {
    trafficOverview,
    revenueOverview,
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
            <h1 className="admin-main__title">Dashboard Giám sát</h1>
            <p className="admin-page-header__clock" aria-live="polite">
              Cập nhật: {clockLabel}
            </p>
          </div>
        </header>

        <section className="admin-stats-grid" aria-label="Thống kê nhanh">
          <article
            className="admin-stat-card admin-stat-card--traffic admin-stat-card--compact admin-stat-card--clickable"
            role="button"
            tabIndex={0}
            aria-label="Người dùng và hoạt động — nhấn để xem chi tiết"
            onClick={() => openDetail('traffic')}
            onKeyDown={(e) => handleCardKeyDown(e, 'traffic')}
          >
            <div className="admin-stat-card__head">
              <p className="admin-stat-card__label">Người dùng</p>
              <StatIconTraffic />
            </div>
            <p className="admin-stat-card__value">
              {trafficOverview.totalUsers.toLocaleString('vi-VN')}
            </p>
            <p className="admin-stat-card__sub">
              {trafficOverview.students.toLocaleString('vi-VN')} sinh viên ·{' '}
              +{trafficOverview.registrationsMonth} đăng ký tháng này
            </p>
            <ul className="admin-stat-card__quick">
              <li>
                <span>Chờ duyệt</span>
                <strong>{trafficOverview.pendingEvents}</strong>
              </li>
              <li>
                <span>Đối tác</span>
                <strong>{trafficOverview.pendingPartners}</strong>
              </li>
              <li>
                <span>Đăng ký vé</span>
                <strong>{trafficOverview.registrations.toLocaleString('vi-VN')}</strong>
              </li>
            </ul>
          </article>

          <article
            className="admin-stat-card admin-stat-card--revenue admin-stat-card--compact admin-stat-card--clickable"
            role="button"
            tabIndex={0}
            aria-label="Doanh thu — nhấn để xem chi tiết"
            onClick={() => openDetail('revenue')}
            onKeyDown={(e) => handleCardKeyDown(e, 'revenue')}
          >
            <div className="admin-stat-card__head">
              <p className="admin-stat-card__label">Doanh thu</p>
              <StatIconRevenue />
            </div>
            <p className="admin-stat-card__value admin-stat-card__value--primary">
              {revenueOverview.total} {revenueOverview.currency}
            </p>
            <p className="admin-stat-card__sub">
              Tháng này: {revenueOverview.thisMonth} ·{' '}
              <span className="admin-stat-card__trend-up">↑ {revenueOverview.trend}</span>
            </p>
            <ul className="admin-stat-card__quick">
              <li>
                <span>Đã duyệt</span>
                <strong>{revenueOverview.approvedEvents}</strong>
              </li>
              <li>
                <span>Đang diễn ra</span>
                <strong>{revenueOverview.liveEvents}</strong>
              </li>
              <li>
                <span>Thông báo</span>
                <strong>{stats?.announcements?.total || 0}</strong>
              </li>
            </ul>
          </article>

          <article className="admin-stat-card admin-stat-card--system admin-stat-card--compact">
            <div className="admin-stat-card__head">
              <p className="admin-stat-card__label">Hệ thống</p>
              <StatIconSystem />
            </div>
            <div className="admin-stat-card__system">
              <span className="admin-status-badge">{systemOverall.label}</span>
              <p className="admin-stat-card__sub">Cập nhật {systemOverall.lastCheck}</p>
            </div>
            <ul className="admin-stat-card__quick admin-stat-card__quick--system">
              <li>
                <span>{systemOverall.database}</span>
                <strong className="admin-stat-card__ok">Kết nối</strong>
              </li>
              <li>
                <span>API Server</span>
                <strong className="admin-stat-card__ok">Hoạt động</strong>
              </li>
            </ul>
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
                <h2 className="admin-panel__title admin-panel__title--flush">Sự kiện tạo mới theo tháng</h2>
                <p className="admin-chart-header__sub">
                  {chartSummary.period} · Số sự kiện · {clockLabel}
                </p>
              </div>
              <div className="admin-chart-kpis" aria-label="Tóm tắt biểu đồ">
                <div className="admin-chart-kpis__item">
                  <span className="admin-chart-kpis__label">Trung bình</span>
                  <span className="admin-chart-kpis__value">{chartSummary.avg}</span>
                </div>
                <div className="admin-chart-kpis__item admin-chart-kpis__item--peak">
                  <span className="admin-chart-kpis__label">Cao nhất</span>
                  <span className="admin-chart-kpis__value">
                    {chartSummary.peak.label} · {chartSummary.peak.value} sự kiện
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
                      <span className="admin-bar-chart__value-label">{item.value}</span>
                      <div
                        className="admin-bar-chart__bar"
                        style={{ height: `${(item.value / maxBar) * 200}px` }}
                        title={`${item.month}: ${item.value} sự kiện`}
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
                  Sự kiện / tháng
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
