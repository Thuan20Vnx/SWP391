import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AdminFilterDropdown from '../../components/admin/AdminFilterDropdown';
import {
  ADMIN_ENV_DISPLAY,
  ADMIN_INFRA_SERVICES,
  ADMIN_PLATFORM_INFO,
  ADMIN_QUICK_METRICS,
  ADMIN_SYSTEM_DEFAULT_CONFIG,
  ADMIN_SYSTEM_STATUS_CARDS,
  ADMIN_SYSTEM_TABS,
  ENCRYPTION_OPTIONS,
} from '../../data/adminSystemControlData';
import useAdminDashboardLiveData from '../../hooks/useAdminDashboardLiveData';
import { notifySystemMaintenanceChanged } from '../../hooks/useSystemMaintenanceStatus';
import {
  fetchAuditLogs,
  fetchPublicSystemStatus,
  fetchSystemConfig,
  fetchSystemHealth,
  sendSystemTestEmail,
  updateSystemEmailConfig,
  updateSystemMaintenance,
  updateSystemPaymentConfig,
  updateSystemSecurityConfig,
} from '../../services/adminApi';
import { API_BASE } from '../../utils/api';
import {
  canAccessAdminSystemPage,
  getUserRole,
  isAdminRole,
  isIcpdpRole,
} from '../../utils/auth';
import { formatAdminDateTime, formatLatency, formatRelativeSeconds, secondsSince } from '../../utils/adminLiveTime';
import { useTranslation } from '../../i18n/I18nContext';
import { mapSelectOptions, resolveLabel } from '../../i18n/helpers';
import '../../styles/admin-dashboard.css';
import '../../styles/admin-system-control.css';

const HEALTH_POLL_MS = 8000;

const parseMaintenanceConfig = (res) => {
  const remote = res?.config ?? res ?? {};
  return {
    maintenanceMode: Boolean(remote.maintenanceMode),
    publicAnnouncements: remote.publicAnnouncements !== false,
    maintenanceMessage:
      remote.maintenanceMessage || ADMIN_SYSTEM_DEFAULT_CONFIG.maintenanceMessage,
    maintenanceGraceSeconds: String(remote.maintenanceGraceSeconds ?? 15),
  };
};

const buildMaintenancePayload = (cfg, overrides = {}) => ({
  maintenanceMode: overrides.maintenanceMode ?? cfg.maintenanceMode,
  publicAnnouncements: overrides.publicAnnouncements ?? cfg.publicAnnouncements,
  maintenanceMessage: overrides.maintenanceMessage ?? cfg.maintenanceMessage,
  maintenanceGraceSeconds: Number(overrides.maintenanceGraceSeconds ?? cfg.maintenanceGraceSeconds) || 15,
});

const mapUiStatus = (status) => {
  if (status === 'offline' || status === 'degraded') return 'degraded';
  return 'online';
};

