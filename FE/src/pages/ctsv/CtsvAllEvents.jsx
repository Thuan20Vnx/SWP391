import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { fetchCtsvApprovedEvents } from '../../services/ctsvApi';
import ProposalTicketsTable from '../../components/admin/ProposalTicketsTable';
import '../../styles/admin-dashboard.css';

const SOURCE_TABS = [
  { value: 'all',     label: 'Tất cả' },
  { value: 'school',  label: 'Cấp trường' },
  { value: 'partner', label: 'Đối tác' },
];

const TIME_FILTER_OPTS = [
  { id: 'all', label: 'Tất cả thời gian' },
  { id: 'Hôm nay', label: 'Hôm nay' },
  { id: 'Tuần này', label: 'Tuần này' },
  { id: 'Tháng này', label: 'Tháng này' },
];

const SOURCE_META = {
  club:    { label: 'CLB',      tone: 'indigo' },
  school:  { label: 'CTSV',     tone: 'orange' },
  icpdp:   { label: 'IC-PDP',   tone: 'purple' },
  partner: { label: 'Đối tác',  tone: 'teal'   },
};

const STATUS_META = {
  approved: { label: 'Mở đăng ký',   tone: 'green' },
  live:     { label: 'Đang diễn ra', tone: 'green' },
  ended:    { label: 'Đã kết thúc',  tone: 'slate' },
  expired:  { label: 'Hết hạn',      tone: 'slate' },
};

const Badge = ({ meta }) => (
  <span className={`adm-ev-badge adm-ev-badge--${meta?.tone || 'slate'}`}>{meta?.label || '—'}</span>
);

const formatDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleString('vi-VN');
};

