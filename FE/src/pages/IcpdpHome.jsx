import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AppSelect from '../components/ui/AppSelect';
import { fetchIcpdpEvents, fetchIcpdpStats } from '../services/icpdpApi';
import { isEventLiveOrOngoing } from '../utils/ctsvEventAccess';
import EventDiscoveryCard from '../components/EventDiscoveryCard';
import { getCategoryDisplayLabel } from '../constants/eventCategories';
import HomeHeroSlider from '../components/home/HomeHeroSlider';
import { mapEventsToHeroSlides } from '../utils/heroSlides';

const cardStateFromEv = (ev) => {
  const s = ev.statusKey || ev.status || '';
  if (s === 'ended') return 'expired';
  if (s === 'postponed') return 'postponed';
  return 'active';
};

const toDiscoveryCard = (ev) => ({
  id: String(ev._id || ev.id || ''),
  title: ev.title,
  thumbnail: ev.image || ev.thumbnail || ev.flyer || '',
  category: ev.category || 'Sự kiện',
  categoryLabel: getCategoryDisplayLabel(ev.category) || ev.category,
  dateLabel: ev.date || ev.dateLabel || '',
  location: ev.location || '',
  filledSlots: ev.registeredCount ?? 0,
  totalSlots: ev.totalTickets || ev.capacity || 0,
  cardState: cardStateFromEv(ev),
  primaryLabel: 'Xem chi tiết',
  priceLabel: ev.ticketPrice > 0 ? `${Number(ev.ticketPrice).toLocaleString('vi-VN')}đ` : 'MIỄN PHÍ',
  organizerLabel: ev.source === 'school' ? 'Trường' : ev.source === 'partner' ? 'Đối tác' : ev.source === 'icpdp' ? 'IC-PDP' : 'CLB',
});

const HOME_TIME_FILTERS = [
  { value: 'Tất cả', label: 'Tất cả thời gian' },
  { value: 'Hôm nay', label: 'Hôm nay' },
  { value: 'Tuần này', label: 'Tuần này' }
];

const HOME_CATEGORY_FILTERS = [
  { value: 'Tất cả', label: 'Tất cả chủ đề' },
  { value: 'Âm nhạc', label: 'Âm nhạc' },
  { value: 'Workshop', label: 'Workshop' },
  { value: 'Công nghệ', label: 'Công nghệ' },
  { value: 'Kết nối', label: 'Kết nối' }
];

const PAGE_SIZE = 6;

const SectionPager = ({ page, total, onChange }) => {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  return (
    <div className="ctsv-section-pager">
      <button type="button" className="ctsv-pager-btn" disabled={page === 1} onClick={() => onChange(page - 1)}>
        Trước
      </button>
      <span className="ctsv-pager-label">Trang {page} / {totalPages}</span>
      <button type="button" className="ctsv-pager-btn" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        Sau
      </button>
    </div>
  );
};