const AdminToggle = ({ label, description, checked, onChange, disabled }) => (
  <div className="admin-sys-toggle">
    <div
      className="admin-sys-toggle__text"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <p className="admin-sys-toggle__label">{label}</p>
      {description && <p className="admin-sys-toggle__desc">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
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
  const [config, setConfig] = useState(() => ({
    ...ADMIN_SYSTEM_DEFAULT_CONFIG,
    email: { ...ADMIN_SYSTEM_DEFAULT_CONFIG.email },
    security: { ...ADMIN_SYSTEM_DEFAULT_CONFIG.security },
    payment: { ...ADMIN_SYSTEM_DEFAULT_CONFIG.payment },
  }));
  const [emailDirty, setEmailDirty] = useState(false);
  const [securityDirty, setSecurityDirty] = useState(false);
  const [paymentDirty, setPaymentDirty] = useState(false);
  const [maintenanceDirty, setMaintenanceDirty] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [paymentWebhookUrl, setPaymentWebhookUrl] = useState('');
  const [serverMaintenanceOn, setServerMaintenanceOn] = useState(false);

  const dirty = emailDirty || securityDirty || paymentDirty;

  const clockLabel = formatAdminDateTime(live.now, language);

  const resolvePillLabel = useCallback(
    (status, kind, paymentMode) => {
      if (status === 'offline') return t('admin.system.status.offline');
      if (status === 'degraded') return t('admin.system.status.degraded');
      if (kind === 'db') return t('admin.system.status.connected');
      if (kind === 'payment') {
        if (paymentMode === 'production') return t('admin.system.status.online');
        if (paymentMode === 'sandbox') return t('admin.system.status.sandbox');
        if (paymentMode === 'disabled') return t('admin.system.status.notConfigured');
      }
      return t('admin.system.status.online');
    },
    [t],
  );

  const systemOverallDisplay = useMemo(() => {
    const checkedAt = systemHealth?.checkedAt ? new Date(systemHealth.checkedAt) : null;
    const checkTime = checkedAt
      ? checkedAt.toLocaleTimeString(language === 'en' ? 'en-US' : 'vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      : '—';
    const relativeSeconds = checkedAt ? secondsSince(checkedAt, live.now) : 0;
    const overallStatus = systemHealth?.overall?.status || 'stable';
    const labelKey =
      overallStatus === 'offline'
        ? 'admin.monitor.offline'
        : overallStatus === 'degraded'
          ? 'admin.monitor.degraded'
          : 'admin.monitor.stable';

    return {
      label: healthLoading && !systemHealth ? '…' : t(labelKey),
      uptime: systemHealth?.overall?.uptimeFormatted || '—',
      uptimeCaption: t('admin.system.status.uptimeCaption'),
      lastCheck: checkedAt
        ? t('admin.system.lastCheck', {
            time: checkTime,
            relative: formatRelativeSeconds(relativeSeconds, language),
          })
        : healthLoading
          ? t('admin.system.loadingHealth')
          : '—',
    };
  }, [live.now, language, systemHealth, healthLoading, t]);

  const changeLog = useMemo(
    () =>
      auditLogs.map((item) => ({
        id: item.id,
        tone: item.tone || 'default',
        actor: item.actor,
        action: item.detail ? `${item.action} — ${item.detail}` : item.action,
        time: item.createdAt
          ? formatAdminDateTime(new Date(item.createdAt), language)
          : '—',
      })),
    [auditLogs, language],
  );

  const quickMetrics = useMemo(() => {
    const metrics = systemHealth?.metrics;
    return ADMIN_QUICK_METRICS.map((m) => ({
      ...m,
      label: resolveLabel(m, t),
      hint: m.hintKey ? t(m.hintKey) : m.hint,
      value:
        !metrics && healthLoading
          ? '…'
          : m.id === 'accounts'
            ? metrics?.accounts != null
              ? String(metrics.accounts)
              : t('admin.common.empty')
            : m.id === 'pending'
              ? metrics?.pendingEvents != null
                ? String(metrics.pendingEvents)
                : t('admin.common.empty')
              : m.id === 'live'
                ? metrics?.liveEvents != null
                  ? String(metrics.liveEvents)
                  : t('admin.common.empty')
                : metrics?.clubs != null
                  ? String(metrics.clubs)
                  : t('admin.common.empty'),
    }));
  }, [systemHealth, healthLoading, t]);

  const statusCards = useMemo(() => {
    if (!systemHealth?.services) {
      return ADMIN_SYSTEM_STATUS_CARDS.map((card) => ({
        ...card,
        title: t(card.titleKey),
        statusLabel: healthLoading ? '…' : t(card.statusLabelKey),
        metric: healthLoading ? '…' : card.metric,
        metricLabel: t(card.metricLabelKey),
        detail: card.detailKey ? t(card.detailKey) : '',
      }));
    }

    const { api, db, email, payment } = systemHealth.services;
    const cards = [
      {
        id: 'api',
        titleKey: 'admin.system.status.api',
        service: api,
        kind: 'api',
        metric: systemHealth.overall?.uptimeFormatted || '—',
        metricLabelKey: 'admin.system.status.uptimeCaption',
      },
      {
        id: 'db',
        titleKey: 'admin.system.status.db',
        service: db,
        kind: 'db',
        metric: db?.name || '—',
        metricLabelKey: 'admin.system.status.database',
      },
      {
        id: 'email',
        titleKey: 'admin.system.status.email',
        service: email,
        kind: 'email',
        metric: formatLatency(email?.latencyMs),
        metricLabelKey: 'admin.system.status.smtpResponse',
      },
      {
        id: 'payment',
        titleKey: 'admin.system.status.payment',
        service: payment,
        kind: 'payment',
        metric: payment?.errors24h != null ? String(payment.errors24h) : '—',
        metricLabelKey: 'admin.system.status.errors24h',
      },
    ];

    return cards.map((card) => ({
      id: card.id,
      status: mapUiStatus(card.service?.status),
      title: t(card.titleKey),
      statusLabel: resolvePillLabel(card.service?.status, card.kind, card.service?.mode),
      metric: card.metric,
      metricLabel: t(card.metricLabelKey),
      detail: card.service?.detail || card.service?.framework || '',
    }));
  }, [systemHealth, healthLoading, resolvePillLabel, t]);

  const infraServices = useMemo(() => {
    const source = systemHealth?.infra?.length ? systemHealth.infra : ADMIN_INFRA_SERVICES;
    const nameKeys = {
      fe: 'admin.system.infra.fe',
      be: 'admin.system.infra.be',
      db: 'admin.system.infra.db',
      smtp: 'admin.system.infra.smtp',
    };

    return source.map((svc) => {
      const id = svc.id;
      const fromApi = Boolean(systemHealth?.infra?.length);
      return {
        id,
        name: t(nameKeys[id] || svc.nameKey),
        endpoint: fromApi ? svc.endpoint : svc.endpoint,
        version: svc.version,
        status: mapUiStatus(fromApi ? svc.status : svc.status),
        statusLabel: fromApi
          ? resolvePillLabel(svc.status, id === 'db' ? 'db' : 'api')
          : t(svc.statusLabelKey),
        latency: fromApi ? formatLatency(svc.latencyMs) : svc.latency,
        note: fromApi ? svc.note : t(svc.noteKey),
      };
    });
  }, [systemHealth, resolvePillLabel, t]);

  const platformRows = useMemo(() => {
    if (!systemHealth?.platform) {
      return ADMIN_PLATFORM_INFO.map((row) => ({
        label: t(row.labelKey),
        value: row.valueKey ? t(row.valueKey) : row.value,
      }));
    }

    return [
      { label: t('admin.system.platform.version'), value: systemHealth.platform.version },
      { label: t('admin.system.platform.env'), value: systemHealth.platform.environment },
      {
        label: t('admin.system.platform.jwt'),
        value: t('admin.system.security.jwtHours', { hours: config.security.jwtHours }),
      },
      { label: t('admin.system.platform.cors'), value: systemHealth.platform.cors },
      { label: t('admin.system.platform.storage'), value: t('admin.system.platform.storageValue') },
    ];
  }, [systemHealth, config.security.jwtHours, t]);

  const envRows = useMemo(() => {
    const source = systemHealth?.env?.length ? systemHealth.env : ADMIN_ENV_DISPLAY;
    return source.map((env) => ({
      key: env.key,
      value: env.valueKey ? t(env.valueKey) : env.value,
    }));
  }, [systemHealth, t]);

  const refreshSystemHealth = useCallback(async () => {
    if (!isFullAdmin) return;
    try {
      const res = await fetchSystemHealth();
      setSystemHealth(res.health || res);
    } catch {
      setSystemHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, [isFullAdmin]);

  useEffect(() => {
    if (!canAccessAdminSystemPage(role)) {
      showToast?.(t('admin.common.noAccess'), 'error');
      navigate(isIcpdpRole(role) ? '/icpdp' : '/profile');
      return undefined;
    }
    let cancelled = false;
    setConfigLoading(true);
    fetchSystemConfig()
      .then((res) => {
        if (cancelled) return;
        const maintenance = parseMaintenanceConfig(res);
        setConfig((prev) => ({
          ...prev,
          ...maintenance,
          ...(res.email ? { email: { ...prev.email, ...res.email } } : {}),
          ...(res.security ? { security: { ...prev.security, ...res.security } } : {}),
          ...(res.payment ? { payment: { ...prev.payment, ...res.payment, webhookApiKey: '' } } : {}),
        }));
        setServerMaintenanceOn(maintenance.maintenanceMode);
        setPaymentWebhookUrl(res.paymentWebhookUrl || '');
        setEmailDirty(false);
        setSecurityDirty(false);
        setPaymentDirty(false);
        setMaintenanceDirty(false);
      })
      .catch(() => {
        if (!cancelled) showToast?.(t('admin.system.toast.loadFail'), 'error');
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false);
      });

    if (isFullAdmin) {
      refreshSystemHealth();
      fetchAuditLogs(30)
        .then((res) => {
          if (!cancelled) setAuditLogs(res.logs || []);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
    // Chỉ tải lại khi đổi quyền — tránh ghi đè toggle đang lưu
  }, [role, isFullAdmin, navigate, refreshSystemHealth, showToast, t]);

  useEffect(() => {
    if (!isFullAdmin) return undefined;
    const id = window.setInterval(refreshSystemHealth, HEALTH_POLL_MS);
    return () => window.clearInterval(id);
  }, [isFullAdmin, refreshSystemHealth]);

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
    if (['maintenanceMode', 'publicAnnouncements', 'maintenanceMessage', 'maintenanceGraceSeconds'].includes(path)) {
      setMaintenanceDirty(true);
    } else if (path.startsWith('email.')) {
      setEmailDirty(true);
    } else if (path.startsWith('security.')) {
      setSecurityDirty(true);
    } else if (path.startsWith('payment.')) {
      setPaymentDirty(true);
    }
  };

  const handleSaveMaintenance = async () => {
    setSavingMaintenance(true);
    try {
      const res = await updateSystemMaintenance(buildMaintenancePayload(config));
      const maintenance = parseMaintenanceConfig(res);
      setConfig((prev) => ({ ...prev, ...maintenance }));
      setServerMaintenanceOn(maintenance.maintenanceMode);
      setMaintenanceDirty(false);
      notifySystemMaintenanceChanged();
      showToast?.(res.message || t('admin.system.toast.saveMaintenance'), 'success');
    } catch (err) {
      showToast?.(err.message || t('admin.system.toast.saveMaintenanceFail'), 'error');
    } finally {
      setSavingMaintenance(false);
    }
  };

  const persistMaintenanceMode = async (nextMode) => {
    const prevMode = config.maintenanceMode;
    setConfig((prev) => ({ ...prev, maintenanceMode: nextMode }));
    setSavingMaintenance(true);
    try {
      const res = await updateSystemMaintenance(buildMaintenancePayload(config, { maintenanceMode: nextMode }));
      const maintenance = parseMaintenanceConfig(res);
      setConfig((prev) => ({ ...prev, ...maintenance }));
      setServerMaintenanceOn(maintenance.maintenanceMode);
      setMaintenanceDirty(false);
      notifySystemMaintenanceChanged();
      showToast?.(res.message || t('admin.system.toast.saveMaintenance'), 'success');
      refreshAuditLogs();
    } catch (err) {
      setConfig((prev) => ({ ...prev, maintenanceMode: prevMode }));
      try {
        const live = await fetchPublicSystemStatus();
        setServerMaintenanceOn(Boolean(live.maintenanceMode));
      } catch {
        setServerMaintenanceOn(prevMode);
      }
      showToast?.(err.message || t('admin.system.toast.saveMaintenanceFail'), 'error');
    } finally {
      setSavingMaintenance(false);
    }
  };

  const refreshAuditLogs = useCallback(() => {
    if (!isFullAdmin) return;
    fetchAuditLogs(30)
      .then((res) => setAuditLogs(res.logs || []))
      .catch(() => {});
  }, [isFullAdmin]);

  const handleSave = async () => {
    if (maintenanceDirty) {
      await handleSaveMaintenance();
    }
    if (!isFullAdmin) {
      refreshAuditLogs();
      return;
    }
    if (!emailDirty && !securityDirty && !paymentDirty) {
      if (!maintenanceDirty) showToast?.(t('admin.system.toast.saveConfig'), 'success');
      refreshAuditLogs();
      return;
    }
    setSavingConfig(true);
    try {
      if (emailDirty) {
        const res = await updateSystemEmailConfig(config.email);
        setConfig((prev) => ({ ...prev, email: { ...prev.email, ...res.email } }));
        setEmailDirty(false);
      }
      if (securityDirty) {
        const res = await updateSystemSecurityConfig(config.security);
        setConfig((prev) => ({ ...prev, security: { ...prev.security, ...res.security } }));
        setSecurityDirty(false);
      }
      if (paymentDirty) {
        const res = await updateSystemPaymentConfig(config.payment);
        setConfig((prev) => ({ ...prev, payment: { ...prev.payment, ...res.payment, webhookApiKey: '' } }));
        setPaymentDirty(false);
      }
      showToast?.(t('admin.system.toast.saveConfig'), 'success');
      refreshAuditLogs();
    } catch (err) {
      showToast?.(err.message || t('admin.system.toast.saveConfigFail'), 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleReset = () => {
    setConfig((prev) => ({
      ...prev,
      email: { ...ADMIN_SYSTEM_DEFAULT_CONFIG.email },
      security: { ...ADMIN_SYSTEM_DEFAULT_CONFIG.security },
    }));
    setEmailDirty(true);
    setSecurityDirty(true);
    showToast?.(t('admin.system.toast.reset'), 'info');
  };

  const handleSendTestEmail = async () => {
    const target = (testEmailTo || '').trim();
    if (!target) {
      showToast?.(t('admin.system.email.testRequired'), 'error');
      return;
    }
    setSendingTestEmail(true);
    try {
      const res = await sendSystemTestEmail(target);
      showToast?.(res.message || t('admin.system.email.testSent'), 'success');
      if (res.previewUrl) {
        setTestResult({ ok: true, text: `Preview: ${res.previewUrl}` });
      }
      refreshAuditLogs();
    } catch (err) {
      showToast?.(err.message || t('admin.system.email.testFail'), 'error');
    } finally {
      setSendingTestEmail(false);
    }
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
        refreshSystemHealth();
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
  const tabOptions = ADMIN_SYSTEM_TABS.map((tab) => ({
    value: tab.id,
    label: resolveLabel(tab, t),
  }));

  const renderMaintenanceOps = () => (
    <>
      <div className="admin-sys-group">
        <h3 className="admin-sys-group__title">{t('admin.system.ops.title')}</h3>
        <AdminToggle
          label={t('admin.system.ops.maintenance')}
          description={t('admin.system.ops.maintenanceDesc')}
          checked={config.maintenanceMode}
          onChange={persistMaintenanceMode}
          disabled={configLoading || savingMaintenance}
        />
        <p
          className={`admin-sys-maint-server-status${serverMaintenanceOn ? ' admin-sys-maint-server-status--on' : ''}`}
          role="status"
        >
          {savingMaintenance
            ? t('admin.system.ops.maintenanceSaving')
            : serverMaintenanceOn
              ? t('admin.system.ops.maintenanceServerOn')
              : t('admin.system.ops.maintenanceServerOff')}
        </p>
        <p className="admin-sys-maint-hint">
          {t('admin.system.ops.maintenanceTestHint')}
        </p>
        <div className="admin-sys-field admin-sys-field--in-group">
          <span className="admin-sys-field__label">{t('admin.system.ops.graceSeconds')}</span>
          <input
            type="number"
            className="admin-sys-input"
            min={5}
            max={600}
            step={1}
            value={config.maintenanceGraceSeconds}
            onChange={(e) => patch('maintenanceGraceSeconds', e.target.value)}
            disabled={configLoading || savingMaintenance}
          />
          <span className="admin-sys-field__hint">{t('admin.system.ops.graceSecondsHint')}</span>
        </div>
        <AdminToggle
          label={t('admin.system.ops.banner')}
          description={t('admin.system.ops.bannerDesc')}
          checked={config.publicAnnouncements}
          onChange={(v) => patch('publicAnnouncements', v)}
          disabled={configLoading || savingMaintenance}
        />
        {config.maintenanceMode && (
          <div className="admin-sys-field admin-sys-field--in-group">
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
        {statusCards.map((card) => (
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
            <p className="admin-sys-status-card__detail">{card.detail || '\u00A0'}</p>
          </article>
        ))}
      </div>

      <h3 className="admin-sys-section-title">{t('admin.system.infraDetails')}</h3>
      <ul className="admin-sys-infra-list">
        {infraServices.map((svc) => (
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

      <div className="admin-sys-detail-block" style={{ marginTop: 16 }}>
        <p className="admin-sys-detail-block__title">{t('admin.system.email.testTitle')}</p>
        <p className="admin-sys-field__hint" style={{ marginBottom: 10 }}>
          {t('admin.system.email.testHint')}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <input
              type="email"
              className="admin-sys-input"
              placeholder={t('admin.system.email.testPlaceholder')}
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              disabled={sendingTestEmail}
            />
          </div>
          <button
            type="button"
            className="admin-sys-btn admin-sys-btn--ghost"
            onClick={handleSendTestEmail}
            disabled={sendingTestEmail || !config.email.enabled}
          >
            {sendingTestEmail ? t('admin.system.email.testSending') : t('admin.system.email.testButton')}
          </button>
        </div>
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

  const renderPayment = () => (
    <div className="admin-sys-form">
      <div className="admin-sys-detail-block">
        <p className="admin-sys-detail-block__title">{t('admin.system.payment.sepayTitle')}</p>
        <p className="admin-sys-field__hint">{t('admin.system.payment.sepayHint')}</p>
        <ul className="admin-sys-checklist">
          <li>
            <span className={`admin-sys-checklist__dot admin-sys-checklist__dot--${config.payment.enabled ? 'ok' : 'off'}`} />
            {config.payment.enabled ? t('admin.system.payment.statusOn') : t('admin.system.payment.statusOff')}
          </li>
          <li>
            <span className={`admin-sys-checklist__dot admin-sys-checklist__dot--${config.payment.accountNumber ? 'ok' : 'off'}`} />
            {t('admin.system.payment.accStatus', {
              acc: config.payment.accountNumber || t('admin.common.empty'),
              bank: config.payment.bankCode || t('admin.common.empty'),
            })}
          </li>
          <li>
            <span className={`admin-sys-checklist__dot admin-sys-checklist__dot--${config.payment.webhookApiKeySet ? 'ok' : 'off'}`} />
            {config.payment.webhookApiKeySet
              ? t('admin.system.payment.webhookSet')
              : t('admin.system.payment.webhookUnset')}
          </li>
        </ul>
      </div>

      <AdminToggle
        label={t('admin.system.payment.enable')}
        description={t('admin.system.payment.enableDesc')}
        checked={config.payment.enabled}
        onChange={(v) => patch('payment.enabled', v)}
      />

      <div className="admin-sys-form__grid">
        <AdminField label={t('admin.system.payment.accountNumber')}>
          <input
            type="text"
            className="admin-sys-input"
            value={config.payment.accountNumber}
            onChange={(e) => patch('payment.accountNumber', e.target.value)}
          />
        </AdminField>
        <AdminField label={t('admin.system.payment.bankCode')} hint={t('admin.system.payment.bankCodeHint')}>
          <input
            type="text"
            className="admin-sys-input"
            value={config.payment.bankCode}
            onChange={(e) => patch('payment.bankCode', e.target.value)}
            placeholder="VPBank, Vietcombank, MBBank..."
          />
        </AdminField>
        <AdminField label={t('admin.system.payment.accountHolder')}>
          <input
            type="text"
            className="admin-sys-input"
            value={config.payment.accountHolder}
            onChange={(e) => patch('payment.accountHolder', e.target.value)}
          />
        </AdminField>
        <AdminField label={t('admin.system.payment.expireMinutes')} hint={t('admin.system.payment.expireHint')}>
          <input
            type="number"
            min="1"
            max="1440"
            className="admin-sys-input"
            value={config.payment.expireMinutes}
            onChange={(e) => patch('payment.expireMinutes', e.target.value)}
          />
        </AdminField>
        <AdminField label={t('admin.system.payment.webhookApiKey')} hint={t('admin.system.payment.webhookApiKeyHint')} wide>
          <input
            type="password"
            className="admin-sys-input"
            value={config.payment.webhookApiKey || ''}
            placeholder={config.payment.webhookApiKeySet ? '••••••••  (đã lưu — để trống nếu giữ nguyên)' : ''}
            onChange={(e) => patch('payment.webhookApiKey', e.target.value)}
            autoComplete="new-password"
          />
        </AdminField>
      </div>

      <div className="admin-sys-detail-block" style={{ marginTop: 16 }}>
        <p className="admin-sys-detail-block__title">{t('admin.system.payment.webhookUrlTitle')}</p>
        <p className="admin-sys-field__hint" style={{ marginBottom: 8 }}>
          {t('admin.system.payment.webhookUrlHint')}
        </p>
        <code className="admin-sys-env-item__val" style={{ wordBreak: 'break-all' }}>
          {paymentWebhookUrl || `${API_BASE}/api/system/payments/sepay-webhook`}
        </code>
      </div>
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
            <div className="admin-sys-page__actions-secondary">
              <button type="button" className="admin-sys-btn admin-sys-btn--ghost" onClick={handleTestConnection}>
                {t('admin.system.testConnection')}
              </button>
              <button type="button" className="admin-sys-btn admin-sys-btn--ghost" onClick={handleReset}>
                {t('admin.system.resetDefault')}
              </button>
            </div>
            <button
              type="button"
              className="admin-sys-btn admin-sys-btn--primary"
              onClick={handleSave}
              disabled={!hasUnsaved || savingMaintenance || savingConfig}
            >
              {savingMaintenance || savingConfig ? t('admin.system.saving') : t('admin.system.saveConfig')}
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
            <div className="admin-sys-tabs" aria-label={t('admin.system.tabAria')}>
              <AdminFilterDropdown
                label=""
                value={activeTab}
                options={tabOptions}
                onChange={setActiveTab}
                menuOpen={openMenu === 'sysTab'}
                onMenuToggle={setOpenMenu}
                menuId="sysTab"
              />
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
                  {platformRows.map((row) => (
                    <tr key={row.label}>
                      <th>{row.label}</th>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-sys-side-block">
              <h2 className="admin-panel__title admin-panel__title--flush">{t('admin.system.env.title')}</h2>
              <p className="admin-sys-panel__lead">{t('admin.system.env.lead')}</p>
              <ul className="admin-sys-env-list">
                {envRows.map((env) => (
                  <li key={env.key} className="admin-sys-env-item">
                    <span className="admin-sys-env-item__key">{env.key}</span>
                    <span className="admin-sys-env-item__val">{env.value}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="admin-sys-side-block">
              <h2 className="admin-panel__title admin-panel__title--flush">{t('admin.system.changelog.title')}</h2>
              <p className="admin-sys-panel__lead">{t('admin.system.changelog.lead')}</p>
              {changeLog.length === 0 ? (
                <p className="admin-sys-panel__lead" style={{ fontStyle: 'italic' }}>
                  {t('admin.system.changelog.empty')}
                </p>
              ) : (
                <ul className="admin-sys-changelog">
                  {changeLog.map((entry) => (
                    <li key={entry.id} className={`admin-sys-changelog__item admin-sys-changelog__item--${entry.tone}`}>
                      <p className="admin-sys-changelog__time">{entry.time}</p>
                      <p className="admin-sys-changelog__actor">{entry.actor}</p>
                      <p className="admin-sys-changelog__action">{entry.action}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="admin-sys-danger">
              <p className="admin-sys-danger__title">{t('admin.system.danger.title')}</p>
              <p className="admin-sys-danger__desc">{t('admin.system.danger.maintDesc')}</p>
              <button
                type="button"
                className="admin-sys-btn admin-sys-btn--danger"
                disabled={savingMaintenance}
                onClick={() => persistMaintenanceMode(!config.maintenanceMode)}
              >
                {config.maintenanceMode
                  ? t('admin.system.danger.maintOff')
                  : t('admin.system.danger.maintOn')}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default AdminSystemControl;
