import React from 'react';

const IconChevron = ({ open }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.25"
    aria-hidden
    className={`admin-fpt-collapsible__chevron${open ? ' is-open' : ''}`}
  >
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AdminFptCollapsible = ({
  title,
  subtitle,
  open,
  onToggle,
  children,
  tone = 'default',
  panelId,
}) => (
  <section className={`admin-fpt-collapsible admin-fpt-collapsible--${tone}`}>
    <button
      type="button"
      className="admin-fpt-collapsible__trigger"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={onToggle}
    >
      <span className="admin-fpt-collapsible__trigger-text">
        <strong>{title}</strong>
        {subtitle && <span>{subtitle}</span>}
      </span>
      <IconChevron open={open} />
    </button>
    {open && (
      <div id={panelId} className="admin-fpt-collapsible__panel">
        {children}
      </div>
    )}
  </section>
);

export default AdminFptCollapsible;
