import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import AdminCoreDataDetailModal from '../../components/admin/AdminCoreDataDetailModal';
import AdminCategoryDeclareModal from '../../components/admin/AdminCategoryDeclareModal';
import AdminClubDeclareModal from '../../components/admin/AdminClubDeclareModal';
import AdminFacilityResourceModal from '../../components/admin/AdminFacilityResourceModal';
import {
  ADMIN_DATA_PAGE_SIZE,
  ADMIN_DATA_TABS,
  DEFAULT_CATEGORIES,
  DEFAULT_FACILITIES,
  DEFAULT_MASTER_CLUBS,
  FACILITY_STATUS,
  STORAGE_KEYS,
  formToFacility,
  getFacilityStatusLabel,
  loadStoredList,
  saveStoredList,
} from '../../data/adminDataMaintenanceData';
import { getUserRole, isAdminRole } from '../../utils/auth';
import { useTranslation } from '../../i18n/I18nContext';
import { resolveLabel } from '../../i18n/helpers';
import '../../styles/admin-dashboard.css';
import '../../styles/admin-accounts.css';
import '../../styles/admin-data-maintenance.css';

const IconPlus = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const IconDoor = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="admin-data-room-icon">
    <path
      d="M4 4h7v16H4V4ZM13 10h7v10h-7V10ZM13 7V4h4v3h-4Z"
      fill="currentColor"
    />
  </svg>
);

const IconEdit = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconTrash = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconView = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const paginate = (items, page, pageSize) => {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    slice: items.slice(start, start + pageSize),
    total,
    totalPages,
    page: safePage,
    pageStart: total === 0 ? 0 : start + 1,
    pageEnd: Math.min(start + pageSize, total),
  };
};

