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
import { addMinutes, formatAdminDateTime, formatRelativeSeconds, startOfDay } from '../../utils/adminLiveTime';
import { useTranslation } from '../../i18n/I18nContext';
import { mapSelectOptions, resolveLabel } from '../../i18n/helpers';
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
  const { t, language } = useTranslation();
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

  const clockLabel = formatAdminDateTime(live.now, language);
  const { systemOverall } = live;

  const systemOverallDisplay = useMemo(() => {
    const now = live.now;
    const secondsSinceBoot = Math.floor((now.getTime() - startOfDay(now).getTime()) / 1000) % 45 + 8;
    const checkTime = now.toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return {
      label: t('admin.monitor.stable'),
      uptime: systemOverall.uptime,
      uptimeCaption: t('admin.system.status.uptime30'),
      lastCheck: t('admin.system.lastCheck', {
        time: checkTime,
        relative: formatRelativeSeconds(secondsSinceBoot, language),
      }),
    };
  }, [live.now, language, systemOverall.uptime, t]);

  const changeLog = useMemo(
    () =>
      ADMIN_SYSTEM_CHANGE_LOG.map((item) => ({
        ...item,
        time: formatAdminDateTime(addMinutes(live.now, -item.minutesAgo), language),
        action: item.actionKey ? t(item.actionKey) : item.action,
      })),
    [live.now, t, language],
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
      setQuickMetrics(
        ADMIN_QUICK_METRICS.map((m) => ({
          ...m,
          label: resolveLabel(m, t),
          hint: m.hintKey ? t(m.hintKey) : m.hint,
          value:
            m.id === 'accounts'
              ? accountsRes?.total != null
                ? String(accountsRes.total)
                : t('admin.common.empty')
              : m.id === 'pending'
                ? pendingRes?.events?.length != null
                  ? String(pendingRes.events.length)
                  : t('admin.common.empty')
                : t('admin.common.empty'),
        })),
      );
    });
  }, [t]);

  useEffect(() => {
    if (!canAccessAdminSystemPage(role)) {
      showToast?.(t('admin.common.noAccess'), 'error');
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
        showToast?.(t('admin.system.toast.loadFail'), 'error');
      })
      .finally(() => setConfigLoading(false));

    if (isFullAdmin) loadQuickMetrics();
  }, [role, navigate, showToast, loadQuickMetrics, isFullAdmin, t]);

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
      showToast?.(res.message || t('admin.system.toast.saveMaintenance'), 'success');
    } catch (err) {
      showToast?.(err.message || t('admin.system.toast.saveMaintenanceFail'), 'error');
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
      showToast?.(t('admin.system.toast.saveConfig'), 'success');
    }
  };

  const handleReset = () => {
    setConfig(ADMIN_SYSTEM_DEFAULT_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
    setDirty(false);
    showToast?.(t('admin.system.toast.reset'), 'success');
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
          text: t('admin.system.test.ok', { status: res.status, ms }),
        });
        showToast?.(t('admin.system.toast.testOk'), 'success');
      } else {
        setTestResult({ ok: false, text: t('admin.system.test.bad', { status: res.status }) });
        showToast?.(t('admin.system.toast.testBad'), 'error');
      }
    } catch {
      setTestResult({
        ok: false,
        text: t('admin.system.test.unreachable'),
      });
      showToast?.(t('admin.system.toast.testFail'), 'error');
    }
  };

  if (!canAccessAdminSystemPage(role)) return null;

  const encryptionOptions = mapSelectOptions(ENCRYPTION_OPTIONS, t);
  const paymentProviderOptions = mapSelectOptions(PAYMENT_PROVIDER_OPTIONS, t);
  const currencyOptions = mapSelectOptions(CURRENCY_OPTIONS, t);

  const renderMaintenanceOps = () => (
    <>
      <div className="admin-sys-group">
        <h3 className="admin-sys-group__title">{t('admin.system.ops.title')}</h3>
        <AdminToggle
          label={t('admin.system.ops.maintenance')}
          description={t('admin.system.ops.maintenanceDesc')}
          checked={config.maintenanceMode}
          onChange={(v) => patch('maintenanceMode', v)}
          disabled={configLoading || savingMaintenance}
        />
        <AdminToggle
          label={t('admin.system.ops.banner')}
          description={t('admin.system.ops.bannerDesc')}
          checked={config.publicAnnouncements}
          onChange={(v) => patch('publicAnnouncements', v)}
          disabled={configLoading || savingMaintenance}
        />
        {config.maintenanceMode && (
          <div className="admin-sys-field" style={{ padding: '0 16px 14px' }}>
            <span className="admin-sys-field__label">{t('admin.system.ops.bannerContent')}</span>
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
          <p className="admin-sys-maint-preview__title">{t('admin.system.ops.bannerPreview')}</p>
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
      text: config.email.enabled ? t('admin.system.email.smtpOn') : t('admin.system.email.smtpOff'),
    },
    {
      ok: Boolean(config.email.host),
      text: t('admin.system.email.host', { host: config.email.host || t('admin.common.empty') }),
    },
    {
      ok: Boolean(config.email.fromEmail),
      text: t('admin.system.email.from', { email: config.email.fromEmail }),
    },
    {
      ok: true,
      text: t('admin.system.email.envHint'),
    },
  ];

  const renderOverview = () => (
    <div className="admin-sys-overview">
      <div className="admin-sys-hero">
        <span className="admin-sys-hero__indicator" aria-hidden="true" />
        <div className="admin-sys-hero__main">
          <span className="admin-sys-hero__label">{t('admin.system.overallStatus')}</span>
          <span className="admin-sys-hero__status">{systemOverallDisplay.label}</span>
          <p className="admin-sys-hero__meta">{systemOverallDisplay.lastCheck}</p>
        </div>
        <div className="admin-sys-hero__uptime">
          <span className="admin-sys-hero__uptime-value">{systemOverallDisplay.uptime}</span>
          <span className="admin-sys-hero__uptime-caption">{systemOverallDisplay.uptimeCaption}</span>
        </div>
      </div>

      <div className="admin-sys-metrics" aria-label={t('admin.system.quickMetricsAria')}>
        {quickMetrics.map((m) => (
          <article key={m.id} className="admin-sys-metric">
            <p className="admin-sys-metric__value">{m.value}</p>
            <p className="admin-sys-metric__label">{m.label}</p>
            <p className="admin-sys-metric__hint">{m.hint}</p>
          </article>
        ))}
      </div>

      <h3 className="admin-sys-section-title">{t('admin.system.coreServices')}</h3>
      <div className="admin-sys-status-grid">
        {ADMIN_SYSTEM_STATUS_CARDS.map((card) => (
          <article key={card.id} className="admin-sys-status-card">
            <div className="admin-sys-status-card__top">
              <span className={`admin-system-services__dot admin-system-services__dot--${card.status}`} />
              <span className="admin-sys-status-card__title">{t(card.titleKey)}</span>
              <span className={`admin-system-services__pill admin-system-services__pill--${card.status}`}>
                {t(card.statusLabelKey)}
              </span>
            </div>
            <p className="admin-sys-status-card__metric">
              {card.metric} <span>{t(card.metricLabelKey)}</span>
            </p>
            {card.detailKey && <p className="admin-sys-status-card__detail">{t(card.detailKey)}</p>}
          </article>
        ))}
      </div>

      <h3 className="admin-sys-section-title">{t('admin.system.infraDetails')}</h3>
      <ul className="admin-sys-infra-list">
        {ADMIN_INFRA_SERVICES.map((svc) => (
          <li key={svc.id} className="admin-sys-infra-card">
            <div className="admin-sys-infra-card__head">
              <span className={`admin-system-services__dot admin-system-services__dot--${svc.status}`} />
              <h4 className="admin-sys-infra-card__name">{t(svc.nameKey)}</h4>
              <span className={`admin-system-services__pill admin-system-services__pill--${svc.status}`}>
                {t(svc.statusLabelKey)}
              </span>
            </div>
            <dl className="admin-sys-infra-card__body">
              <div className="admin-sys-infra-row">
                <dt>{t('admin.system.infra.endpoint')}</dt>
                <dd>{svc.endpoint}</dd>
              </div>
              <div className="admin-sys-infra-row">
                <dt>{t('admin.system.infra.version')}</dt>
                <dd>{svc.version}</dd>
              </div>
              <div className="admin-sys-infra-row">
                <dt>{t('admin.system.infra.latency')}</dt>
                <dd>{svc.latency}</dd>
              </div>
              <div className="admin-sys-infra-row admin-sys-infra-row--full">
                <dt>{t('admin.system.infra.note')}</dt>
                <dd className="admin-sys-infra-row__note">{t(svc.noteKey)}</dd>
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
        <p className="admin-sys-detail-block__title">{t('admin.system.email.smtpStatus')}</p>
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
        label={t('admin.system.email.enable')}
        description={t('admin.system.email.enableDesc')}
        checked={config.email.enabled}
        onChange={(v) => patch('email.enabled', v)}
      />
      <div className="admin-sys-form__grid">
        <AdminField label={t('admin.system.email.smtpHost')}>
          <input
            type="text"
            className="admin-sys-input"
            value={config.email.host}
            onChange={(e) => patch('email.host', e.target.value)}
            disabled={!config.email.enabled}
          />
        </AdminField>
        <AdminField label={t('admin.system.email.port')}>
          <input
            type="text"
            className="admin-sys-input"
            value={config.email.port}
            onChange={(e) => patch('email.port', e.target.value)}
            disabled={!config.email.enabled}
          />
        </AdminField>
        <AdminField label={t('admin.system.email.encryption')}>
          <AdminFilterDropdown
            label=""
            value={config.email.encryption}
            options={encryptionOptions}
            onChange={(v) => patch('email.encryption', v)}
            menuOpen={openMenu === 'encryption'}
            onMenuToggle={setOpenMenu}
            menuId="encryption"
          />
        </AdminField>
        <AdminField label={t('admin.system.email.timeout')} hint={t('admin.system.email.timeoutHint')}>
          <input
            type="number"
            min="5"
            className="admin-sys-input"
            value={config.email.timeoutSeconds}
            onChange={(e) => patch('email.timeoutSeconds', e.target.value)}
            disabled={!config.email.enabled}
          />
        </AdminField>
        <AdminField label={t('admin.system.email.dailyLimit')}>
          <input
            type="number"
            min="1"
            className="admin-sys-input"
            value={config.email.dailyLimit}
            onChange={(e) => patch('email.dailyLimit', e.target.value)}
            disabled={!config.email.enabled}
          />
        </AdminField>
        <AdminField label={t('admin.system.email.fromName')}>
          <input
            type="text"
            className="admin-sys-input"
            value={config.email.fromName}
            onChange={(e) => patch('email.fromName', e.target.value)}
            disabled={!config.email.enabled}
          />
        </AdminField>
        <AdminField label={t('admin.system.email.fromEmail')}>
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
        {t('admin.system.email.passwordHint')}
      </p>
    </div>
  );

  const renderPayment = () => (
    <div className="admin-sys-form">
      <div className="admin-sys-detail-block">
        <p className="admin-sys-detail-block__title">{t('admin.system.payment.info')}</p>
        <table className="admin-sys-info-table">
          <tbody>
            <tr>
              <th>{t('admin.system.payment.mode')}</th>
              <td>
                {config.payment.sandbox
                  ? t('admin.system.payment.modeSandbox')
                  : t('admin.system.payment.modeProduction')}
              </td>
            </tr>
            <tr>
              <th>{t('admin.system.payment.gateway')}</th>
              <td>
                {paymentProviderOptions.find((o) => o.value === config.payment.provider)?.label ||
                  config.payment.provider}
              </td>
            </tr>
            <tr>
              <th>{t('admin.system.payment.currency')}</th>
              <td>{config.payment.currency}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AdminToggle
        label={t('admin.system.payment.enable')}
        description={t('admin.system.payment.enableDesc')}
        checked={config.payment.enabled}
        onChange={(v) => patch('payment.enabled', v)}
      />
      <AdminToggle
        label={t('admin.system.payment.sandbox')}
        description={t('admin.system.payment.sandboxDesc')}
        checked={config.payment.sandbox}
        onChange={(v) => patch('payment.sandbox', v)}
        disabled={!config.payment.enabled}
      />
      <div className="admin-sys-form__grid">
        <AdminField label={t('admin.system.payment.provider')}>
          <AdminFilterDropdown
            label=""
            value={config.payment.provider}
            options={paymentProviderOptions}
            onChange={(v) => patch('payment.provider', v)}
            menuOpen={openMenu === 'provider'}
            onMenuToggle={setOpenMenu}
            menuId="provider"
          />
        </AdminField>
        <AdminField label={t('admin.system.payment.currency')}>
          <AdminFilterDropdown
            label=""
            value={config.payment.currency}
            options={currencyOptions}
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
        <AdminField label={t('admin.system.payment.minAmount')}>
          <input
            type="number"
            className="admin-sys-input"
            value={config.payment.minAmount}
            onChange={(e) => patch('payment.minAmount', e.target.value)}
            disabled={!config.payment.enabled}
          />
        </AdminField>
        <AdminField label={t('admin.system.payment.maxAmount')}>
          <input
            type="number"
            className="admin-sys-input"
            value={config.payment.maxAmount}
            onChange={(e) => patch('payment.maxAmount', e.target.value)}
            disabled={!config.payment.enabled}
          />
        </AdminField>
        <AdminField label={t('admin.system.payment.callbackUrl')} hint={t('admin.system.payment.callbackHint')} wide>
          <input
            type="url"
            className="admin-sys-input"
            value={config.payment.callbackUrl}
            onChange={(e) => patch('payment.callbackUrl', e.target.value)}
            disabled={!config.payment.enabled}
          />
        </AdminField>
        <AdminField label={t('admin.system.payment.returnUrl')} hint={t('admin.system.payment.returnHint')} wide>
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
        <p className="admin-sys-detail-block__title">{t('admin.system.security.policy')}</p>
        <table className="admin-sys-info-table">
          <tbody>
            <tr>
              <th>{t('admin.system.security.jwtCurrent')}</th>
              <td>{t('admin.system.security.jwtHours', { hours: config.security.jwtHours })}</td>
            </tr>
            <tr>
              <th>{t('admin.system.security.otp')}</th>
              <td>{t('admin.system.security.otpMinutes', { minutes: config.security.otpMinutes })}</td>
            </tr>
            <tr>
              <th>{t('admin.system.security.rateLimit')}</th>
              <td>{t('admin.system.security.rateLimitValue', { limit: config.security.apiRateLimit })}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="admin-sys-form__grid">
        <AdminField label={t('admin.system.security.jwtExpiry')}>
          <input
            type="number"
            min="1"
            className="admin-sys-input"
            value={config.security.jwtHours}
            onChange={(e) => patch('security.jwtHours', e.target.value)}
          />
        </AdminField>
        <AdminField label={t('admin.system.security.otpExpiry')}>
          <input
            type="number"
            min="1"
            className="admin-sys-input"
            value={config.security.otpMinutes}
            onChange={(e) => patch('security.otpMinutes', e.target.value)}
          />
        </AdminField>
        <AdminField label={t('admin.system.security.maxLogin')}>
          <input
            type="number"
            min="1"
            className="admin-sys-input"
            value={config.security.maxLoginAttempts}
            onChange={(e) => patch('security.maxLoginAttempts', e.target.value)}
          />
        </AdminField>
        <AdminField label={t('admin.system.security.lockout')} hint={t('admin.system.security.lockoutHint')}>
          <input
            type="number"
            min="1"
            className="admin-sys-input"
            value={config.security.lockoutMinutes}
            onChange={(e) => patch('security.lockoutMinutes', e.target.value)}
          />
        </AdminField>
        <AdminField label={t('admin.system.security.cors')} hint={t('admin.system.security.corsHint')} wide>
          <input
            type="text"
            className="admin-sys-input"
            value={config.security.corsOrigins}
            onChange={(e) => patch('security.corsOrigins', e.target.value)}
          />
        </AdminField>
        <AdminField label={t('admin.system.security.apiRateLimit')}>
          <input
            type="number"
            min="10"
            className="admin-sys-input"
            value={config.security.apiRateLimit}
            onChange={(e) => patch('security.apiRateLimit', e.target.value)}
          />
        </AdminField>
        <AdminField label={t('admin.system.security.passwordMin')}>
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
        label={t('admin.system.security.strongPassword')}
        description={t('admin.system.security.strongPasswordDesc')}
        checked={config.security.requireStrongPassword}
        onChange={(v) => patch('security.requireStrongPassword', v)}
      />
      <AdminToggle
        label={t('admin.system.security.forceHttps')}
        description={t('admin.system.security.forceHttpsDesc')}
        checked={config.security.forceHttps}
        onChange={(v) => patch('security.forceHttps', v)}
      />
      <AdminToggle
        label={t('admin.system.security.auditLog')}
        description={t('admin.system.security.auditLogDesc')}
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
              <h1 className="admin-main__title">{t('admin.system.maintenanceTitle')}</h1>
              <p className="admin-sys-page__subtitle">{t('admin.system.maintenanceSubtitle')}</p>
              {maintenanceDirty && (
                <p className="admin-page-header__clock" style={{ color: '#c2410c', fontWeight: 600 }}>
                  {t('admin.system.unsaved')}
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
                {savingMaintenance ? t('admin.system.saving') : t('admin.system.saveMaintenance')}
              </button>
            </div>
          </header>

          <section className="admin-panel admin-sys-panel admin-sys-panel--main">
            <div className="admin-sys-panel__body admin-sys-panel__body--maint-only">
              {configLoading ? (
                <p className="admin-sys-panel__lead">{t('admin.system.loadingConfig')}</p>
              ) : (
                renderMaintenanceOps()
              )}
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
            <h1 className="admin-main__title">{t('admin.system.title')}</h1>
            <p className="admin-sys-page__subtitle">{t('admin.system.subtitle')}</p>
            <p className="admin-page-header__clock" aria-live="polite">
              {t('admin.system.updated', { time: clockLabel })}
              {hasUnsaved && (
                <span style={{ marginLeft: 8, color: '#c2410c', fontWeight: 600 }}>
                  · {t('admin.system.unsaved')}
                </span>
              )}
            </p>
          </div>
          <div className="admin-sys-page__actions">
            <button type="button" className="admin-sys-btn admin-sys-btn--ghost" onClick={handleTestConnection}>
              {t('admin.system.testConnection')}
            </button>
            <button type="button" className="admin-sys-btn admin-sys-btn--ghost" onClick={handleReset}>
              {t('admin.system.resetDefault')}
            </button>
            <button
              type="button"
              className="admin-sys-btn admin-sys-btn--primary"
              onClick={handleSave}
              disabled={!hasUnsaved || savingMaintenance}
            >
              {savingMaintenance ? t('admin.system.saving') : t('admin.system.saveConfig')}
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
            <div className="admin-sys-tabs" role="tablist" aria-label={t('admin.system.tabAria')}>
              {ADMIN_SYSTEM_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`admin-sys-tab${activeTab === tab.id ? ' admin-sys-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {resolveLabel(tab, t)}
                </button>
              ))}
            </div>
            <div className="admin-sys-panel__body" role="tabpanel">
              {renderTabContent()}
            </div>
          </section>

          <aside className="admin-panel admin-sys-panel admin-sys-panel--side">
            <div className="admin-sys-side-block">
              <h2 className="admin-panel__title admin-panel__title--flush">{t('admin.system.platform.title')}</h2>
              <table className="admin-sys-info-table">
                <tbody>
                  {ADMIN_PLATFORM_INFO.map((row) => (
                    <tr key={row.labelKey}>
                      <th>{t(row.labelKey)}</th>
                      <td>{row.valueKey ? t(row.valueKey) : row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-sys-side-block">
              <h2 className="admin-panel__title admin-panel__title--flush">{t('admin.system.env.title')}</h2>
              <p className="admin-sys-panel__lead">{t('admin.system.env.lead')}</p>
              <ul className="admin-sys-env-list">
                {ADMIN_ENV_DISPLAY.map((env) => (
                  <li key={env.key} className="admin-sys-env-item">
                    <span className="admin-sys-env-item__key">{env.key}</span>
                    <span className="admin-sys-env-item__val">
                      {env.valueKey ? t(env.valueKey) : env.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="admin-sys-side-block">
              <h2 className="admin-panel__title admin-panel__title--flush">{t('admin.system.changelog.title')}</h2>
              <p className="admin-sys-panel__lead">{t('admin.system.changelog.lead')}</p>
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
              <p className="admin-sys-danger__title">{t('admin.system.danger.title')}</p>
              <p className="admin-sys-danger__desc">{t('admin.system.danger.desc')}</p>
              <button
                type="button"
                className="admin-sys-btn admin-sys-btn--danger"
                onClick={() => showToast?.(t('admin.system.danger.restartMock'), 'error')}
              >
                {t('admin.system.danger.restart')}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default AdminSystemControl;
