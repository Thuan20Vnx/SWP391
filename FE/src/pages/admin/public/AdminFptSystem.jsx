import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminFptDeptCard from '../../../components/admin/AdminFptDeptCard';
import AdminFptNotifBell from '../../../components/admin/AdminFptNotifBell';
import AdminFptUnitCard from '../../../components/admin/AdminFptUnitCard';
import AppSelect from '../../../components/ui/AppSelect';
import PublicAdminShell from '../../../layouts/PublicAdminShell';
import SiteFooter from '../../../components/SiteFooter';
import { API_BASE, getAuthHeaders } from '../../../utils/api';
import { fetchAdminAccounts, fetchAdminPartners } from '../../../services/adminApi';
import {
  CLUB_SAMPLE_DATA,
  mapApiClubToListItem,
} from '../../../data/clubDiscoveryData';
import {
  FPT_UNIT_TYPES,
  FPT_SORT_OPTIONS,
  buildDepartmentUnits,
  localizeDepartmentUnit,
  mapClubToFptUnit,
  mapPartnerToFptUnit,
  filterClubs,
  filterPartners,
  sortClubs,
  buildFptSummary,
} from '../../../data/adminFptSystemData';
import { getPartnerStatusLabel, partnerInitials } from '../../../utils/partnerDisplay';
import { useTranslation } from '../../../i18n/I18nContext';
import { mapSelectOptions, resolveLabel } from '../../../i18n/helpers';
import '../../../styles/admin-public-pages.css';

const PAGE_SIZE = 9;

const QUICK_LINKS = [
  { labelKey: 'admin.fpt.quick.dashboard', to: '/admin' },
  { labelKey: 'admin.fpt.quick.eventApprovals', to: '/admin/events' },
  { labelKey: 'admin.fpt.quick.partners', to: '/admin/partners' },
  { labelKey: 'admin.fpt.quick.announcements', to: '/admin/announcements' },
];

