import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AdminPortalListLayout from '../../components/admin/AdminPortalListLayout';
import AdminStlFilterDropdown from '../../components/admin/AdminStlFilterDropdown';
import ClubTablePagination from '../../components/ui/ClubTablePagination';
import { fetchCtsvApprovedEvents } from '../../services/ctsvApi';
import { formatPortalDate, toStlBadgeTone } from '../../utils/adminStlBadge';
import '../../styles/admin-dashboard.css';

const SOURCE_OPTIONS = [
  { id: 'all', label: 'Tất cả nguồn' },
  { id: 'school', label: 'CTSV' },
  { id: 'partner', label: 'Partner' },
];

const CTSV_MANAGED_SOURCES = new Set(['school', 'partner']);

const isCtsvManagedEvent = (ev) =>
  CTSV_MANAGED_SOURCES.has(ev?.source) &&
  (ev?.source !== 'school' || ev?.schoolOrganizerRole !== 'icpdp');

const TIME_OPTIONS = [
  { id: 'all', label: 'Tất cả thời gian' },
  { id: 'Hôm nay', label: 'Hôm nay' },
  { id: 'Tuần này', label: 'Tuần này' },
  { id: 'Tháng này', label: 'Tháng này' },
];

const SOURCE_META = {
  school: { label: 'CTSV', tone: 'orange' },
  partner: { label: 'Partner', tone: 'green' },
};

const STATUS_META = {
  approved: { label: 'Mở đăng ký', tone: 'green' },
  live: { label: 'Đang diễn ra', tone: 'green' },
  ended: { label: 'Đã kết thúc', tone: 'slate' },
};

const PAGE_SIZE = 20;

export default function CtsvAllEvents() {
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [source, setSource] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (p = 1, src = source, q = search, time = timeFilter) => {
      setLoading(true);
      try {
        const res = await fetchCtsvApprovedEvents({
          source: src,
          search: q,
          time: time === 'all' ? '' : time,
          page: p,
          limit: PAGE_SIZE,
        });
        setData(res);
        setPage(p);
      } catch (err) {
        showToast?.(err.message || 'Tải dữ liệu thất bại.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [source, search, timeFilter, showToast]
  );

  useEffect(() => {
    const timer = setTimeout(() => load(1, source, search, timeFilter), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [source, search, timeFilter, load]);

  const events = useMemo(
    () => (data?.events || []).filter(isCtsvManagedEvent),
    [data?.events]
  );
  const total = data?.total ?? 0;

  const liveCount = useMemo(
    () => events.filter((ev) => ev.statusKey === 'live').length,
    [events]
  );

  const statHint = useMemo(() => {
    if (loading) return null;
    if (liveCount > 0) return `${liveCount} đang diễn ra trên trang này`;
    return null;
  }, [loading, liveCount]);

  return (
    <AdminPortalListLayout
      eyebrow="CTSV · Quản lý sự kiện"
      title="Quản lý sự kiện"
      description="Chỉ sự kiện do CTSV và đối tác Partner đã duyệt — lọc theo nguồn, thời gian và tìm kiếm nhanh."
      statNum={loading ? '—' : total}
      statLabel={source === 'all' && timeFilter === 'all' ? 'Sự kiện' : 'Sự kiện (bộ lọc)'}
      statHint={statHint}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Tìm tên sự kiện, địa điểm…"
      filterSlot={(
        <>
          <AdminStlFilterDropdown
            label="Nguồn"
            value={source}
            options={SOURCE_OPTIONS}
            onChange={setSource}
            ariaLabel="Lọc theo nguồn sự kiện"
          />
          <AdminStlFilterDropdown
            label="Thời gian"
            value={timeFilter}
            options={TIME_OPTIONS}
            onChange={setTimeFilter}
            ariaLabel="Lọc theo thời gian"
          />
        </>
      )}
      summaryText={loading ? null : (
        <>
          <strong>{total}</strong> sự kiện
          {search.trim() ? ` · từ khóa «${search.trim()}»` : ''}
        </>
      )}
      loading={loading}
      footer={
        !loading && total > PAGE_SIZE ? (
          <ClubTablePagination
            page={page}
            totalItems={total}
            pageSize={PAGE_SIZE}
            onChange={(p) => load(p, source, search, timeFilter)}
          />
        ) : null
      }
    >
      <section className="stl-card">
        <div className="stl-table-wrap">
          <table className="stl-table">
            <thead>
              <tr>
                <th>Sự kiện</th>
                <th className="col-center">Nguồn</th>
                <th>Người gửi</th>
                <th className="col-center">Thời gian</th>
                <th className="col-center">Trạng thái</th>
                <th className="col-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="stl-row--skeleton">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j}><div className="stl-sk stl-sk--sm" /></td>
                    ))}
                  </tr>
                ))}
              {!loading && events.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="stl-empty">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" aria-hidden>
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      <p>Không có sự kiện nào.</p>
                      <p className="stl-empty-hint">Thử đổi nguồn, thời gian hoặc từ khóa tìm kiếm.</p>
                    </div>
                  </td>
                </tr>
              )}
              {!loading &&
                events.map((ev) => {
                  const srcMeta = SOURCE_META[ev.source] || { label: ev.source || '—', tone: 'amber' };
                  const stsMeta = STATUS_META[ev.statusKey] || { label: ev.status || '—', tone: 'amber' };
                  const sender = ev.createdByEmail || ev.ctsvSubmittedByEmail || '—';
                  const detailHref = `/ctsv/events/${ev.id}`;

                  return (
                    <tr key={ev.id} className="stl-row">
                      <td>
                        <button
                          type="button"
                          className="stl-club-name stl-timeline-semester-btn"
                          onClick={() => navigate(detailHref)}
                        >
                          {ev.title || '—'}
                        </button>
                        <p className="stl-timeline-summary">
                          {[ev.category, ev.location].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </td>
                      <td className="col-center">
                        <span className={`stl-badge stl-badge--${toStlBadgeTone(srcMeta.tone)}`}>
                          {srcMeta.label}
                        </span>
                      </td>
                      <td className="stl-semester">{sender}</td>
                      <td className="col-center stl-date">{formatPortalDate(ev.startDate || ev.createdAt)}</td>
                      <td className="col-center">
                        <span className={`stl-badge stl-badge--${toStlBadgeTone(stsMeta.tone)}`}>
                          {stsMeta.label}
                        </span>
                      </td>
                      <td className="col-center">
                        <div className="stl-timeline-actions">
                          <button
                            type="button"
                            className="stl-action-btn"
                            onClick={() => navigate(detailHref)}
                          >
                            Quản lý
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </AdminPortalListLayout>
  );
}
