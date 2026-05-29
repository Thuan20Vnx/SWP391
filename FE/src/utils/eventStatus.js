export const isPendingApproval = (ev) => {
  const key = ev.statusKey || '';
  const label = (ev.status || '').toUpperCase();
  return (
    key === 'pending_ctsv' ||
    key === 'pending_icpdp' ||
    label.includes('CHỜ') ||
    label.includes('PENDING')
  );
};

export const statusClass = (status, statusKey) => {
  const key = statusKey || '';
  const label = (status || '').toUpperCase();
  if (key === 'rejected' || label.includes('TỪ CHỐI')) return 'status-danger';
  if (key === 'pending_ctsv' || key === 'pending_icpdp' || label.includes('CHỜ') || label.includes('PENDING')) {
    return 'status-warning';
  }
  if (key === 'live' || label.includes('ĐANG')) return 'status-success';
  return 'status-success';
};
