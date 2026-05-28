export const getRoleLabel = (role) => {
  const r = role?.toLowerCase();
  if (r === 'student') return 'Sinh viên FPT';
  if (r === 'staff') return 'Cán bộ FPT';
  if (r === 'ctsv') return 'Phòng CTSV';
  if (r === 'admin') return 'Quản trị viên';
  if (r === 'icpdp') return 'Phòng ICPDP';
  if (r === 'club') return 'Câu lạc bộ';
  return 'Khách';
};
