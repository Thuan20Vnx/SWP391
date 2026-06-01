export const getRoleLabel = (role, course) => {
  const r = role?.toLowerCase();
  if (r === 'admin') {
    return course ? `IT Admin - ${course}` : 'IT Admin';
  }
  if (r === 'student') return 'Sinh viên FPT';
  if (r === 'staff') return 'Cán bộ FPT';
  if (r === 'ctsv') return 'Phòng CTSV';
  if (r === 'icpdp') return 'Phòng ICPDP';
  if (r === 'club_manager') return 'Quản lý CLB';
  if (r === 'club') return 'Câu lạc bộ';
  return 'Khách';
};

export const isAdminRoleLabel = (role) => role?.toLowerCase() === 'admin';
