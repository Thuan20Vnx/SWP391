/** Map vai trò người gửi → tone CSS (đồng bộ BE resolvePublisherRoleLabel) */
export const getPublisherRoleLabel = (roleOrLabel) => {
  const r = String(roleOrLabel || '').toLowerCase();
  if (r === 'ctsv' || r === 'staff' || r === 'ctsv') return 'CTSV';
  if (r === 'icpdp' || r === 'ic-pdp') return 'IC-PDP';
  if (r === 'partner') return 'Partner';
  if (r === 'admin' || r === 'trường') return 'Trường';
  if (r === 'club_manager' || r === 'quản lý clb') return 'Quản lý CLB';
  if (['ctsv', 'ic-pdp', 'partner', 'trường', 'quản lý clb'].includes(String(roleOrLabel || '').toLowerCase())) {
    return roleOrLabel;
  }
  return roleOrLabel || 'Trường';
};

export const getPublisherRoleTone = (roleOrLabel) => {
  const label = getPublisherRoleLabel(roleOrLabel);
  if (label === 'CTSV') return 'ctsv';
  if (label === 'IC-PDP') return 'icpdp';
  if (label === 'Partner') return 'partner';
  if (label === 'Quản lý CLB') return 'club';
  return 'school';
};
