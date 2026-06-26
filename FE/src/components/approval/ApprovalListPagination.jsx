import React, { useMemo } from 'react';

const ApprovalListPagination = ({ page, totalItems, pageSize = 6, onChange, className = '' }) => {
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
    <footer className={`adm-ev-pagination adm-ev-pagination--numbered${className ? ` ${className}` : ''}`}>
      <p className="adm-ev-pagination__info">
        Hiển thị {pageStart}–{pageEnd} / {totalItems} mục
      </p>
      <nav className="adm-ev-pagination__nav" aria-label="Phân trang">
        <button
          type="button"
          className="adm-ev-page-btn"
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
            className={`adm-ev-page-btn${page === n ? ' adm-ev-page-btn--active' : ''}`}
            onClick={() => onChange(n)}
            aria-current={page === n ? 'page' : undefined}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          className="adm-ev-page-btn"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Trang sau"
        >
          ›
        </button>
      </nav>
    </footer>
  );
};

export default ApprovalListPagination;
