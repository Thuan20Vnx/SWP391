import React from 'react';

const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3-3" />
  </svg>
);

/**
 * Shell danh sách Admin — đồng bộ layout Timeline kỳ học IC-PDP (hero + filter + bảng).
 */
const AdminPortalListLayout = ({
  eyebrow,
  title,
  description,
  statNum,
  statLabel = 'Mục',
  statHint,
  heroAside,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm…',
  filterSlot,
  summaryText,
  loading = false,
  children,
  footer,
}) => (
  <div className="ctsv-events-page">
    <header className="ctsv-events-hero">
      <div className="ctsv-events-hero-text">
        {eyebrow ? <span className="ctsv-events-eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="ctsv-events-hero-aside">
        <div className="ctsv-events-hero-stat" aria-live="polite">
          <span className="ctsv-events-hero-stat-num">{loading ? '—' : statNum}</span>
          <span className="ctsv-events-hero-stat-label">{statLabel}</span>
        </div>
        {!loading && statHint ? <p className="stl-pending-hint">{statHint}</p> : null}
        {heroAside}
      </div>
    </header>

    <section className="ctsv-events-filter-card">
      <div className="ctsv-events-filter-form" style={{ flexWrap: 'wrap', gap: 12 }}>
        {onSearchChange ? (
          <label className="ctsv-events-search" style={{ flex: '1 1 220px', maxWidth: 340 }}>
            <span className="ctsv-events-search-icon">
              <IconSearch />
            </span>
            <input
              type="search"
              className="ctsv-events-search-input"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </label>
        ) : null}
        {filterSlot}
      </div>
      {!loading && summaryText ? (
        <p className="ctsv-events-filter-summary">{summaryText}</p>
      ) : null}
    </section>

    {children}
    {footer}
  </div>
);

export default AdminPortalListLayout;
