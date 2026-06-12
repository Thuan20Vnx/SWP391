import React, { useEffect, useMemo, useState } from 'react';
import AdminFilterDropdown from './AdminFilterDropdown';
import { useTranslation } from '../../i18n/I18nContext';

const TONE_META_KEYS = {
  primary: { labelKey: 'admin.monitor.activityModal.type.primary', badgeClass: 'admin-log-badge--primary' },
  danger: { labelKey: 'admin.monitor.activityModal.type.danger', badgeClass: 'admin-log-badge--danger' },
  default: { labelKey: 'admin.monitor.activityModal.type.default', badgeClass: 'admin-log-badge--default' },
};

const TYPE_FILTER_KEYS = [
  { key: 'all', labelKey: 'admin.monitor.activityModal.type.all' },
  { key: 'primary', labelKey: 'admin.monitor.activityModal.type.primary' },
  { key: 'danger', labelKey: 'admin.monitor.activityModal.type.danger' },
  { key: 'default', labelKey: 'admin.monitor.activityModal.type.default' },
];

const getLogDate = (log) => log.dateKey || '';

const AdminActivityLogModal = ({ open, onClose, logs = [] }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [openMenu, setOpenMenu] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const toneMeta = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(TONE_META_KEYS).map(([key, meta]) => [
          key,
          { label: t(meta.labelKey), badgeClass: meta.badgeClass },
        ]),
      ),
    [t],
  );

  const typeFilters = useMemo(
    () => TYPE_FILTER_KEYS.map((item) => ({ ...item, label: t(item.labelKey) })),
    [t],
  );

  const dateOptions = useMemo(() => {
    const dates = [...new Set(logs.map((log) => getLogDate(log)).filter(Boolean))];
    return dates.sort((a, b) => b.localeCompare(a));
  }, [logs]);

  const actorOptions = useMemo(() => {
    return [...new Set(logs.map((log) => log.actor))].sort();
  }, [logs]);

  const dateSelectOptions = useMemo(
    () => [
      { value: 'all', label: t('admin.monitor.activityModal.allDates') },
      ...dateOptions.map((date) => ({ value: date, label: date })),
    ],
    [dateOptions, t],
  );

  const getActorIcon = (actor) => {
    if (actor === 'SYSTEM_ALERT') return '⚠';
    if (actor.startsWith('CTSV')) return '👤';
    if (actor.startsWith('CLB_')) return '🏛';
    if (actor.includes('Admin')) return '⚙';
    return '●';
  };

  const actorSelectOptions = useMemo(
    () => [
      { value: 'all', label: t('admin.monitor.activityModal.allActors'), icon: '👥' },
      ...actorOptions.map((actor) => ({
        value: actor,
        label: actor,
        icon: getActorIcon(actor),
      })),
    ],
    [actorOptions, t],
  );

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (typeFilter !== 'all' && log.tone !== typeFilter) return false;
      if (dateFilter !== 'all' && getLogDate(log) !== dateFilter) return false;
      if (actorFilter !== 'all' && log.actor !== actorFilter) return false;
      if (!q) return true;
      const haystack = [
        log.time,
        log.actor,
        log.message,
        toneMeta[log.tone]?.label || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [logs, search, typeFilter, dateFilter, actorFilter, toneMeta]);

  const hasActiveFilters =
    search.trim() !== '' || typeFilter !== 'all' || dateFilter !== 'all' || actorFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setDateFilter('all');
    setActorFilter('all');
    setOpenMenu(null);
  };

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setTypeFilter('all');
      setDateFilter('all');
      setActorFilter('all');
      setOpenMenu(null);
      setFiltersOpen(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="admin-log-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="admin-log-modal"
        role="dialog"
        aria-labelledby="admin-log-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-log-modal__header">
          <div>
            <h2 id="admin-log-modal-title">{t('admin.monitor.activityModal.title')}</h2>
            <p>
              {t('admin.monitor.activityModal.records', {
                filtered: filteredLogs.length,
                total: logs.length,
              })}
            </p>
          </div>
          <button type="button" className="admin-log-modal__close" onClick={onClose} aria-label={t('admin.common.close')}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="admin-log-modal__body">
          <div className="admin-log-modal__toolbar">
            <button
              type="button"
              className={`admin-log-modal__filters-toggle${filtersOpen ? ' admin-log-modal__filters-toggle--open' : ''}`}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  d="M4 6h16M7 12h10M10 18h4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              {filtersOpen
                ? t('admin.monitor.activityModal.hideFilters')
                : t('admin.monitor.activityModal.showFilters')}
              {hasActiveFilters ? (
                <span className="admin-log-modal__filters-badge">
                  {t('admin.monitor.activityModal.filtering')}
                </span>
              ) : null}
            </button>
            {hasActiveFilters && (
              <button type="button" className="admin-log-filter-reset" onClick={resetFilters}>
                {t('admin.monitor.activityModal.clearFilters')}
              </button>
            )}
          </div>

          {filtersOpen && (
            <div className="admin-log-modal__filters">
              <div className="admin-log-filters-card">
                <div className="admin-log-filters-card__row admin-log-filters-card__row--search">
                  <div className="admin-log-search">
                    <span className="admin-log-search__icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18">
                        <path
                          d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                    <input
                      type="search"
                      className="admin-log-search__input"
                      placeholder={t('admin.monitor.activityModal.searchPlaceholder')}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="admin-log-filter-advanced">
                    <AdminFilterDropdown
                      label={t('admin.monitor.activityModal.filterDate')}
                      menuId="date"
                      value={dateFilter}
                      options={dateSelectOptions}
                      onChange={setDateFilter}
                      menuOpen={openMenu === 'date'}
                      onMenuToggle={setOpenMenu}
                    />
                    <AdminFilterDropdown
                      label={t('admin.monitor.activityModal.filterActor')}
                      menuId="actor"
                      value={actorFilter}
                      options={actorSelectOptions}
                      onChange={setActorFilter}
                      menuOpen={openMenu === 'actor'}
                      onMenuToggle={setOpenMenu}
                    />
                  </div>
                </div>

                <div className="admin-log-filter-group">
                  <span className="admin-log-filter-label">
                    {t('admin.monitor.activityModal.activityType')}
                  </span>
                  <div
                    className="admin-log-filter-tabs"
                    role="tablist"
                    aria-label={t('admin.monitor.activityModal.filterTypeAria')}
                  >
                    {typeFilters.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        role="tab"
                        aria-selected={typeFilter === item.key}
                        className={`admin-log-filter-tab${typeFilter === item.key ? ' admin-log-filter-tab--active' : ''}`}
                        onClick={() => setTypeFilter(item.key)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="admin-log-modal__table-wrap">
            {filteredLogs.length === 0 ? (
              <div className="admin-log-empty">
                <p>{t('admin.monitor.activityModal.empty')}</p>
                <button type="button" className="admin-log-filter-reset" onClick={resetFilters}>
                  {t('admin.monitor.activityModal.clearFilters')}
                </button>
              </div>
            ) : (
              <table className="admin-log-table">
                <thead>
                  <tr>
                    <th>{t('admin.monitor.activityModal.col.time')}</th>
                    <th>{t('admin.monitor.activityModal.col.actor')}</th>
                    <th>{t('admin.monitor.activityModal.col.content')}</th>
                    <th>{t('admin.monitor.activityModal.col.type')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const meta = toneMeta[log.tone] || toneMeta.default;
                    return (
                      <tr key={log.id} className={`admin-log-table__row--${log.tone}`}>
                        <td data-label={t('admin.monitor.activityModal.col.time')}>{log.time}</td>
                        <td data-label={t('admin.monitor.activityModal.col.actor')}>
                          <strong>{log.actor}</strong>
                        </td>
                        <td data-label={t('admin.monitor.activityModal.col.content')}>{log.message}</td>
                        <td data-label={t('admin.monitor.activityModal.col.type')}>
                          <span className={`admin-log-badge ${meta.badgeClass}`}>{meta.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <footer className="admin-log-modal__footer">
          <p className="admin-log-modal__footer-hint">
            {filteredLogs.length > 0 ? t('admin.monitor.activityModal.scrollHint') : null}
          </p>
          <button type="button" className="admin-log-modal__btn-close" onClick={onClose}>
            {t('admin.common.close')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AdminActivityLogModal;