/** Tối đa 3 số trang, không dùng dấu … */
const getVisiblePages = (currentPage, totalPages) => {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 2) return [1, 2, 3];
  if (currentPage >= totalPages - 1) {
    return [totalPages - 2, totalPages - 1, totalPages];
  }
  return [currentPage - 1, currentPage, currentPage + 1];
};

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AdminDataMaintenance = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useOutletContext() || {};
  const role = getUserRole();
  const tabFromUrl = searchParams.get('tab');
  const initialTab = ADMIN_DATA_TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : 'facilities';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [page, setPage] = useState(1);
  const [facilities, setFacilities] = useState(() => loadStoredList(STORAGE_KEYS.facilities, DEFAULT_FACILITIES));
  const [categories, setCategories] = useState(() => loadStoredList(STORAGE_KEYS.categories, DEFAULT_CATEGORIES));
  const [clubs, setClubs] = useState(() => loadStoredList(STORAGE_KEYS.clubs, DEFAULT_MASTER_CLUBS));

  const [modalOpen, setModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdminRole(role)) {
      showToast?.(t('admin.common.noAccess'), 'error');
      navigate('/profile');
    }
  }, [role, navigate, showToast, t]);

  useEffect(() => {
    if (tabFromUrl && ADMIN_DATA_TABS.some((t) => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    setPage(1);
    setDetailItem(null);
  }, [activeTab]);

  const persist = useCallback((tab, list) => {
    if (tab === 'facilities') {
      setFacilities(list);
      saveStoredList(STORAGE_KEYS.facilities, list);
    } else if (tab === 'categories') {
      setCategories(list);
      saveStoredList(STORAGE_KEYS.categories, list);
    } else {
      setClubs(list);
      saveStoredList(STORAGE_KEYS.clubs, list);
    }
  }, []);

  const currentList = useMemo(() => {
    if (activeTab === 'facilities') return facilities;
    if (activeTab === 'categories') return categories;
    return clubs;
  }, [activeTab, facilities, categories, clubs]);

  const { slice, total, totalPages, page: safePage, pageStart, pageEnd } = useMemo(
    () => paginate(currentList, page, ADMIN_DATA_PAGE_SIZE),
    [currentList, page],
  );

  const visiblePages = useMemo(
    () => getVisiblePages(safePage, totalPages),
    [safePage, totalPages],
  );

  const addButtonLabel = useMemo(() => {
    if (activeTab === 'facilities') return t('admin.dataMaintenance.add.facilities');
    if (activeTab === 'categories') return t('admin.dataMaintenance.add.categories');
    return t('admin.dataMaintenance.add.clubs');
  }, [activeTab, t]);

  const openCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const openDetail = (item) => {
    setDetailItem(item);
  };

  const closeDetail = () => setDetailItem(null);

  const handleRowActivate = (row, event) => {
    if (event.target.closest('.admin-data-row-actions')) return;
    openDetail(row);
  };

  const handleRowKeyDown = (row, event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target.closest('.admin-data-row-actions')) return;
    event.preventDefault();
    openDetail(row);
  };

  const rowProps = (row, label) => ({
    className: 'admin-data-row--clickable',
    onClick: (e) => handleRowActivate(row, e),
    onKeyDown: (e) => handleRowKeyDown(row, e),
    tabIndex: 0,
    role: 'button',
    'aria-label': t('admin.dataMaintenance.rowAria', { label }),
  });

  const openEdit = (item) => {
    setDetailItem(null);
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    const label =
      activeTab === 'facilities' ? item.name : activeTab === 'categories' ? item.name : item.name;
    if (!window.confirm(t('admin.dataMaintenance.deleteConfirm', { label }))) return;
    const next = currentList.filter((row) => row.id !== item.id);
    persist(activeTab, next);
    showToast?.(t('admin.dataMaintenance.toast.deleted'), 'info');
  };

  const handleFacilitySubmit = (values) => {
    setSubmitting(true);
    const row = formToFacility(values, editingItem?.id);
    const next = editingItem
      ? facilities.map((f) => (f.id === editingItem.id ? row : f))
      : [row, ...facilities];
    persist('facilities', next);
    setSubmitting(false);
    setModalOpen(false);
    showToast?.(
      editingItem ? t('admin.dataMaintenance.toast.facilityUpdated') : t('admin.dataMaintenance.toast.facilityAdded'),
      'success',
    );
  };

  const handleCategorySubmit = (values) => {
    setSubmitting(true);
    const row = {
      id: editingItem?.id || `cat_${Date.now()}`,
      code: String(values.code || '').trim().toUpperCase(),
      name: values.name.trim(),
      description: (values.description || '').trim(),
      eventCount: editingItem?.eventCount ?? 0,
      active: values.active === true || values.active === 'true',
    };
    const next = editingItem
      ? categories.map((c) => (c.id === editingItem.id ? row : c))
      : [row, ...categories];
    persist('categories', next);
    setSubmitting(false);
    setModalOpen(false);
    showToast?.(
      editingItem ? t('admin.dataMaintenance.toast.categoryUpdated') : t('admin.dataMaintenance.toast.categoryAdded'),
      'success',
    );
  };

  const handleClubSubmit = (values) => {
    setSubmitting(true);
    const row = {
      id: editingItem?.id || `mclub_${Date.now()}`,
      code: String(values.code || '').trim().toUpperCase(),
      name: values.name.trim(),
      field: String(values.field || '').trim(),
      president: String(values.president || '').trim(),
      status: values.status,
    };
    const next = editingItem ? clubs.map((c) => (c.id === editingItem.id ? row : c)) : [row, ...clubs];
    persist('clubs', next);
    setSubmitting(false);
    setModalOpen(false);
    showToast?.(
      editingItem ? t('admin.dataMaintenance.toast.clubUpdated') : t('admin.dataMaintenance.toast.clubAdded'),
      'success',
    );
  };

  const renderFacilityRows = () =>
    slice.map((row) => {
      const statusMeta = FACILITY_STATUS[row.status] || FACILITY_STATUS.ready;
      return (
        <tr key={row.id} {...rowProps(row, row.name)}>
          <td>
            <div className="admin-data-room">
              <span className="admin-data-room__icon" aria-hidden="true">
                <IconDoor />
              </span>
              <span className="admin-data-room__name">{row.name}</span>
            </div>
          </td>
          <td>{t('admin.dataMaintenance.capacityPeople', { count: row.capacity.toLocaleString('vi-VN') })}</td>
          <td>{row.building}</td>
          <td>
            <span className={`admin-data-status admin-data-status--${statusMeta.tone}`}>
              <span className="admin-data-status__dot" aria-hidden="true" />
              {getFacilityStatusLabel(row.status, t)}
            </span>
          </td>
          <td>
            <div className="admin-data-row-actions" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="admin-data-icon-btn" title={t('admin.common.viewDetail')} onClick={() => openDetail(row)}>
                <IconView />
              </button>
              <button type="button" className="admin-data-icon-btn" title={t('admin.common.edit')} onClick={() => openEdit(row)}>
                <IconEdit />
              </button>
              <button type="button" className="admin-data-icon-btn admin-data-icon-btn--danger" title={t('admin.common.delete')} onClick={() => handleDelete(row)}>
                <IconTrash />
              </button>
            </div>
          </td>
        </tr>
      );
    });

  const renderCategoryRows = () =>
    slice.map((row) => (
      <tr key={row.id} {...rowProps(row, row.name)}>
        <td>
          <code className="admin-data-cat-code">{row.code || '—'}</code>
        </td>
        <td>
          <strong className="admin-data-row-title">{row.name}</strong>
        </td>
        <td>
          <div className="admin-data-cell-desc">{row.description || '—'}</div>
        </td>
        <td>
          <span className="admin-data-event-count">
            {t('admin.dataMaintenance.eventCount', { count: (row.eventCount ?? 0).toLocaleString('vi-VN') })}
          </span>
        </td>
        <td>
          <div className="admin-data-row-actions" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-data-icon-btn" title={t('admin.common.viewDetail')} onClick={() => openDetail(row)}>
              <IconView />
            </button>
            <button type="button" className="admin-data-icon-btn" title={t('admin.common.edit')} onClick={() => openEdit(row)}>
              <IconEdit />
            </button>
            <button type="button" className="admin-data-icon-btn admin-data-icon-btn--danger" title={t('admin.common.delete')} onClick={() => handleDelete(row)}>
              <IconTrash />
            </button>
          </div>
        </td>
      </tr>
    ));

  const renderClubRows = () =>
    slice.map((row) => (
      <tr key={row.id} {...rowProps(row, row.name)}>
        <td>
          <span className="admin-data-club-code">{row.code || '—'}</span>
        </td>
        <td>
          <span className="admin-data-club-name">{row.name}</span>
        </td>
        <td>
          <span className="admin-data-cell-muted">{row.field || '—'}</span>
        </td>
        <td>
          <span className="admin-data-cell-muted">{row.president || '—'}</span>
        </td>
        <td>
          <span className={`admin-data-status admin-data-status--${row.status === 'active' ? 'ready' : 'maintenance'}`}>
            <span className="admin-data-status__dot" aria-hidden="true" />
            {row.status === 'active'
              ? t('admin.dataMaintenance.clubStatus.active')
              : t('admin.dataMaintenance.clubStatus.inactive')}
          </span>
        </td>
        <td>
          <div className="admin-data-row-actions" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-data-icon-btn" title={t('admin.common.viewDetail')} onClick={() => openDetail(row)}>
              <IconView />
            </button>
            <button type="button" className="admin-data-icon-btn" title={t('admin.common.edit')} onClick={() => openEdit(row)}>
              <IconEdit />
            </button>
            <button type="button" className="admin-data-icon-btn admin-data-icon-btn--danger" title={t('admin.common.delete')} onClick={() => handleDelete(row)}>
              <IconTrash />
            </button>
          </div>
        </td>
      </tr>
    ));

  const tableHead = () => {
    if (activeTab === 'facilities') {
      return (
        <tr>
          <th>{t('admin.dataMaintenance.table.room')}</th>
          <th>{t('admin.dataMaintenance.table.capacity')}</th>
          <th>{t('admin.dataMaintenance.table.building')}</th>
          <th>{t('admin.dataMaintenance.table.status')}</th>
          <th className="admin-data-table__col-actions">{t('admin.common.actions')}</th>
        </tr>
      );
    }
    if (activeTab === 'categories') {
      return (
        <tr>
          <th>{t('admin.dataMaintenance.table.categoryCode')}</th>
          <th>{t('admin.dataMaintenance.table.categoryName')}</th>
          <th>{t('admin.dataMaintenance.table.description')}</th>
          <th>{t('admin.dataMaintenance.table.eventCount')}</th>
          <th className="admin-data-table__col-actions">{t('admin.common.actions')}</th>
        </tr>
      );
    }
    return (
      <tr>
        <th>{t('admin.dataMaintenance.table.clubCode')}</th>
        <th>{t('admin.dataMaintenance.table.clubName')}</th>
        <th>{t('admin.dataMaintenance.table.clubField')}</th>
        <th>{t('admin.dataMaintenance.table.president')}</th>
        <th>{t('admin.dataMaintenance.table.status')}</th>
        <th className="admin-data-table__col-actions">{t('admin.common.actions')}</th>
      </tr>
    );
  };

  const colSpan = activeTab === 'clubs' ? 6 : 5;

  const TABLE_COL_WIDTHS = {
    facilities: ['34%', '14%', '16%', '18%', '18%'],
    categories: ['13%', '22%', '30%', '15%', '20%'],
    clubs: ['12%', '20%', '22%', '20%', '14%', '12%'],
  };

  const tableColGroup = () => (
    <colgroup>
      {(TABLE_COL_WIDTHS[activeTab] ?? TABLE_COL_WIDTHS.facilities).map((width, index) => (
        <col key={index} style={{ width }} />
      ))}
    </colgroup>
  );

  if (!isAdminRole(role)) return null;

  return (
    <main className="admin-main">
      <div className="admin-data-page">
        <header className="admin-data-page__header">
          <div className="admin-data-page__intro">
            <h1 className="admin-data-page__title">{t('admin.dataMaintenance.title')}</h1>
            <p className="admin-data-page__subtitle">{t('admin.dataMaintenance.subtitle')}</p>
          </div>
          <button type="button" className="admin-data-btn-add" onClick={openCreate}>
            <IconPlus />
            {addButtonLabel}
          </button>
        </header>

        <nav className="admin-data-tabs" role="tablist" aria-label={t('admin.dataMaintenance.tabNavAria')}>
          {ADMIN_DATA_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`admin-data-tab${activeTab === tab.id ? ' admin-data-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {resolveLabel(tab, t)}
            </button>
          ))}
        </nav>

        <section className="admin-data-card">
          <div className="admin-data-table-wrap">
            <table className={`admin-data-table admin-data-table--${activeTab}`}>
              {tableColGroup()}
              <thead>{tableHead()}</thead>
              <tbody>
                {slice.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="admin-data-table__empty">
                      {t('admin.dataMaintenance.empty')}
                    </td>
                  </tr>
                ) : (
                  <>
                    {activeTab === 'facilities' && renderFacilityRows()}
                    {activeTab === 'categories' && renderCategoryRows()}
                    {activeTab === 'clubs' && renderClubRows()}
                  </>
                )}
              </tbody>
            </table>
          </div>

          <footer className="admin-data-pagination">
            <p className="admin-data-pagination__info">
              {total === 0
                ? t('admin.dataMaintenance.pagination.none')
                : t('admin.dataMaintenance.pagination.range', {
                    start: pageStart,
                    end: pageEnd,
                    total,
                  })}
            </p>
            <nav className="admin-data-pagination__nav" aria-label={t('admin.common.pagination')}>
              <button
                type="button"
                className="admin-data-page-arrow"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label={t('admin.common.prevPage')}
              >
                <IconChevronLeft />
              </button>
              <div className="admin-data-page-numbers">
                {visiblePages.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`admin-data-page-num${safePage === n ? ' admin-data-page-num--active' : ''}`}
                    onClick={() => setPage(n)}
                    aria-current={safePage === n ? 'page' : undefined}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="admin-data-page-arrow"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label={t('admin.common.nextPage')}
              >
                <IconChevronRight />
              </button>
            </nav>
          </footer>
        </section>
      </div>

      <AdminCoreDataDetailModal
        open={!!detailItem}
        activeTab={activeTab}
        item={detailItem}
        onClose={closeDetail}
        onEdit={openEdit}
      />

      {activeTab === 'facilities' && (
        <AdminFacilityResourceModal
          open={modalOpen}
          editingItem={editingItem}
          onClose={() => !submitting && setModalOpen(false)}
          onSubmit={handleFacilitySubmit}
          submitting={submitting}
        />
      )}
      {activeTab === 'clubs' && (
        <AdminClubDeclareModal
          open={modalOpen}
          editingItem={editingItem}
          onClose={() => !submitting && setModalOpen(false)}
          onSubmit={handleClubSubmit}
          submitting={submitting}
        />
      )}
      {activeTab === 'categories' && (
        <AdminCategoryDeclareModal
          open={modalOpen}
          editingItem={editingItem}
          onClose={() => !submitting && setModalOpen(false)}
          onSubmit={handleCategorySubmit}
          submitting={submitting}
        />
      )}
    </main>
  );
};

export default AdminDataMaintenance;
