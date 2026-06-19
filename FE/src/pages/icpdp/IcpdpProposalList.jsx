import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';

import { fetchIcpdpProposals } from '../../services/icpdpApi';
import EventDiscoveryCard from '../../components/EventDiscoveryCard';
import AppSelect from '../../components/ui/AppSelect';
import { getCategoryDisplayLabel } from '../../constants/eventCategories';

const STATUS_FILTERS = [
  { id: '', label: 'Tất cả trạng thái' },
  { id: 'pending_icpdp', label: 'Chờ IC-PDP duyệt' },
  { id: 'approved', label: 'Đã duyệt' },
  { id: 'revision', label: 'Cần chỉnh sửa' },
  { id: 'rejected', label: 'Từ chối' }
];

const FALLBACK_THUMBNAILS = [
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
];

const toProposalCard = (p, idx) => {
  const isPendingIcpdp = p.statusKey === 'pending_icpdp';
  const cap = p.totalTickets || 0;
  const registered = p.registeredCount || 0;
  const price = Number(p.ticketPrice) || 0;
  return {
    id: null,
    title: p.title,
    thumbnail: p.image || p.flyer || FALLBACK_THUMBNAILS[idx % FALLBACK_THUMBNAILS.length],
    category: p.category || 'Sự kiện',
    categoryLabel: getCategoryDisplayLabel(p.category) || p.category || 'Sự kiện',
    dateLabel: p.date ? `${p.date}${p.time ? ' ' + p.time : ''}` : '',
    location: p.location || '',
    filledSlots: registered,
    totalSlots: cap,
    cardState: 'active',
    primaryLabel: isPendingIcpdp ? 'Duyệt ngay' : 'Xem chi tiết',
    priceLabel: price > 0 ? `${price.toLocaleString('vi-VN')}đ` : 'MIỄN PHÍ',
    organizerLabel: 'CLB',
  };
};

const IcpdpProposalList = () => {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { showToast, headerSearch = '', registerHeaderSearchSubmit } = outlet;
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Merge header search + local search (header search takes precedence when non-empty)
  const searchQuery = headerSearch.trim() || localSearch.trim();

  const loadProposals = useCallback(
    (overrideStatus) => {
      const status = overrideStatus ?? statusFilter;
      setLoading(true);
      const params = {};
      if (status) params.status = status;
      fetchIcpdpProposals(params)
        .then((d) => setProposals(d.proposals || []))
        .catch(() => showToast?.('Không tải được danh sách đề xuất.', 'error'))
        .finally(() => setLoading(false));
    },
    [statusFilter, showToast]
  );

  useEffect(() => {
    loadProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register header search submit — just triggers local filter (data is already loaded)
  useEffect(() => {
    registerHeaderSearchSubmit?.(() => {
      // filtering is reactive via searchQuery memo, nothing extra needed
    });
    return () => registerHeaderSearchSubmit?.(null);
  }, [registerHeaderSearchSubmit]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return proposals;
    return proposals.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.clubName || '').toLowerCase().includes(q)
    );
  }, [proposals, searchQuery]);

  const handleStatusChange = (id) => {
    setStatusFilter(id);
    loadProposals(id);
  };

  const pendingCount = useMemo(
    () => proposals.filter((p) => p.statusKey === 'pending_icpdp').length,
    [proposals]
  );

  return (
    <div className="ctsv-events-page">
      <header className="ctsv-events-hero">
        <div className="ctsv-events-hero-text">
          <span className="ctsv-events-eyebrow">Quản lý đề xuất IC-PDP</span>
          <h1>Duyệt đề xuất sự kiện CLB</h1>
          <p>
            Xét duyệt nội bộ các đề xuất từ Ban chủ nhiệm CLB. Sau khi IC-PDP duyệt, đề xuất chuyển sang CTSV phê duyệt cuối.
          </p>
        </div>
        <div className="ctsv-events-hero-aside">
          <div className="ctsv-events-hero-stat" aria-live="polite">
            <span className="ctsv-events-hero-stat-num">{loading ? '—' : filtered.length}</span>
            <span className="ctsv-events-hero-stat-label">Đề xuất</span>
          </div>
          {!loading && pendingCount > 0 && (
            <p style={{ fontSize: '0.82rem', color: '#f59e0b', fontWeight: 600, marginTop: 4 }}>
              {pendingCount} chờ IC-PDP duyệt
            </p>
          )}
        </div>
      </header>

      <section className="icpdp-proposals-toolbar">
        <div className="icpdp-proposals-search">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
          <input
            type="search"
            placeholder="Tìm theo tên đề xuất, CLB…"
            value={headerSearch || localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            aria-label="Tìm đề xuất"
          />
        </div>
        <div className="icpdp-proposals-select-wrap">
          <span className="icpdp-proposals-select-label">Trạng thái</span>
          <AppSelect
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={STATUS_FILTERS.map((f) => ({ value: f.id, label: f.label }))}
            variant="filter"
            fullWidth={false}
          />
        </div>
      </section>

      {loading ? (
        <div className="event-grid-cards" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="event-discovery-card event-discovery-card--active" style={{ minHeight: 320 }}>
              <div className="event-discovery-card__media" style={{ background: '#f1f5f9' }} />
              <div className="event-discovery-card__body" style={{ padding: 16 }}>
                <div className="sk sk-line sk-line--lg" />
                <div className="sk sk-line" />
                <div className="sk sk-line sk-line--short" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="ctsv-events-empty">
          <span className="ctsv-events-empty-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </span>
          <h2>Không có đề xuất nào</h2>
          <p>Thử đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm.</p>
          <button type="button" className="ctsv-events-filter-btn" onClick={() => { setStatusFilter(''); loadProposals(''); }}>
            Xem tất cả
          </button>
        </div>
      ) : (
        <div className="event-grid-cards">
          {filtered.map((p, idx) => (
            <EventDiscoveryCard
              key={p.id}
              event={toProposalCard(p, idx)}
              viewOnly
              onPrimaryAction={() => navigate(`/icpdp/proposals/${p.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default IcpdpProposalList;
