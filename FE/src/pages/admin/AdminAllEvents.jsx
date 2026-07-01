import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPortalListLayout from '../../components/admin/AdminPortalListLayout';
import AdminStlFilterDropdown from '../../components/admin/AdminStlFilterDropdown';
import ClubTablePagination from '../../components/ui/ClubTablePagination';
import { fetchAdminApprovedEvents } from '../../services/adminApi';
import { formatPortalDate, toStlBadgeTone } from '../../utils/adminStlBadge';
import '../../styles/admin-dashboard.css';

const SOURCE_OPTIONS = [
  { id: 'all', label: 'Tất cả nguồn' },
  { id: 'club', label: 'CLB' },
  { id: 'school', label: 'CTSV' },
  { id: 'icpdp', label: 'IC-PDP' },
  { id: 'partner', label: 'Đối tác' },
];

const SOURCE_META = {
  club: { label: 'CLB', tone: 'blue' },
  school: { label: 'CTSV', tone: 'orange' },
  icpdp: { label: 'IC-PDP', tone: 'amber' },
  partner: { label: 'Đối tác', tone: 'green' },
};

const STATUS_META = {
  approved: { label: 'Mở đăng ký', tone: 'green' },
  live: { label: 'Đang diễn ra', tone: 'green' },
  ended: { label: 'Đã kết thúc', tone: 'amber' },
  expired: { label: 'Hết hạn', tone: 'amber' },
};

const PAGE_SIZE = 20;

export default function AdminAllEvents({ showToast }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [source, setSource] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (p = 1, src = source, q = search) => {
      setLoading(true);
      try {
        const res = await fetchAdminApprovedEvents({ source: src, search: q, page: p, limit: PAGE_SIZE });
        setData(res);
        setPage(p);
      } catch (err) {
        showToast?.(err.message || 'Tải dữ liệu thất bại.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [source, search, showToast]
  );

  useEffect(() => {
    const timer = setTimeout(() => load(1, source, search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [source, search, load]);

  const events = data?.events || [];
  const total = data?.total ?? 0;

  const liveCount = useMemo(
    () => events.filter((ev) => ev.statusKey === 'live').length,
    [events]
  );

  return (
    <main className="admin-main">
      <AdminPortalListLayout
        eyebrow="Admin · Quản lý sự kiện"
        title="Tất cả sự kiện đã duyệt"
        description="Danh sách sự kiện đã được phê duyệt trong hệ thống — lọc theo nguồn và tìm kiếm nhanh."
        statNum={loading ? '—' : total}
        statLabel={source === 'all' ? 'Sự kiện' : 'Sự kiện (bộ lọc)'}
        statHint={!loading && liveCount > 0 ? `${liveCount} đang diễn ra trên trang này` : null}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm tên sự kiện, địa điểm…"
        filterSlot={(
          <AdminStlFilterDropdown
            label="Nguồn"
            value={source}
            options={SOURCE_OPTIONS}
            onChange={setSource}
            ariaLabel="Lọc theo nguồn sự kiện"
          />
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
              onChange={(p) => load(p, source, search)}
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
                  <th>Địa điểm</th>
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
                        <p className="stl-empty-hint">Thử đổi nguồn hoặc từ khóa tìm kiếm.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  events.map((ev) => {
                    const srcMeta = SOURCE_META[ev.source] || { label: ev.source || '—', tone: 'amber' };
                    const stsMeta = STATUS_META[ev.statusKey] || { label: ev.status || '—', tone: 'amber' };
                    return (
                      <tr key={ev.id} className="stl-row">
                        <td>
                          <button
                            type="button"
                            className="stl-club-name stl-timeline-semester-btn"
                            onClick={() => navigate(`/events/${ev.id}`)}
                          >
                            {ev.title || '—'}
                          </button>
                          {ev.category ? (
                            <p className="stl-timeline-summary">{ev.category}</p>
                          ) : null}
                        </td>
                        <td className="col-center">
                          <span className={`stl-badge stl-badge--${toStlBadgeTone(srcMeta.tone)}`}>
                            {srcMeta.label}
                          </span>
                        </td>
                        <td className="stl-semester">{ev.location || '—'}</td>
                        <td className="col-center stl-date">{formatPortalDate(ev.startDate)}</td>
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
                              onClick={() => navigate(`/events/${ev.id}`)}
                            >
                              Xem chi tiết
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
    </main>
  );
}
