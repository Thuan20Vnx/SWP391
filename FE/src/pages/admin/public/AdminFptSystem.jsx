import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminFptDeptCard from '../../../components/admin/AdminFptDeptCard';
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
  mapClubToFptUnit,
  mapPartnerToFptUnit,
  filterClubs,
  filterPartners,
  sortClubs,
  buildFptSummary,
} from '../../../data/adminFptSystemData';
import { PARTNER_STATUS_LABEL, partnerInitials } from '../../../utils/partnerDisplay';
import '../../../styles/admin-public-pages.css';

const PAGE_SIZE = 9;

const QUICK_LINKS = [
  { label: 'Bảng điều khiển', to: '/admin' },
  { label: 'Duyệt đề xuất sự kiện', to: '/admin/events' },
  { label: 'Quản lý đối tác', to: '/admin/partners' },
  { label: 'Phát hành tin tức', to: '/admin/announcements' },
];

const AdminFptSystem = ({ showToast }) => {
  const navigate = useNavigate();
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

      const clubUnits = clubList.map(mapClubToFptUnit);
      const partnerUnits = (partnersRes.partners || []).map((partner) =>
        mapPartnerToFptUnit({
          ...partner,
          statusLabel: PARTNER_STATUS_LABEL[partner.status] || partner.status,
          logoText: partnerInitials(partner.name),
        }),
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
      const clubUnits = CLUB_SAMPLE_DATA.map(mapClubToFptUnit);
      setClubs(clubUnits);
      setPartners([]);
      setDepartments(buildDepartmentUnits({ ctsvStaff: 0, icpdpStaff: 0 }));
      setSummary(buildFptSummary({ clubs: clubUnits, partners: [] }));
      showToast?.('Không thể tải đầy đủ dữ liệu hệ thống', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleDepartments = useMemo(() => {
    if (typeFilter === 'clb' || typeFilter === 'partner') return [];
    if (typeFilter === 'ctsv') return departments.filter((d) => d.type === 'ctsv');
    if (typeFilter === 'icpdp') return departments.filter((d) => d.type === 'icpdp');
    return departments;
  }, [departments, typeFilter]);

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
    navigate(unit.detailLink || unit.link || '/');
  };

  const handleUnitManage = (unit) => {
    navigate(unit.manageLink || '/admin/data');
  };

  const handleNotify = () => {
    navigate('/admin/announcements');
  };

  return (
    <PublicAdminShell
      activeNav="home"
      searchPlaceholder="Tìm CLB, đối tác theo tên, lĩnh vực..."
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
                <span className="admin-fpt-hero__eyebrow">Hệ thống FPT</span>
                <h1>Quản lý hệ sinh thái F-Events</h1>
                <p>
                  Đơn vị điều phối (CTSV &amp; IC-PDP), câu lạc bộ và đối tác doanh nghiệp trên campus —
                  tra cứu, quản trị và gửi thông báo tập trung.
                </p>
                <div className="admin-fpt-hero__quick">
                  {QUICK_LINKS.map((link) => (
                    <button key={link.to} type="button" onClick={() => navigate(link.to)}>
                      {link.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="admin-fpt-hero__stats" aria-label="Thống kê hệ thống">
                <button
                  type="button"
                  className={`admin-fpt-hero__stat${typeFilter === 'clb' ? ' is-active' : ''}`}
                  onClick={() => handleHeroFilter('clb')}
                >
                  <strong>{loading ? '…' : summary.clb}</strong>
                  <span>Câu lạc bộ</span>
                </button>
                <button
                  type="button"
                  className={`admin-fpt-hero__stat${typeFilter === 'ctsv' ? ' is-active' : ''}`}
                  onClick={() => handleHeroFilter('ctsv')}
                >
                  <strong>{loading ? '…' : summary.ctsvStaff}</strong>
                  <span>Cán bộ CTSV</span>
                </button>
                <button
                  type="button"
                  className={`admin-fpt-hero__stat${typeFilter === 'icpdp' ? ' is-active' : ''}`}
                  onClick={() => handleHeroFilter('icpdp')}
                >
                  <strong>{loading ? '…' : summary.icpdpStaff}</strong>
                  <span>Cán bộ IC-PDP</span>
                </button>
                <button
                  type="button"
                  className={`admin-fpt-hero__stat${typeFilter === 'partner' ? ' is-active' : ''}`}
                  onClick={() => handleHeroFilter('partner')}
                >
                  <strong>{loading ? '…' : summary.partner}</strong>
                  <span>
                    Đối tác{summary.pendingPartners > 0 ? ` · ${summary.pendingPartners} chờ duyệt` : ''}
                  </span>
                </button>
                <div className="admin-fpt-hero__stat admin-fpt-hero__stat--total">
                  <strong>{loading ? '…' : summary.all}</strong>
                  <span>Đơn vị trong hệ thống</span>
                </div>
              </div>
            </div>
          </section>

          <section className="admin-fpt-toolbar" aria-label="Lọc và sắp xếp">
            <div className="admin-fpt-toolbar__filters" role="tablist" aria-label="Phân loại">
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
                  {type.label}
                </button>
              ))}
            </div>

            {(showClubSection || showPartnerSection) && (
              <div className="admin-fpt-toolbar__sort">
                <label htmlFor="admin-fpt-sort">Sắp xếp danh sách</label>
                <AppSelect
                  id="admin-fpt-sort"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setVisibleCount(PAGE_SIZE);
                  }}
                  options={FPT_SORT_OPTIONS}
                />
              </div>
            )}

            {(searchQuery || typeFilter !== 'all') && (
              <button type="button" className="admin-fpt-toolbar__reset" onClick={handleReset}>
                Xóa bộ lọc
              </button>
            )}
          </section>

          {isEmpty ? (
            <div className="admin-fpt-list__empty">
              <p>Không tìm thấy kết quả phù hợp.</p>
              <button type="button" className="admin-fpt-list__reset" onClick={handleReset}>
                Xem toàn bộ hệ thống
              </button>
            </div>
          ) : (
            <>
              {showDeptSection && visibleDepartments.length > 0 && (
                <section className="admin-fpt-section" ref={deptsRef}>
                  <header className="admin-fpt-section__head">
                    <div>
                      <h2>Đơn vị điều phối</h2>
                      <p>CTSV và IC-PDP — quản lý cấp trường trên nền tảng F-Events</p>
                    </div>
                  </header>
                  <div className="admin-fpt-section__depts">
                    {visibleDepartments.map((unit) => (
                      <AdminFptDeptCard
                        key={unit.id}
                        unit={unit}
                        onDetail={handleUnitDetail}
                        onManage={handleUnitManage}
                        onNotify={handleNotify}
                      />
                    ))}
                  </div>
                </section>
              )}

              {showPartnerSection && (
                <section className="admin-fpt-section" ref={partnersRef}>
                  <header className="admin-fpt-section__head">
                    <div>
                      <h2>Đối tác doanh nghiệp</h2>
                      <p>
                        {loading
                          ? 'Đang tải...'
                          : `${filteredPartners.length} đối tác đã duyệt${
                              summary.pendingPartners > 0
                                ? ` · ${summary.pendingPartners} đơn chờ Admin`
                                : ''
                            }${searchQuery ? ` · "${searchQuery}"` : ''}`}
                      </p>
                    </div>
                    {summary.pendingPartners > 0 && (
                      <button
                        type="button"
                        className="admin-fpt-section__cta"
                        onClick={() => navigate('/admin/partners/approvals')}
                      >
                        Phê duyệt ({summary.pendingPartners})
                      </button>
                    )}
                  </header>

                  {loading ? (
                    <div className="admin-fpt-list__empty">Đang tải danh sách đối tác...</div>
                  ) : filteredPartners.length === 0 ? (
                    <div className="admin-fpt-list__empty">
                      <p>Chưa có đối tác phù hợp với bộ lọc hiện tại.</p>
                      <button type="button" className="admin-fpt-list__reset" onClick={() => navigate('/admin/partners')}>
                        Thêm / quản lý đối tác
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
                            onManage={handleUnitManage}
                            onNotify={handleNotify}
                          />
                        ))}
                      </div>
                      {hasMorePartners && (
                        <div className="admin-fpt-list__more">
                          <button type="button" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                            Xem thêm ({filteredPartners.length - visibleCount} đối tác)
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
                      <h2>Câu lạc bộ</h2>
                      <p>
                        {loading
                          ? 'Đang tải...'
                          : `${filteredClubs.length} CLB${searchQuery ? ` · "${searchQuery}"` : ''}`}
                      </p>
                    </div>
                  </header>

                  {loading ? (
                    <div className="admin-fpt-list__empty">Đang tải danh sách CLB...</div>
                  ) : filteredClubs.length === 0 ? (
                    <div className="admin-fpt-list__empty">
                      <p>Không có CLB phù hợp với bộ lọc hiện tại.</p>
                    </div>
                  ) : (
                    <>
                      <div className="admin-fpt-list__grid">
                        {visibleClubs.map((unit) => (
                          <AdminFptUnitCard
                            key={unit.id}
                            unit={unit}
                            onDetail={handleUnitDetail}
                            onManage={handleUnitManage}
                            onNotify={handleNotify}
                          />
                        ))}
                      </div>
                      {hasMoreClubs && (
                        <div className="admin-fpt-list__more">
                          <button type="button" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                            Xem thêm ({filteredClubs.length - visibleCount} CLB)
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