const AdminFptSystem = ({ showToast }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const clubsRef = useRef(null);
  const deptsRef = useRef(null);
  const partnersRef = useRef(null);

  const [clubs, setClubs] = useState([]);
  const [partners, setPartners] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [summary, setSummary] = useState({
    clb: 0,
    partner: 0,
    pendingPartners: 0,
    ctsv: 1,
    icpdp: 1,
    ctsvStaff: 0,
    icpdpStaff: 0,
    all: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name_asc');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const sortOptions = useMemo(() => mapSelectOptions(FPT_SORT_OPTIONS, t), [t]);
  const localizedDepartments = useMemo(
    () => departments.map((unit) => localizeDepartmentUnit(unit, t)),
    [departments, t],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clubsRes, ctsvRes, icpdpRes, partnersRes, pendingPartnersRes] = await Promise.all([
        fetch(`${API_BASE}/api/clubs`, { headers: getAuthHeaders(false) }).then((r) => r.json()),
        fetchAdminAccounts({ page: 1, limit: 1, role: 'ctsv', search: '' }).catch(() => ({ total: 0 })),
        fetchAdminAccounts({ page: 1, limit: 1, role: 'icpdp', search: '' }).catch(() => ({ total: 0 })),
        fetchAdminPartners('approved').catch(() => ({ partners: [] })),
        fetchAdminPartners('pending_admin').catch(() => ({ partners: [] })),
      ]);

      const clubList =
        clubsRes.success && clubsRes.clubs?.length
          ? clubsRes.clubs.map(mapApiClubToListItem)
          : CLUB_SAMPLE_DATA;

      const clubUnits = clubList.map((club) => mapClubToFptUnit(club, t));
      const partnerUnits = (partnersRes.partners || []).map((partner) =>
        mapPartnerToFptUnit(
          {
            ...partner,
            statusLabel: getPartnerStatusLabel(partner.status, t),
            logoText: partnerInitials(partner.name),
          },
          t,
        ),
      );
      const ctsvStaff = ctsvRes.total ?? ctsvRes.accounts?.length ?? 0;
      const icpdpStaff = icpdpRes.total ?? icpdpRes.accounts?.length ?? 0;
      const deptUnits = buildDepartmentUnits({ ctsvStaff, icpdpStaff });
      const pendingPartners = pendingPartnersRes.partners?.length ?? 0;

      setClubs(clubUnits);
      setPartners(partnerUnits);
      setDepartments(deptUnits);
      setSummary(
        buildFptSummary({
          clubs: clubUnits,
          partners: partnerUnits,
          pendingPartners,
          ctsvStaff,
          icpdpStaff,
        }),
      );
    } catch {
      const clubUnits = CLUB_SAMPLE_DATA.map((club) => mapClubToFptUnit(club, t));
      setClubs(clubUnits);
      setPartners([]);
      setDepartments(buildDepartmentUnits({ ctsvStaff: 0, icpdpStaff: 0 }));
      setSummary(buildFptSummary({ clubs: clubUnits, partners: [] }));
      showToast?.(t('admin.fpt.loadFail'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleDepartments = useMemo(() => {
    if (typeFilter === 'clb' || typeFilter === 'partner') return [];
    const source = localizedDepartments;
    if (typeFilter === 'ctsv') return source.filter((d) => d.type === 'ctsv');
    if (typeFilter === 'icpdp') return source.filter((d) => d.type === 'icpdp');
    return source;
  }, [localizedDepartments, typeFilter]);

  const filteredClubs = useMemo(() => {
    if (typeFilter === 'ctsv' || typeFilter === 'icpdp' || typeFilter === 'partner') return [];
    const filtered = filterClubs(clubs, searchQuery);
    return sortClubs(filtered, sortBy);
  }, [clubs, searchQuery, sortBy, typeFilter]);

  const filteredPartners = useMemo(() => {
    if (typeFilter === 'clb' || typeFilter === 'ctsv' || typeFilter === 'icpdp') return [];
    const filtered = filterPartners(partners, searchQuery);
    return sortClubs(filtered, sortBy);
  }, [partners, searchQuery, sortBy, typeFilter]);

  const visibleClubs = filteredClubs.slice(0, visibleCount);
  const visiblePartners = filteredPartners.slice(0, visibleCount);
  const hasMoreClubs = visibleCount < filteredClubs.length;
  const hasMorePartners = visibleCount < filteredPartners.length;

  const showClubSection = typeFilter === 'all' || typeFilter === 'clb';
  const showPartnerSection = typeFilter === 'all' || typeFilter === 'partner';
  const showDeptSection = typeFilter === 'all' || typeFilter === 'ctsv' || typeFilter === 'icpdp';
  const isEmpty =
    !loading &&
    visibleDepartments.length === 0 &&
    filteredClubs.length === 0 &&
    filteredPartners.length === 0;

  const handleHeroFilter = (typeId) => {
    setTypeFilter((prev) => (prev === typeId ? 'all' : typeId));
    setVisibleCount(PAGE_SIZE);
    window.setTimeout(() => {
      if (typeId === 'clb') clubsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (typeId === 'partner') partnersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else deptsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleReset = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setSortBy('name_asc');
    setVisibleCount(PAGE_SIZE);
  };

  const handleUnitDetail = (unit) => {
    if (unit.isDepartment && unit.type) {
      navigate(`/dept/${unit.type}`);
      return;
    }
    navigate(unit.detailLink || unit.link || '/');
  };

  const handleUnitApprove = (unit) => {
    navigate(unit.approveLink || unit.manageLink || '/admin/events');
  };

  const handleUnitManage = (unit) => {
    navigate(unit.manageLink || '/admin/events');
  };

  const partnersSubtitle = loading
    ? t('admin.fpt.section.partnersLoading')
    : `${t('admin.fpt.section.partnersCount', { count: filteredPartners.length })}${
        summary.pendingPartners > 0
          ? t('admin.fpt.section.partnersPendingAdmin', { count: summary.pendingPartners })
          : ''
      }${searchQuery ? t('admin.fpt.section.partnersSearchSuffix', { query: searchQuery }) : ''}`;

  const clubsSubtitle = loading
    ? t('admin.fpt.section.partnersLoading')
    : `${t('admin.fpt.section.clubsCount', { count: filteredClubs.length })}${
        searchQuery ? t('admin.fpt.section.clubsSearchSuffix', { query: searchQuery }) : ''
      }`;

  return (
    <PublicAdminShell
      activeNav="home"
      searchPlaceholder={t('admin.fpt.searchPlaceholder')}
      searchValue={searchQuery}
      onSearchChange={(value) => {
        setSearchQuery(value);
        setVisibleCount(PAGE_SIZE);
        if (value && !['all', 'clb', 'partner'].includes(typeFilter)) setTypeFilter('all');
      }}
    >
      <div className="admin-fpt-system home-layout">
        <main className="admin-fpt-system__main">
          <section className="admin-fpt-hero">
            <div className="admin-fpt-hero__inner">
              <div className="admin-fpt-hero__content">
                <span className="admin-fpt-hero__eyebrow">{t('admin.fpt.eyebrow')}</span>
                <h1>{t('admin.fpt.heroTitle')}</h1>
                <p>{t('admin.fpt.heroDesc')}</p>
                <div className="admin-fpt-hero__quick">
                  {QUICK_LINKS.map((link) => (
                    <button key={link.to} type="button" onClick={() => navigate(link.to)}>
                      {t(link.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-fpt-hero__stats" aria-label={t('admin.fpt.statsAria')}>
                <button
                  type="button"
                  className={`admin-fpt-hero__stat${typeFilter === 'clb' ? ' is-active' : ''}`}
                  onClick={() => handleHeroFilter('clb')}
                >
                  <strong>{loading ? '…' : summary.clb}</strong>
                  <span>{t('admin.fpt.stats.clubs')}</span>
                </button>
                <button
                  type="button"
                  className={`admin-fpt-hero__stat${typeFilter === 'ctsv' ? ' is-active' : ''}`}
                  onClick={() => handleHeroFilter('ctsv')}
                >
                  <strong>{loading ? '…' : summary.ctsvStaff}</strong>
                  <span>{t('admin.fpt.stats.ctsvStaff')}</span>
                </button>
                <button
                  type="button"
                  className={`admin-fpt-hero__stat${typeFilter === 'icpdp' ? ' is-active' : ''}`}
                  onClick={() => handleHeroFilter('icpdp')}
                >
                  <strong>{loading ? '…' : summary.icpdpStaff}</strong>
                  <span>{t('admin.fpt.stats.icpdpStaff')}</span>
                </button>
                <button
                  type="button"
                  className={`admin-fpt-hero__stat${typeFilter === 'partner' ? ' is-active' : ''}`}
                  onClick={() => handleHeroFilter('partner')}
                >
                  <strong>{loading ? '…' : summary.partner}</strong>
                  <span>
                    {t('admin.fpt.stats.partners')}
                    {summary.pendingPartners > 0
                      ? t('admin.fpt.stats.partnersPending', { count: summary.pendingPartners })
                      : ''}
                  </span>
                </button>
                <div className="admin-fpt-hero__stat admin-fpt-hero__stat--total">
                  <strong>{loading ? '…' : summary.all}</strong>
                  <span>{t('admin.fpt.stats.unitsTotal')}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="admin-fpt-toolbar" aria-label={t('admin.fpt.filterAria')}>
            <div className="admin-fpt-toolbar__filters" role="tablist" aria-label={t('admin.fpt.classifyAria')}>
              {FPT_UNIT_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  role="tab"
                  aria-selected={typeFilter === type.id}
                  className={`admin-fpt-toolbar__pill${typeFilter === type.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setTypeFilter(type.id);
                    setVisibleCount(PAGE_SIZE);
                  }}
                >
                  {resolveLabel(type, t)}
                </button>
              ))}
            </div>

            {(showClubSection || showPartnerSection) && (
              <div className="admin-fpt-toolbar__sort">
                <label htmlFor="admin-fpt-sort">{t('admin.fpt.sortLabel')}</label>
                <AppSelect
                  id="admin-fpt-sort"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  options={sortOptions}
                />
              </div>
            )}

            {(searchQuery || typeFilter !== 'all') && (
              <button type="button" className="admin-fpt-toolbar__reset" onClick={handleReset}>
                {t('admin.fpt.clearFilters')}
              </button>
            )}
          </section>

          {isEmpty ? (
            <div className="admin-fpt-list__empty">
              <p>{t('admin.fpt.emptyResults')}</p>
              <button type="button" className="admin-fpt-list__reset" onClick={handleReset}>
                {t('admin.fpt.viewAllSystem')}
              </button>
            </div>
          ) : (
            <>
              {showDeptSection && visibleDepartments.length > 0 && (
                <section className="admin-fpt-section" ref={deptsRef}>
                  <header className="admin-fpt-section__head">
                    <div>
                      <h2>{t('admin.fpt.section.coordUnits')}</h2>
                      <p>{t('admin.fpt.section.coordUnitsDesc')}</p>
                    </div>
                    <AdminFptNotifBell className="admin-fpt-section__notif" />
                  </header>
                  <div className="admin-fpt-section__depts">
                    {visibleDepartments.map((unit) => (
                      <AdminFptDeptCard
                        key={unit.id}
                        unit={unit}
                        onDetail={handleUnitDetail}
                        onManage={handleUnitManage}
                      />
                    ))}
                  </div>
                </section>
              )}

              {showPartnerSection && (
                <section className="admin-fpt-section" ref={partnersRef}>
                  <header className="admin-fpt-section__head">
                    <div>
                      <h2>{t('admin.fpt.section.partners')}</h2>
                      <p>{partnersSubtitle}</p>
                    </div>
                    {summary.pendingPartners > 0 && (
                      <button
                        type="button"
                        className="admin-fpt-section__cta"
                        onClick={() => navigate('/admin/partners/approvals')}
                      >
                        {t('admin.fpt.approvePartners', { count: summary.pendingPartners })}
                      </button>
                    )}
                    <AdminFptNotifBell className="admin-fpt-section__notif" />
                  </header>

                  {loading ? (
                    <div className="admin-fpt-list__empty">{t('admin.fpt.partnersLoadingList')}</div>
                  ) : filteredPartners.length === 0 ? (
                    <div className="admin-fpt-list__empty">
                      <p>{t('admin.fpt.partnersEmpty')}</p>
                      <button type="button" className="admin-fpt-list__reset" onClick={() => navigate('/admin/partners')}>
                        {t('admin.fpt.partnersManage')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="admin-fpt-list__grid">
                        {visiblePartners.map((unit) => (
                          <AdminFptUnitCard
                            key={unit.id}
                            unit={unit}
                            onDetail={handleUnitDetail}
                            onApprove={handleUnitApprove}
                          />
                        ))}
                      </div>
                      {hasMorePartners && (
                        <div className="admin-fpt-list__more">
                          <button type="button" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                            {t('admin.fpt.loadMorePartners', {
                              count: filteredPartners.length - visibleCount,
                            })}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}

              {showClubSection && (
                <section className="admin-fpt-section" ref={clubsRef}>
                  <header className="admin-fpt-section__head">
                    <div>
                      <h2>{t('admin.fpt.section.clubs')}</h2>
                      <p>{clubsSubtitle}</p>
                    </div>
                    <AdminFptNotifBell className="admin-fpt-section__notif" />
                  </header>

                  {loading ? (
                    <div className="admin-fpt-list__empty">{t('admin.fpt.clubsLoadingList')}</div>
                  ) : filteredClubs.length === 0 ? (
                    <div className="admin-fpt-list__empty">
                      <p>{t('admin.fpt.clubsEmpty')}</p>
                    </div>
                  ) : (
                    <>
                      <div className="admin-fpt-list__grid">
                        {visibleClubs.map((unit) => (
                          <AdminFptUnitCard
                            key={unit.id}
                            unit={unit}
                            onDetail={handleUnitDetail}
                            onApprove={handleUnitApprove}
                          />
                        ))}
                      </div>
                      {hasMoreClubs && (
                        <div className="admin-fpt-list__more">
                          <button type="button" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                            {t('admin.fpt.loadMoreClubs', {
                              count: filteredClubs.length - visibleCount,
                            })}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}
            </>
          )}
        </main>
        <SiteFooter />
      </div>
    </PublicAdminShell>
  );
};

export default AdminFptSystem;
