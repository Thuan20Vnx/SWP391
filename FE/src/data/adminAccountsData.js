/** Mock — Figma Kiểm soát tài khoản hệ thống */

export const ADMIN_CREATE_ROLE_OPTIONS = [
  { value: 'ctsv', labelKey: 'admin.accounts.role.ctsv' },
  { value: 'icpdp', labelKey: 'admin.accounts.role.icpdp' },
  { value: 'partner', labelKey: 'admin.accounts.role.partner' },
  { value: 'club_organizer', labelKey: 'admin.accounts.role.club_organizer' },
  { value: 'student', labelKey: 'admin.accounts.role.student' },
  { value: 'attendee', labelKey: 'admin.accounts.role.attendee' },
];

/** Thẻ chọn vai trò — form thêm/sửa tài khoản */
export const ADMIN_ROLE_PICKER_OPTIONS = [
  {
    value: 'ctsv',
    labelKey: 'admin.accounts.role.ctsv',
    descKey: 'admin.accounts.roleDesc.ctsv',
    tone: 'ctsv',
  },
  {
    value: 'icpdp',
    labelKey: 'admin.accounts.role.icpdp',
    descKey: 'admin.accounts.roleDesc.icpdp',
    tone: 'icpdp',
  },
  {
    value: 'partner',
    labelKey: 'admin.accounts.role.partner',
    descKey: 'admin.accounts.roleDesc.partner',
    tone: 'partner',
  },
  {
    value: 'club_organizer',
    labelKey: 'admin.accounts.role.club_organizer',
    descKey: 'admin.accounts.roleDesc.club_organizer',
    tone: 'club',
  },
  {
    value: 'student',
    labelKey: 'admin.accounts.role.student',
    descKey: 'admin.accounts.roleDesc.student',
    tone: 'student',
  },
  {
    value: 'attendee',
    labelKey: 'admin.accounts.role.attendee',
    descKey: 'admin.accounts.roleDesc.attendee',
    tone: 'attendee',
  },
];

export const ADMIN_ACCOUNT_ROLE_FILTERS = [
  { key: 'all', labelKey: 'admin.accounts.filter.all' },
  { key: 'ctsv', labelKey: 'admin.accounts.role.ctsv' },
  { key: 'icpdp', labelKey: 'admin.accounts.role.icpdp' },
  { key: 'partner', labelKey: 'admin.accounts.role.partner' },
  { key: 'club_organizer', labelKey: 'admin.accounts.role.club_organizer' },
  { key: 'student', labelKey: 'admin.accounts.role.student' },
  { key: 'attendee', labelKey: 'admin.accounts.role.attendee' },
];

export const ADMIN_ACCOUNT_ROLE_META = {
  ctsv: { labelKey: 'admin.accounts.role.ctsv', badgeClass: 'admin-acc-badge--ctsv' },
  icpdp: { labelKey: 'admin.accounts.role.icpdp', badgeClass: 'admin-acc-badge--icpdp' },
  partner: { labelKey: 'admin.accounts.role.partner', badgeClass: 'admin-acc-badge--partner' },
  club_organizer: {
    labelKey: 'admin.accounts.role.club_organizer',
    badgeClass: 'admin-acc-badge--club',
  },
  student: { labelKey: 'admin.accounts.role.student', badgeClass: 'admin-acc-badge--student' },
  attendee: { labelKey: 'admin.accounts.role.attendee', badgeClass: 'admin-acc-badge--attendee' },
  admin: { labelKey: 'admin.accounts.role.admin', badgeClass: 'admin-acc-badge--admin' },
};

