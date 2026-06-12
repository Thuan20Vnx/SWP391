import { tStatic } from '../i18n/translate';

const ROLE_KEYS = {
  admin: 'role.admin',
  student: 'role.student',
  staff: 'role.staff',
  ctsv: 'role.ctsv',
  icpdp: 'role.icpdp',
  club_manager: 'role.clubManager',
  club: 'role.club',
  partner: 'role.partner',
};

export const getRoleLabel = (role, course) => {
  const r = role?.toLowerCase();
  if (r === 'admin') return tStatic('role.admin');
  if (r === 'student') {
    return course ? tStatic('role.studentWithCourse', { course }) : tStatic('role.student');
  }
  const key = ROLE_KEYS[r];
  return key ? tStatic(key) : tStatic('role.guest');
};

export const isAdminRoleLabel = (role) => role?.toLowerCase() === 'admin';
