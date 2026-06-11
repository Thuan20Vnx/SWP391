import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AdminFilterDropdown from '../../components/admin/AdminFilterDropdown';
import {
  ADMIN_ENV_DISPLAY,
  ADMIN_INFRA_SERVICES,
  ADMIN_PLATFORM_INFO,
  ADMIN_QUICK_METRICS,
  ADMIN_SYSTEM_CHANGE_LOG,
  ADMIN_SYSTEM_DEFAULT_CONFIG,
  ADMIN_SYSTEM_STATUS_CARDS,
  ADMIN_SYSTEM_TABS,
  CURRENCY_OPTIONS,
  ENCRYPTION_OPTIONS,
  PAYMENT_PROVIDER_OPTIONS,
} from '../../data/adminSystemControlData';
import useAdminDashboardLiveData from '../../hooks/useAdminDashboardLiveData';
import { fetchSystemConfig, updateSystemMaintenance } from '../../services/adminApi';
import {
  canAccessAdminSystemPage,
  getUserRole,
  isAdminRole,
  isIcpdpRole,
} from '../../utils/auth';
import { addMinutes, formatAdminDateTime } from '../../utils/adminLiveTime';
import '../../styles/admin-dashboard.css';
import '../../styles/admin-system-control.css';

const STORAGE_KEY = 'fe_admin_system_config_v1';
const API_BASE = 'http://localhost:5000';

const loadConfig = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ADMIN_SYSTEM_DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...ADMIN_SYSTEM_DEFAULT_CONFIG,
      ...parsed,
      email: { ...ADMIN_SYSTEM_DEFAULT_CONFIG.email, ...parsed.email },
      payment: { ...ADMIN_SYSTEM_DEFAULT_CONFIG.payment, ...parsed.payment },
      security: { ...ADMIN_SYSTEM_DEFAULT_CONFIG.security, ...parsed.security },
    };
  } catch {
    return ADMIN_SYSTEM_DEFAULT_CONFIG;
  }
};

const AdminToggle = ({ label, description, checked, onChange, disabled }) => (
  <div className="admin-sys-toggle">
    <div className="admin-sys-toggle__text">
      <p className="admin-sys-toggle__label">{label}</p>
      {description && <p className="admin-sys-toggle__desc">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`admin-sys-switch${checked ? ' admin-sys-switch--on' : ''}`}
      onClick={() => onChange(!checked)}
      disabled={disabled}
    >
      <span className="admin-sys-switch__thumb" />
    </button>
  </div>
);

const AdminField = ({ label, hint, wide, children }) => (
  <label className={`admin-sys-field${wide ? ' admin-sys-field--wide' : ''}`}>
    <span className="admin-sys-field__label">{label}</span>
    {children}
    {hint && <span className="admin-sys-field__hint">{hint}</span>}
  </label>
);

