import { useMemo } from 'react';

const ClubTablePagination = ({
  page,
  totalItems,
  pageSize = 10,
  onChange,
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    const start = Math.max(1, Math.min(page - 2, totalPages - maxButtons + 1));
    const end = Math.min(totalPages, start + maxButtons - 1);
    const nums = [];
    for (let i = start; i <= end; i += 1) nums.push(i);
    return nums;
  }, [page, totalPages]);

  const pageStart = (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, totalItems);

  return (
    <div className={`clb-pagination${className ? ` ${className}` : ''}`}>
      <span className="clb-pagination-info">
        {pageStart}–{pageEnd} trong tổng số {totalItems}
      </span>
      <nav className="clb-pagination-btns" aria-label="Phân trang">
        <button
          type="button"
          className="clb-page-btn"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Trang trước"
        >
          ‹
        </button>
        {pageNumbers.map((n) => (
          <button
            key={n}
            type="button"
            className={`clb-page-btn${page === n ? ' clb-page-btn--active' : ''}`}
            onClick={() => onChange(n)}
            aria-current={page === n ? 'page' : undefined}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          className="clb-page-btn"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Trang sau"
        >
          ›
        </button>
      </nav>
    </div>
  );
};

export default ClubTablePagination;