export const ADMIN_ACCOUNTS_MOCK = [
  { id: '1', name: 'Nguyễn Văn A', email: 'anv@fpt.edu.vn', role: 'ctsv', createdAt: '2023-10-12', active: true, mssv: 'SE123456' },
  { id: '2', name: 'Trần Thị B', email: 'ttb@fpt.edu.vn', role: 'student', createdAt: '2023-11-05', active: true, mssv: 'SE654321' },
  { id: '3', name: 'Lê Văn C', email: 'lvc@gmail.com', role: 'attendee', createdAt: '2024-01-20', active: false, mssv: '' },
  { id: '4', name: 'Phạm Thị D', email: 'ptd@fpt.edu.vn', role: 'icpdp', createdAt: '2023-09-18', active: true, mssv: '' },
  { id: '5', name: 'Hoàng Văn E', email: 'hve@partner.com', role: 'partner', createdAt: '2024-02-14', active: true, mssv: '' },
  { id: '6', name: 'Võ Thị F', email: 'vtf@fpt.edu.vn', role: 'club_organizer', createdAt: '2023-12-01', active: true, mssv: 'SE112233' },
  { id: '7', name: 'Đặng Văn G', email: 'dvg@fpt.edu.vn', role: 'student', createdAt: '2024-03-08', active: true, mssv: 'SE445566' },
  { id: '8', name: 'Bùi Thị H', email: 'bth@fpt.edu.vn', role: 'ctsv', createdAt: '2023-08-22', active: true, mssv: '' },
  { id: '9', name: 'Ngô Văn I', email: 'nvi@gmail.com', role: 'attendee', createdAt: '2024-04-15', active: false, mssv: '' },
  { id: '10', name: 'Dương Thị K', email: 'dtk@fpt.edu.vn', role: 'student', createdAt: '2024-05-02', active: true, mssv: 'SE778899' },
  { id: '11', name: 'Lý Văn L', email: 'lvl@fpt.edu.vn', role: 'club_organizer', createdAt: '2024-06-10', active: true, mssv: 'SE101010' },
  { id: '12', name: 'Mai Thị M', email: 'mtm@partner.com', role: 'partner', createdAt: '2024-07-01', active: false, mssv: '' },
];

/** Tổng số tài khoản (mock pagination) */
export const ADMIN_ACCOUNTS_TOTAL = 245;

export const ADMIN_ACCOUNTS_PAGE_SIZE = 10;

/** Admin chỉ được xóa khách tham gia hoặc đối tác bên ngoài — không xóa SV / nội bộ FPT */
export const ADMIN_DELETABLE_ACCOUNT_ROLES = ['attendee', 'partner'];

export const canAdminDeleteAccount = (role) => ADMIN_DELETABLE_ACCOUNT_ROLES.includes(role);

export const ADMIN_COURSE_OPTIONS = [
  { value: 'K15', label: 'K15' },
  { value: 'K16', label: 'K16' },
  { value: 'K17', label: 'K17' },
  { value: 'K18', label: 'K18' },
  { value: 'K19', label: 'K19' },
  { value: 'K20', label: 'K20' },
];

export const ADMIN_CAMPUS_OPTIONS = [
  {
    value: 'FPT University Da Nang',
    labelKey: 'admin.accounts.campus.danang',
  },
  {
    value: 'FPT University Hà Nội',
    labelKey: 'admin.accounts.campus.hanoi',
  },
  {
    value: 'FPT University Hồ Chí Minh',
    labelKey: 'admin.accounts.campus.hcm',
  },
  {
    value: 'FPT University Cần Thơ',
    labelKey: 'admin.accounts.campus.cantho',
  },
];

export const getAccountIdentifier = (acc) => acc.mssv || acc.phone || '';

export const resolveEditFormRole = (role) => {
  const key = role || '';
  if (ADMIN_ROLE_PICKER_OPTIONS.some((o) => o.value === key)) return key;
  if (key === 'admin') return 'admin';
  return key;
};

export const accountToEditForm = (acc) => ({
  role: resolveEditFormRole(acc.role),
  fullname: acc.name || '',
  email: acc.email || '',
  mssv: acc.mssv || '',
  phone: acc.phone || '',
  unitInfo: acc.unitInfo || '',
  course: acc.course || 'K18',
  campus: acc.campus || 'FPT University Da Nang',
  isActive: acc.active !== false,
});

export const getAccountInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const formatAccountDate = (iso) => {
  const [y, m, d] = String(iso || '').split('-');
  if (!d) return iso;
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
};
