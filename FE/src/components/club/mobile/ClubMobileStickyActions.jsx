import React from 'react';

const ClubMobileStickyActions = ({ children, className = '' }) => (
  <div className={`club-m-sticky-actions ${className}`.trim()} role="group">
    {children}
  </div>
);

export default ClubMobileStickyActions;