export default function CtsvAllEvents() {
  const navigate = useNavigate();
  const { showToast } = useOutletContext() || {};
  const [data, setData]         = useState(null);
  const [source, setSource]     = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [timeOpen, setTimeOpen] = useState(false);
  const [search, setSearch]     = useState('');
  const [inputVal, setInputVal] = useState('');
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const timeRef = useRef(null);

  const timeLabel = TIME_FILTER_OPTS.find((o) => o.id === timeFilter)?.label || 'Thời gian';

  const load = useCallback(async (p = 1, src = source, q = search, time = timeFilter) => {
    setLoading(true);
    try {
      const res = await fetchCtsvApprovedEvents({
        source: src,
        search: q,
        time: time === 'all' ? '' : time,
        page: p,
        limit: 20,
      });
      setData(res);
      setPage(p);
    } catch (err) {
      showToast?.(err.message || 'Tải dữ liệu thất bại.', 'error');
    } finally {
      setLoading(false);
    }
  }, [source, search, timeFilter, showToast]);

  useEffect(() => {
    load(1, source, search, timeFilter);
  }, [source, timeFilter]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (timeRef.current && !timeRef.current.contains(e.target)) setTimeOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleSearch = () => {
    setSearch(inputVal);
    load(1, source, inputVal, timeFilter);
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <main className="admin-main admin-events-page">
      <header className="admin-events-page__header">
        <div className="admin-events-page__title-row">
          <div>
            <h1 className="admin-main__title">Quản lý sự kiện</h1>
            <p className="admin-events-page__subtitle">
              Tất cả sự kiện đã được duyệt trong hệ thống.
            </p>
          </div>
          {!loading && data && (
            <span className="admin-events-page__count" aria-live="polite">
              {data.total} sự kiện
            </span>
          )}
        </div>
      </header>

      <div className="adm-ev-toolbar">
        <div className="adm-ev-pills" role="group" aria-label="Lọc theo nguồn">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`adm-ev-pill${source === tab.value ? ' adm-ev-pill--active' : ''}`}
              onClick={() => setSource(tab.value)}
            >
              {tab.label}
            </button>
          ))}

          <div className="adm-ev-dropdown" ref={timeRef}>
            <button
              type="button"
              className={`adm-ev-pill adm-ev-pill--caret${timeFilter !== 'all' ? ' adm-ev-pill--active' : ''}`}
              onClick={() => setTimeOpen((o) => !o)}
              aria-expanded={timeOpen}
            >
              {timeFilter === 'all' ? 'Thời gian' : timeLabel}
              <svg className="adm-ev-caret" viewBox="0 0 10 6" width="10" height="6" fill="currentColor" aria-hidden>
                <path d="M0 0l5 6 5-6z" />
              </svg>
            </button>
            {timeOpen && (
              <div className="adm-ev-menu">
                {TIME_FILTER_OPTS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`adm-ev-menu-item${timeFilter === opt.id ? ' adm-ev-menu-item--active' : ''}`}
                    onClick={() => {
                      setTimeFilter(opt.id);
                      setTimeOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="adm-ev-toolbar__search">
          <input
            type="text"
            placeholder="Tìm tên sự kiện, địa điểm..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="admin-search-input adm-ev-toolbar__input"
          />
          <button
            type="button"
            className="ctsv-btn-primary"
            onClick={handleSearch}
          >
            Tìm
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-events-page__loading">
          <span className="btn-spinner admin-events-page__spinner" aria-hidden="true" />
          <p>Đang tải dữ liệu…</p>
        </div>
      ) : !data?.events?.length ? (
        <div className="admin-events-empty">
          <p className="admin-events-empty__title">Không có sự kiện nào</p>
          <p className="admin-events-empty__hint">Thử đổi bộ lọc nguồn, thời gian hoặc từ khoá tìm kiếm.</p>
        </div>
      ) : (
        <ul className="admin-proposal-list">
          {data.events.map((ev, index) => {
            const srcMeta = SOURCE_META[ev.source] || { label: ev.source, tone: 'slate' };
            const stsMeta = STATUS_META[ev.statusKey] || { label: ev.status, tone: 'slate' };
            const offset  = (page - 1) * 20;

            return (
              <li key={ev.id} className="admin-proposal-card">
                <div className="admin-proposal-card__head">
                  <div className="admin-proposal-card__head-main">
                    <span className="admin-proposal-card__index">#{offset + index + 1}</span>
                    <h2 className="admin-proposal-card__title">{ev.title}</h2>
                    <Badge meta={srcMeta} />
                  </div>
                  <Badge meta={stsMeta} />
                </div>

                <div className="admin-proposal-card__body">
                  <div className="admin-proposal-card__thumb-wrap">
                    <img
                      src={ev.thumbnail || ''}
                      alt=""
                      className="admin-proposal-card__thumb"
                      onError={(e) => {
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23f1ede9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23b0a090'%3EKhông có ảnh%3C/text%3E%3C/svg%3E";
                        e.target.onerror = null;
                      }}
                    />
                  </div>

                  <div className="admin-proposal-card__details">
                    <dl className="admin-proposal-meta">
                      <div className="admin-proposal-meta__row">
                        <dt>Người gửi</dt>
                        <dd>{ev.createdByEmail || ev.ctsvSubmittedByEmail || '—'}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Danh mục</dt>
                        <dd>{ev.category || '—'}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Địa điểm</dt>
                        <dd>{ev.location || '—'}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Thời gian</dt>
                        <dd>{formatDateTime(ev.startDate)}</dd>
                      </div>
                      <div className="admin-proposal-meta__row">
                        <dt>Tổng vé</dt>
                        <dd>{ev.capacity != null ? ev.capacity : '—'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="admin-proposal-card__full">
                  <ProposalTicketsTable
                    ticketTypes={ev.ticketTypes}
                    ticketPrice={ev.ticketPrice}
                  />

                  {ev.description?.trim() ? (
                    <div className="admin-proposal-card__desc">
                      <p className="admin-proposal-card__desc-label">Mô tả</p>
                      <p className="admin-proposal-card__desc-text">{ev.description}</p>
                    </div>
                  ) : null}
                </div>

                <footer className="admin-proposal-card__footer">
                  <div className="adm-ev-detail-bar">
                    <button
                      type="button"
                      className="adm-ev-detail-btn maintenance-readonly-allow"
                      onClick={() => navigate(`/ctsv/events/${ev.id}`)}
                    >
                      Xem chi tiết
                    </button>
                  </div>
                </footer>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="adm-ev-pagination">
          <button
            type="button"
            className="ctsv-btn-secondary maintenance-readonly-allow"
            disabled={page <= 1}
            onClick={() => load(page - 1)}
          >← Trước</button>
          <span className="adm-ev-pagination__label">{page} / {totalPages}</span>
          <button
            type="button"
            className="ctsv-btn-secondary maintenance-readonly-allow"
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
          >Sau →</button>
        </div>
      )}
    </main>
  );
}