const AdminSystemControl = () => {
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const role = getUserRole();
  const isFullAdmin = isAdminRole(role);
  const isIcpdpOnly = isIcpdpRole(role) && !isFullAdmin;
  const live = useAdminDashboardLiveData();
  const [activeTab, setActiveTab] = useState('overview');
  const [config, setConfig] = useState(loadConfig);
  const [dirty, setDirty] = useState(false);
  const [maintenanceDirty, setMaintenanceDirty] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [quickMetrics, setQuickMetrics] = useState(() =>
    ADMIN_QUICK_METRICS.map((m) => ({ ...m, value: '…' })),
  );

  const clockLabel = formatAdminDateTime(live.now);
  const { systemOverall } = live;

  const changeLog = useMemo(
    () =>
      ADMIN_SYSTEM_CHANGE_LOG.map((item) => ({
        ...item,
        time: formatAdminDateTime(addMinutes(live.now, -item.minutesAgo)),
      })),
    [live.now],
  );

  const loadQuickMetrics = useCallback(() => {
    const email = localStorage.getItem('userEmail');
    const headers = { 'x-user-email': email || '' };

    Promise.all([
      fetch(`${API_BASE}/api/admin/accounts?page=1&limit=1`, { headers })
        .then((r) => r.json())
        .catch(() => null),
      fetch(`${API_BASE}/api/events/pending`, { headers })
        .then((r) => r.json())
        .catch(() => null),
    ]).then(([accountsRes, pendingRes]) => {
      setQuickMetrics([
        {
          id: 'accounts',
          label: 'Tài khoản hệ thống',
          value: accountsRes?.total != null ? String(accountsRes.total) : '—',
          hint: 'Tổng user trong DB',
        },
        {
          id: 'pending',
          label: 'Sự kiện chờ duyệt',
          value: pendingRes?.events?.length != null ? String(pendingRes.events.length) : '—',
          hint: 'status = pending',
        },
        {
          id: 'live',
          label: 'Sự kiện đang live',
          value: '—',
          hint: 'Cần API thống kê (mock)',
        },
        {
          id: 'clubs',
          label: 'Câu lạc bộ',
          value: '—',
          hint: 'Cần API thống kê (mock)',
        },
      ]);
    });
  }, []);

  useEffect(() => {
    if (!canAccessAdminSystemPage(role)) {
      showToast?.('Bạn không có quyền truy cập trang quản trị!', 'error');
      navigate(isIcpdpRole(role) ? '/icpdp' : '/profile');
      return;
    }
    setConfigLoading(true);
    fetchSystemConfig()
      .then((res) => {
        const remote = res.config || res;
        setConfig((prev) => ({
          ...prev,
          maintenanceMode: Boolean(remote.maintenanceMode),
          publicAnnouncements: remote.publicAnnouncements !== false,
          maintenanceMessage:
            remote.maintenanceMessage || ADMIN_SYSTEM_DEFAULT_CONFIG.maintenanceMessage,
        }));
      })
      .catch(() => {
        showToast?.('Không tải được cấu hình bảo trì từ máy chủ', 'error');
      })
      .finally(() => setConfigLoading(false));

    if (isFullAdmin) loadQuickMetrics();
  }, [role, navigate, showToast, loadQuickMetrics, isFullAdmin]);

  const patch = (path, value) => {
    setConfig((prev) => {
      const next = { ...prev };
      const keys = path.split('.');
      let cursor = next;
      for (let i = 0; i < keys.length - 1; i += 1) {
        cursor[keys[i]] = { ...cursor[keys[i]] };
        cursor = cursor[keys[i]];
      }
      cursor[keys[keys.length - 1]] = value;
      return next;
    });
    if (['maintenanceMode', 'publicAnnouncements', 'maintenanceMessage'].includes(path)) {
      setMaintenanceDirty(true);
    } else {
      setDirty(true);
    }
  };

  const handleSaveMaintenance = async () => {
    setSavingMaintenance(true);
    try {
      const res = await updateSystemMaintenance({
        maintenanceMode: config.maintenanceMode,
        publicAnnouncements: config.publicAnnouncements,
        maintenanceMessage: config.maintenanceMessage,
      });
      const remote = res.config || res;
      setConfig((prev) => ({
        ...prev,
        maintenanceMode: Boolean(remote.maintenanceMode),
        publicAnnouncements: remote.publicAnnouncements !== false,
        maintenanceMessage:
          remote.maintenanceMessage || ADMIN_SYSTEM_DEFAULT_CONFIG.maintenanceMessage,
      }));
      setMaintenanceDirty(false);
      showToast?.(res.message || 'Đã lưu cấu hình bảo trì', 'success');
    } catch (err) {
      showToast?.(err.message || 'Lưu cấu hình bảo trì thất bại', 'error');
    } finally {
      setSavingMaintenance(false);
    }
  };

  const handleSave = async () => {
    if (maintenanceDirty) {
      await handleSaveMaintenance();
    }
    if (!isFullAdmin) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setDirty(false);
    if (!maintenanceDirty) {
      showToast?.('Đã lưu cấu hình hệ thống', 'success');
    }
  };

  const handleReset = () => {
    setConfig(ADMIN_SYSTEM_DEFAULT_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
    setDirty(false);
    showToast?.('Đã khôi phục cấu hình mặc định', 'success');
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    const started = Date.now();
    try {
      const res = await fetch(`${API_BASE}/`);
      const ms = Date.now() - started;
      if (res.ok) {
        setTestResult({
          ok: true,
          text: `Backend phản hồi HTTP ${res.status} trong ${ms}ms. MongoDB và SMTP cần kiểm tra riêng trên server.`,
        });
        showToast?.('Kết nối backend thành công', 'success');
      } else {
        setTestResult({ ok: false, text: `Backend trả mã ${res.status}.` });
        showToast?.('Backend không phản hồi đúng', 'error');
      }
    } catch {
      setTestResult({
        ok: false,
        text: 'Không kết nối được tới http://localhost:5000. Hãy chạy npm run dev trong thư mục BE.',
      });
      showToast?.('Không kết nối được backend', 'error');
    }
  };

  if (!canAccessAdminSystemPage(role)) return null;

  const renderMaintenanceOps = () => (
    <>
      <div className="admin-sys-group">
        <h3 className="admin-sys-group__title">Vận hành chung</h3>
        <AdminToggle
          label="Chế độ bảo trì"
          description="Tạm khóa truy cập sinh viên; Admin, CTSV và ICPDP vẫn đăng nhập được"
          checked={config.maintenanceMode}
          onChange={(v) => patch('maintenanceMode', v)}
          disabled={configLoading || savingMaintenance}
        />
        <AdminToggle
          label="Hiển thị banner thông báo"
          description="Banner cảnh báo trên trang chủ khi có sự cố hoặc bảo trì"
          checked={config.publicAnnouncements}
          onChange={(v) => patch('publicAnnouncements', v)}
          disabled={configLoading || savingMaintenance}
        />
        {config.maintenanceMode && (
          <div className="admin-sys-field" style={{ padding: '0 16px 14px' }}>
            <span className="admin-sys-field__label">Nội dung banner bảo trì</span>
            <textarea
              className="admin-sys-input"
              rows={2}
              value={config.maintenanceMessage || ''}
              onChange={(e) => patch('maintenanceMessage', e.target.value)}
              disabled={configLoading || savingMaintenance}
            />
          </div>
        )}
      </div>

      {config.maintenanceMode && (
        <div className="admin-sys-maint-preview">
          <p className="admin-sys-maint-preview__title">Xem trước banner</p>
          <p className="admin-sys-maint-preview__text">
            {config.maintenanceMessage || ADMIN_SYSTEM_DEFAULT_CONFIG.maintenanceMessage}
          </p>
        </div>
      )}
    </>
  );

  const emailChecklist = [
    {
      ok: config.email.enabled,
      text: config.email.enabled ? 'SMTP đang bật' : 'SMTP đang tắt',
    },
    {
      ok: Boolean(config.email.host),
      text: `Host: ${config.email.host || '—'}`,
    },
    {
      ok: Boolean(config.email.fromEmail),
      text: `From: ${config.email.fromEmail}`,
    },
    {
      ok: true,
      text: 'App Password Gmail: cấu hình trong BE/.env (EMAIL_USER, EMAIL_PASS)',
    },
  ];

  const renderOverview = () => (
    <div className="admin-sys-overview">
      <div className="admin-sys-hero">
        <span className="admin-sys-hero__indicator" aria-hidden="true" />
        <div className="admin-sys-hero__main">
          <span className="admin-sys-hero__label">Trạng thái tổng</span>
          <span className="admin-sys-hero__status">{systemOverall.label}</span>
          <p className="admin-sys-hero__meta">{systemOverall.lastCheck}</p>
        </div>
        <div className="admin-sys-hero__uptime">
          <span className="admin-sys-hero__uptime-value">{systemOverall.uptime}</span>
          <span className="admin-sys-hero__uptime-caption">{systemOverall.uptimeCaption}</span>
        </div>
      </div>

      <div className="admin-sys-metrics" aria-label="Chỉ số nhanh">
        {quickMetrics.map((m) => (
          <article key={m.id} className="admin-sys-metric">
            <p className="admin-sys-metric__value">{m.value}</p>
            <p className="admin-sys-metric__label">{m.label}</p>
            <p className="admin-sys-metric__hint">{m.hint}</p>
          </article>
        ))}
      </div>

      <h3 className="admin-sys-section-title">Dịch vụ lõi</h3>
      <div className="admin-sys-status-grid">
        {ADMIN_SYSTEM_STATUS_CARDS.map((card) => (
          <article key={card.id} className="admin-sys-status-card">
            <div className="admin-sys-status-card__top">
              <span className={`admin-system-services__dot admin-system-services__dot--${card.status}`} />
              <span className="admin-sys-status-card__title">{card.title}</span>
              <span className={`admin-system-services__pill admin-system-services__pill--${card.status}`}>
                {card.statusLabel}
              </span>
            </div>
            <p className="admin-sys-status-card__metric">
              {card.metric} <span>{card.metricLabel}</span>
            </p>
            {card.detail && <p className="admin-sys-status-card__detail">{card.detail}</p>}
          </article>
        ))}
      </div>

      <h3 className="admin-sys-section-title">Chi tiết hạ tầng</h3>
      <ul className="admin-sys-infra-list">
        {ADMIN_INFRA_SERVICES.map((svc) => (
          <li key={svc.id} className="admin-sys-infra-card">
            <div className="admin-sys-infra-card__head">
              <span className={`admin-system-services__dot admin-system-services__dot--${svc.status}`} />
              <h4 className="admin-sys-infra-card__name">{svc.name}</h4>
              <span className={`admin-system-services__pill admin-system-services__pill--${svc.status}`}>
                {svc.statusLabel}
              </span>
            </div>
            <dl className="admin-sys-infra-card__body">
              <div className="admin-sys-infra-row">
                <dt>Endpoint</dt>
                <dd>{svc.endpoint}</dd>
              </div>
              <div className="admin-sys-infra-row">
                <dt>Phiên bản</dt>
                <dd>{svc.version}</dd>
              </div>
              <div className="admin-sys-infra-row">
                <dt>Độ trễ</dt>
                <dd>{svc.latency}</dd>
              </div>
              <div className="admin-sys-infra-row admin-sys-infra-row--full">
                <dt>Ghi chú</dt>
                <dd className="admin-sys-infra-row__note">{svc.note}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {renderMaintenanceOps()}
    </div>
  );

  const renderEmail = () => (
    <div className="admin-sys-form">
      <div className="admin-sys-detail-block">
        <p className="admin-sys-detail-block__title">Trạng thái kết nối SMTP</p>
        <ul className="admin-sys-checklist">
          {emailChecklist.map((item) => (
            <li key={item.text}>
              <span
                className={`admin-sys-checklist__dot admin-sys-checklist__dot--${
                  item.ok ? 'ok' : 'off'
                }`}
              />
              {item.text}
            </li>
          ))}
        </ul>
      </div>

      <AdminToggle
        label="Bật Email Server"
        description="Gửi OTP đăng ký và email kích hoạt tài khoản qua SMTP"
        checked={config.email.enabled}
        onChange={(v) => patch('email.enabled', v)}
      />
      <div className="admin-sys-form__grid">
        <AdminField label="SMTP Host">
          <input
            type="text"
            className="admin-sys-input"
            value={config.email.host}
            onChange={(e) => patch('email.host', e.target.value)}
            disabled={!config.email.enabled}
          />
        </AdminField>
        <AdminField label="Cổng (Port)">
          <input
            type="text"
            className="admin-sys-input"
            value={config.email.port}
            onChange={(e) => patch('email.port', e.target.value)}
            disabled={!config.email.enabled}
          />
        </AdminField>
        <AdminField label="Mã hóa">
          <AdminFilterDropdown
            label=""
            value={config.email.encryption}
            options={ENCRYPTION_OPTIONS}
            onChange={(v) => patch('email.encryption', v)}
            menuOpen={openMenu === 'encryption'}
            onMenuToggle={setOpenMenu}
            menuId="encryption"
          />
        </AdminField>
        <AdminField label="Timeout (giây)" hint="Thời gian chờ kết nối SMTP">
          <input
            type="number"
            min="5"
            className="admin-sys-input"
            value={config.email.timeoutSeconds}
            onChange={(e) => patch('email.timeoutSeconds', e.target.value)}
            disabled={!config.email.enabled}
          />
        </AdminField>
        <AdminField label="Giới hạn gửi / ngày">
          <input
            type="number"
            min="1"
            className="admin-sys-input"
            value={config.email.dailyLimit}
            onChange={(e) => patch('email.dailyLimit', e.target.value)}
            disabled={!config.email.enabled}
          />
        </AdminField>
        <AdminField label="Tên hiển thị (From name)">
          <input
            type="text"
            className="admin-sys-input"
            value={config.email.fromName}
            onChange={(e) => patch('email.fromName', e.target.value)}
            disabled={!config.email.enabled}
          />
        </AdminField>
        <AdminField label="Email gửi đi">
          <input
            type="email"
            className="admin-sys-input"
            value={config.email.fromEmail}
            onChange={(e) => patch('email.fromEmail', e.target.value)}
            disabled={!config.email.enabled}
          />
        </AdminField>
        <AdminField label="Reply-To">
          <input
            type="email"
            className="admin-sys-input"
            value={config.email.replyTo}
            onChange={(e) => patch('email.replyTo', e.target.value)}
            disabled={!config.email.enabled}
          />
        </AdminField>
      </div>
      <p className="admin-sys-field__hint" style={{ marginTop: 8 }}>
        Mật khẩu SMTP thật lưu trong <code>BE/.env</code> (EMAIL_USER, EMAIL_PASS), không lưu trên trình duyệt.
      </p>
    </div>
  );

  const renderPayment = () => (
    <div className="admin-sys-form">
      <div className="admin-sys-detail-block">
        <p className="admin-sys-detail-block__title">Thông tin cổng thanh toán</p>
        <table className="admin-sys-info-table">
          <tbody>
            <tr>
              <th>Chế độ</th>
              <td>{config.payment.sandbox ? 'Sandbox (thử nghiệm)' : 'Production'}</td>
            </tr>
            <tr>
              <th>Cổng</th>
              <td>{PAYMENT_PROVIDER_OPTIONS.find((o) => o.value === config.payment.provider)?.label || config.payment.provider}</td>
            </tr>
            <tr>
              <th>Tiền tệ</th>
              <td>{config.payment.currency}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AdminToggle
        label="Bật Payment Gateway"
        description="Cho phép thanh toán vé online qua cổng đối tác"
        checked={config.payment.enabled}
        onChange={(v) => patch('payment.enabled', v)}
      />
      <AdminToggle
        label="Chế độ Sandbox"
        description="Giao dịch thử nghiệm, không trừ tiền thật"
        checked={config.payment.sandbox}
        onChange={(v) => patch('payment.sandbox', v)}
        disabled={!config.payment.enabled}
      />
      <div className="admin-sys-form__grid">
        <AdminField label="Cổng thanh toán">
          <AdminFilterDropdown
            label=""
            value={config.payment.provider}
            options={PAYMENT_PROVIDER_OPTIONS}
            onChange={(v) => patch('payment.provider', v)}
            menuOpen={openMenu === 'provider'}
            onMenuToggle={setOpenMenu}
            menuId="provider"
          />
        </AdminField>
        <AdminField label="Tiền tệ">
          <AdminFilterDropdown
            label=""
            value={config.payment.currency}
            options={CURRENCY_OPTIONS}
            onChange={(v) => patch('payment.currency', v)}
            menuOpen={openMenu === 'currency'}
            onMenuToggle={setOpenMenu}
            menuId="currency"
          />
        </AdminField>
        <AdminField label="Merchant ID">
          <input
            type="text"
            className="admin-sys-input"
            value={config.payment.merchantId}
            onChange={(e) => patch('payment.merchantId', e.target.value)}
            disabled={!config.payment.enabled}
          />
        </AdminField>
        <AdminField label="MoMo Partner Code">
          <input
            type="text"
            className="admin-sys-input"
            value={config.payment.momoPartner}
            onChange={(e) => patch('payment.momoPartner', e.target.value)}
            disabled={!config.payment.enabled}
          />
        </AdminField>
        <AdminField label="Số tiền tối thiểu (VNĐ)">
          <input
            type="number"
            className="admin-sys-input"
            value={config.payment.minAmount}
            onChange={(e) => patch('payment.minAmount', e.target.value)}
            disabled={!config.payment.enabled}
          />
        </AdminField>
        <AdminField label="Số tiền tối đa (VNĐ)">
          <input
            type="number"
            className="admin-sys-input"
            value={config.payment.maxAmount}
            onChange={(e) => patch('payment.maxAmount', e.target.value)}
            disabled={!config.payment.enabled}
          />
        </AdminField>
        <AdminField label="Callback URL" hint="Backend nhận kết quả thanh toán" wide>
          <input
            type="url"
            className="admin-sys-input"
            value={config.payment.callbackUrl}
            onChange={(e) => patch('payment.callbackUrl', e.target.value)}
            disabled={!config.payment.enabled}
          />
        </AdminField>
        <AdminField label="Return URL" hint="Chuyển user về FE sau thanh toán" wide>
          <input
            type="url"
            className="admin-sys-input"
            value={config.payment.returnUrl}
            onChange={(e) => patch('payment.returnUrl', e.target.value)}
            disabled={!config.payment.enabled}
          />
        </AdminField>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="admin-sys-form">
      <div className="admin-sys-detail-block">
        <p className="admin-sys-detail-block__title">Chính sách phiên & API</p>
        <table className="admin-sys-info-table">
          <tbody>
            <tr>
              <th>JWT (hiện tại)</th>
              <td>{config.security.jwtHours} giờ</td>
            </tr>
            <tr>
              <th>OTP đăng ký</th>
              <td>{config.security.otpMinutes} phút</td>
            </tr>
            <tr>
              <th>Rate limit</th>
              <td>{config.security.apiRateLimit} req/phút/IP (mock)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="admin-sys-form__grid">
        <AdminField label="Thời hạn JWT (giờ)">
          <input
            type="number"
            min="1"
            className="admin-sys-input"
            value={config.security.jwtHours}
            onChange={(e) => patch('security.jwtHours', e.target.value)}
          />
        </AdminField>
        <AdminField label="OTP hết hạn (phút)">
          <input
            type="number"
            min="1"
            className="admin-sys-input"
            value={config.security.otpMinutes}
            onChange={(e) => patch('security.otpMinutes', e.target.value)}
          />
        </AdminField>
        <AdminField label="Số lần đăng nhập sai tối đa">
          <input
            type="number"
            min="1"
            className="admin-sys-input"
            value={config.security.maxLoginAttempts}
            onChange={(e) => patch('security.maxLoginAttempts', e.target.value)}
          />
        </AdminField>
        <AdminField label="Khóa tài khoản (phút)" hint="Sau khi vượt số lần sai">
          <input
            type="number"
            min="1"
            className="admin-sys-input"
            value={config.security.lockoutMinutes}
            onChange={(e) => patch('security.lockoutMinutes', e.target.value)}
          />
        </AdminField>
        <AdminField label="CORS origins" hint="Phân tách bằng dấu phẩy" wide>
          <input
            type="text"
            className="admin-sys-input"
            value={config.security.corsOrigins}
            onChange={(e) => patch('security.corsOrigins', e.target.value)}
          />
        </AdminField>
        <AdminField label="API rate limit (req/phút)">
          <input
            type="number"
            min="10"
            className="admin-sys-input"
            value={config.security.apiRateLimit}
            onChange={(e) => patch('security.apiRateLimit', e.target.value)}
          />
        </AdminField>
        <AdminField label="Độ dài mật khẩu tối thiểu">
          <input
            type="number"
            min="6"
            className="admin-sys-input"
            value={config.security.passwordMinLength}
            onChange={(e) => patch('security.passwordMinLength', e.target.value)}
          />
        </AdminField>
      </div>
      <AdminToggle
        label="Bắt buộc mật khẩu mạnh"
        description="Chữ hoa, chữ thường, số và ký tự đặc biệt khi đăng ký"
        checked={config.security.requireStrongPassword}
        onChange={(v) => patch('security.requireStrongPassword', v)}
      />
      <AdminToggle
        label="Bắt buộc HTTPS"
        description="Chuyển hướng HTTP sang HTTPS trên production"
        checked={config.security.forceHttps}
        onChange={(v) => patch('security.forceHttps', v)}
      />
      <AdminToggle
        label="Ghi nhật ký kiểm toán (Audit log)"
        description="Lưu mọi thay đổi cấu hình và hành động admin"
        checked={config.security.auditLog}
        onChange={(v) => patch('security.auditLog', v)}
      />
    </div>
  );

  const renderTabContent = () => {
    if (activeTab === 'overview') return renderOverview();
    if (activeTab === 'email') return renderEmail();
    if (activeTab === 'payment') return renderPayment();
    return renderSecurity();
  };

  if (isIcpdpOnly) {
    return (
      <main className="admin-main">
        <div className="admin-sys-page admin-sys-page--icpdp">
          <header className="admin-page-header admin-sys-page__header">
            <div>
              <h1 className="admin-main__title">Bảo trì hệ thống</h1>
              <p className="admin-sys-page__subtitle">
                Bật chế độ bảo trì để tạm khóa sinh viên; IC-PDP, CTSV và Admin vẫn truy cập được.
              </p>
              {maintenanceDirty && (
                <p className="admin-page-header__clock" style={{ color: '#c2410c', fontWeight: 600 }}>
                  Có thay đổi chưa lưu
                </p>
              )}
            </div>
            <div className="admin-sys-page__actions">
              <button
                type="button"
                className="admin-sys-btn admin-sys-btn--primary"
                onClick={handleSaveMaintenance}
                disabled={!maintenanceDirty || savingMaintenance || configLoading}
              >
                {savingMaintenance ? 'Đang lưu…' : 'Lưu cấu hình bảo trì'}
              </button>
            </div>
          </header>

          <section className="admin-panel admin-sys-panel admin-sys-panel--main">
            <div className="admin-sys-panel__body admin-sys-panel__body--maint-only">
              {configLoading ? <p className="admin-sys-panel__lead">Đang tải cấu hình…</p> : renderMaintenanceOps()}
            </div>
          </section>
        </div>
      </main>
    );
  }

  const hasUnsaved = dirty || maintenanceDirty;

  return (
    <main className="admin-main">
      <div className="admin-sys-page">
        <header className="admin-page-header admin-sys-page__header">
          <div>
            <h1 className="admin-main__title">Kiểm soát hệ thống</h1>
            <p className="admin-sys-page__subtitle">
              Giám sát hạ tầng, cấu hình Email / Payment / Bảo mật và theo dõi trạng thái vận hành F-Events.
            </p>
            <p className="admin-page-header__clock" aria-live="polite">
              Cập nhật: {clockLabel}
              {hasUnsaved && (
                <span style={{ marginLeft: 8, color: '#c2410c', fontWeight: 600 }}>
                  · Có thay đổi chưa lưu
                </span>
              )}
            </p>
          </div>
          <div className="admin-sys-page__actions">
            <button type="button" className="admin-sys-btn admin-sys-btn--ghost" onClick={handleTestConnection}>
              Kiểm tra kết nối
            </button>
            <button type="button" className="admin-sys-btn admin-sys-btn--ghost" onClick={handleReset}>
              Khôi phục mặc định
            </button>
            <button
              type="button"
              className="admin-sys-btn admin-sys-btn--primary"
              onClick={handleSave}
              disabled={!hasUnsaved || savingMaintenance}
            >
              {savingMaintenance ? 'Đang lưu…' : 'Lưu cấu hình'}
            </button>
          </div>
        </header>

        {testResult && (
          <div
            className={`admin-sys-test-result admin-sys-test-result--${testResult.ok ? 'ok' : 'err'}`}
            role="status"
          >
            {testResult.text}
          </div>
        )}

        <div className="admin-sys-layout">
          <section className="admin-panel admin-sys-panel admin-sys-panel--main">
            <div className="admin-sys-tabs" role="tablist" aria-label="Khu vực cấu hình">
              {ADMIN_SYSTEM_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`admin-sys-tab${activeTab === tab.id ? ' admin-sys-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="admin-sys-panel__body" role="tabpanel">
              {renderTabContent()}
            </div>
          </section>

          <aside className="admin-panel admin-sys-panel admin-sys-panel--side">
            <div className="admin-sys-side-block">
              <h2 className="admin-panel__title admin-panel__title--flush">Thông tin nền tảng</h2>
              <table className="admin-sys-info-table">
                <tbody>
                  {ADMIN_PLATFORM_INFO.map((row) => (
                    <tr key={row.label}>
                      <th>{row.label}</th>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-sys-side-block">
              <h2 className="admin-panel__title admin-panel__title--flush">Biến môi trường (BE)</h2>
              <p className="admin-sys-panel__lead">Giá trị tham chiếu — chỉnh trong file BE/.env</p>
              <ul className="admin-sys-env-list">
                {ADMIN_ENV_DISPLAY.map((env) => (
                  <li key={env.key} className="admin-sys-env-item">
                    <span className="admin-sys-env-item__key">{env.key}</span>
                    <span className="admin-sys-env-item__val">{env.value}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="admin-sys-side-block">
              <h2 className="admin-panel__title admin-panel__title--flush">Nhật ký thay đổi</h2>
              <p className="admin-sys-panel__lead">Các chỉnh sửa cấu hình gần đây</p>
              <ul className="admin-sys-changelog">
                {changeLog.map((entry) => (
                  <li key={entry.id} className={`admin-sys-changelog__item admin-sys-changelog__item--${entry.tone}`}>
                    <p className="admin-sys-changelog__time">{entry.time}</p>
                    <p className="admin-sys-changelog__actor">{entry.actor}</p>
                    <p className="admin-sys-changelog__action">{entry.action}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="admin-sys-danger">
              <p className="admin-sys-danger__title">Vùng nguy hiểm</p>
              <p className="admin-sys-danger__desc">
                Khởi động lại dịch vụ lõi — chỉ dùng khi có sự cố nghiêm trọng. Cần quyền IT Admin.
              </p>
              <button
                type="button"
                className="admin-sys-btn admin-sys-btn--danger"
                onClick={() => showToast?.('Yêu cầu khởi động lại đã ghi nhận (mock)', 'error')}
              >
                Khởi động lại hệ thống
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default AdminSystemControl;
