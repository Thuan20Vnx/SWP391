export const USER_ROLES = {
  STUDENT: 'student',
  CTSV: 'ctsv',
  PARTNER: 'partner',
  ADMIN: 'admin',
  GUEST: 'guest',
  ICPDP: 'icpdp',
  CLUB_MANAGER: 'club_manager'
};

/** Chuẩn hóa role từ DB (vd. "CTSV" → "ctsv") */
export const normalizeRole = (role) => {
  if (!role) return USER_ROLES.STUDENT;
  return String(role).trim().toLowerCase();
};

export const persistSession = (user, token, loginMethod = 'local') => {
  const role = normalizeRole(user?.role);
  localStorage.setItem('isLoggedIn', 'true');
  localStorage.setItem('userEmail', user?.email || '');
  localStorage.setItem('loginMethod', loginMethod);
  localStorage.setItem('userRole', role);
  if (user?.fullname) localStorage.setItem('userFullname', user.fullname);
  if (token) localStorage.setItem('authToken', token);
};

export const clearSession = () => {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('loginMethod');
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userFullname');
};

export const getUserRole = () => normalizeRole(localStorage.getItem('userRole'));

export const isCtsvRole = (role = getUserRole()) => {
  const r = normalizeRole(role);
  return r === USER_ROLES.CTSV || r === USER_ROLES.ICPDP;
};

/** Chỉ CTSV được phê duyệt cuối; ICPDP duyệt bước nội bộ */
export const isIcpdpRole = (role = getUserRole()) => normalizeRole(role) === USER_ROLES.ICPDP;

export const canCtsvFinalApprove = (role = getUserRole()) =>
  normalizeRole(role) === USER_ROLES.CTSV;

export const getHomePathForRole = (role = getUserRole()) =>
  isCtsvRole(role) ? '/ctsv' : '/';

/** Nhãn hiển thị trên header / profile */
export const getRoleDisplayLabel = (role, course = 'K18') => {
  const r = normalizeRole(role);
  switch (r) {
    case USER_ROLES.CTSV:
      return 'CTSV';
    case USER_ROLES.ICPDP:
      return 'ICPDP';
    case USER_ROLES.CLUB_MANAGER:
      return 'Quản lý CLB';
    case USER_ROLES.PARTNER:
      return 'Đối tác';
    case USER_ROLES.ADMIN:
      return 'Quản trị viên';
    case USER_ROLES.GUEST:
      return 'Khách';
    default:
      return `Sinh viên ${course}`;
  }
};