const IcpdpHome = ({ showToast }) => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const searchQuery = outlet.headerSearch ?? '';
  const [timeFilter, setTimeFilter] = useState('Tất cả');
  const [categoryFilter, setCategoryFilter] = useState('Tất cả');

  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [stats, setStats] = useState([]);
  const [livePage, setLivePage] = useState(1);
  const [clubPage, setClubPage] = useState(1);

  useEffect(() => {
    fetchIcpdpStats()
      .then((d) => setStats(d.stats || []))
      .catch(() => setStats([]));

    fetchIcpdpEvents()
      .then((d) => {
        const list = d.events || [];
        setEvents(list);
        setFilteredEvents(list);
      })
      .catch(() => {
        setEvents([]);
        setFilteredEvents([]);
        showToast?.('Không tải được sự kiện — kiểm tra backend và đăng nhập lại.', 'error');
      });
  }, []);

  const handleFilterSubmit = useCallback(() => {
    fetchIcpdpEvents({
      q: searchQuery,
      category: categoryFilter,
      time: timeFilter
    })
      .then((d) => {
        const list = d.events || [];
        setFilteredEvents(list);
        setEvents(list);
        setLivePage(1);
        setClubPage(1);
        showToast(`Đã lọc ${list.length} sự kiện.`, 'success');
      })
      .catch(() => {
        let result = [...events];
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          result = result.filter(
            (ev) =>
              ev.title.toLowerCase().includes(q) ||
              ev.location.toLowerCase().includes(q) ||
              ev.category.toLowerCase().includes(q)
          );
        }
        if (categoryFilter !== 'Tất cả') {
          result = result.filter((ev) => ev.category === categoryFilter);
        }
        setFilteredEvents(result);
        showToast(`Đã lọc ${result.length} sự kiện (offline).`, 'info');
      });
  }, [searchQuery, categoryFilter, timeFilter, events, showToast]);

  useEffect(() => {
    outlet.registerHeaderSearchSubmit?.(handleFilterSubmit);
    return () => outlet.registerHeaderSearchSubmit?.(null);
  }, [outlet, handleFilterSubmit]);

  const allLiveEvents = useMemo(() => events.filter(isEventLiveOrOngoing), [events]);
  const heroSlides = useMemo(() => {
    return mapEventsToHeroSlides(events, {
      categoryLabel: (event) => getCategoryDisplayLabel(event.category) || event.category,
      organizerLabel: (event) => event.organizerLabel || '',
      dateLabel: (event) => event.date,
      location: (event) => event.location,
    });
  }, [events]);
  const liveOverviewEvents = useMemo(
    () => allLiveEvents.slice((livePage - 1) * PAGE_SIZE, livePage * PAGE_SIZE),
    [allLiveEvents, livePage]
  );

  const allClubEvents = useMemo(
    () => filteredEvents.filter((ev) => ev.source === 'club'),
    [filteredEvents]
  );
  const clubEvents = useMemo(
    () => allClubEvents.slice((clubPage - 1) * PAGE_SIZE, clubPage * PAGE_SIZE),
    [allClubEvents, clubPage]
  );

  const handleOpenEvent = (ev) => {
    navigate(`/icpdp/events/${ev.id}`);
  };

  const sectionLink = (path, label) => (
    <a
      href={path}
      className="see-all-link"
      onClick={(e) => {
        e.preventDefault();
        navigate(path);
      }}
    >
      <span>{label}</span>
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" fill="currentColor" />
      </svg>
    </a>
  );

  return (
    <>
      <HomeHeroSlider
        slides={heroSlides}
        resolveDetailPath={(slide) => (slide.eventId ? `/icpdp/events/${slide.eventId}` : null)}
        fallbackCtaPath="/icpdp/dashboard"
        fallbackCtaMain="Vào bảng điều khiển"
        fallbackCtaSub="Giám sát sự kiện toàn hệ thống"
      />

      <section className="ctsv-stats-section">
        <div className="ctsv-stats-grid">
          {stats.map((item) => (
            <article key={item.label} className="ctsv-stat-card">
              <p className="ctsv-stat-label">{item.label}</p>
              <div className="ctsv-stat-value-row">
                <span className="ctsv-stat-value">{item.value}</span>
                <span className="ctsv-stat-trend">{item.trend}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="filter-bar-section">
        <div className="filter-bar-card">
          <div className="filter-group">
            <div className="filter-control">
              <label htmlFor="icpdp-time-select" className="filter-label">
                Thời gian
              </label>
              <AppSelect
                id="icpdp-time-select"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                variant="filter"
                options={HOME_TIME_FILTERS}
              />
            </div>
          </div>
          <div className="filter-divider-line" />
          <div className="filter-group">
            <div className="filter-control">
              <label htmlFor="icpdp-category-select" className="filter-label">
                Chủ đề
              </label>
              <AppSelect
                id="icpdp-category-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                variant="filter"
                options={HOME_CATEGORY_FILTERS}
              />
            </div>
          </div>
          <button type="button" className="filter-submit-btn" onClick={handleFilterSubmit}>
            Lọc kết quả
          </button>
        </div>
      </section>

      <main className="recommended-section ctsv-home-live-section">
        <div className="recommended-header-row">
          <div className="recommended-title-container">
            <h2>Sự kiện đang diễn ra</h2>
            <p className="ctsv-home-section-desc">
              Tổng quan sự kiện đang mở đăng ký hoặc đang diễn ra trên toàn hệ thống.
            </p>
          </div>
          {sectionLink('/icpdp/events', 'Xem tất cả')}
        </div>

        {liveOverviewEvents.length === 0 ? (
          <div className="ctsv-home-section-empty">
            <p>Hiện không có sự kiện nào đang diễn ra hoặc mở đăng ký.</p>
          </div>
        ) : (
          <>
            <div className="event-grid-cards">
              {liveOverviewEvents.map((ev) => (
                <EventDiscoveryCard
                  key={`live-${ev.id}`}
                  event={toDiscoveryCard(ev)}
                  viewOnly
                  onPrimaryAction={() => handleOpenEvent(ev)}
                />
              ))}
            </div>
            <SectionPager page={livePage} total={allLiveEvents.length} onChange={setLivePage} />
          </>
        )}
      </main>

      <main className="recommended-section ctsv-home-managed-section">
        <div className="recommended-header-row">
          <div className="recommended-title-container">
            <h2>Sự kiện CLB</h2>
            <p className="ctsv-home-section-desc">
              Sự kiện do các Câu lạc bộ tổ chức — IC-PDP giám sát và duyệt đề xuất.
            </p>
          </div>
          {sectionLink('/icpdp/proposals', 'Duyệt đề xuất CLB')}
        </div>

        {clubEvents.length === 0 ? (
          <div className="ctsv-home-section-empty">
            <p>Chưa có sự kiện CLB nào phù hợp bộ lọc.</p>
            <button
              type="button"
              className="filter-submit-btn"
              onClick={() => navigate('/icpdp/proposals')}
            >
              Xem đề xuất CLB
            </button>
          </div>
        ) : (
          <>
            <div className="event-grid-cards">
              {clubEvents.map((ev) => (
                <EventDiscoveryCard
                  key={ev.id}
                  event={toDiscoveryCard(ev)}
                  viewOnly
                  onPrimaryAction={() => handleOpenEvent(ev)}
                />
              ))}
            </div>
            <SectionPager page={clubPage} total={allClubEvents.length} onChange={setClubPage} />
          </>
        )}
      </main>
    </>
  );
};

export default IcpdpHome;
